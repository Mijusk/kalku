-- Resumen semanal por correo para las familias (#56).
-- Reglas: solo familias con correo confirmado y consentimiento de los padres, baja en un clic,
-- activado por defecto. El correo del adulto sigue solo en auth.users: aquí no se copia.

alter table public.families
  add column summary_locale text not null default 'es' check (summary_locale in ('es', 'ca'));
alter table public.families
  add column summary_opt_out_at timestamptz;

-- El adulto elige el idioma del resumen y si lo recibe (desde «Familia»).
create function public.set_summary_preferences(p_locale text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  if p_locale is null or p_locale not in ('es', 'ca') or p_enabled is null then
    raise exception 'invalid-preferences' using errcode = 'P0001';
  end if;
  update public.families f
     set summary_locale = p_locale,
         summary_opt_out_at = case when p_enabled then null else coalesce(f.summary_opt_out_at, now()) end
   where f.owner_id = auth.uid();
  if not found then
    raise exception 'not-in-family' using errcode = 'P0001';
  end if;
end;
$$;

-- Baja en un clic desde el correo: la llama la Edge Function `unsubscribe` (service_role)
-- tras verificar la firma del enlace. Devuelve el idioma de la familia, o null si no existe.
create function public.unsubscribe_summary(p_family uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.families f
     set summary_opt_out_at = coalesce(f.summary_opt_out_at, now())
   where f.id = p_family
  returning f.summary_locale;
$$;

-- Datos para el resumen: por cada familia a la que toca enviar (correo confirmado, al menos un niño
-- con consentimiento y sin baja), sus niños con consentimiento y sus respuestas entre p_from y p_to.
-- Solo la lee el servidor (service_role). Nunca sale nada de niños sin consentimiento.
create function public.weekly_summary_data(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'family_id', f.id,
    'email', u.email,
    'locale', f.summary_locale,
    'children', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'child_id', c.id,
        'nickname', c.nickname,
        'answers', (
          select coalesce(jsonb_agg(jsonb_build_object('skill', a.skill, 'correct', a.correct, 'at', a.created_at) order by a.created_at), '[]'::jsonb)
            from public.answers a
           where a.child_id = c.id and a.created_at >= p_from and a.created_at < p_to
        )
      ) order by c.created_at), '[]'::jsonb)
        from public.family_children fc
        join public.children c on c.id = fc.child_id
        join public.parental_consents pc on pc.child_id = c.id
       where fc.family_id = f.id
    )
  ) order by f.created_at), '[]'::jsonb)
  from public.families f
  join auth.users u on u.id = f.owner_id
  where f.summary_opt_out_at is null
    and u.email is not null
    and u.email_confirmed_at is not null
    and exists (
      select 1 from public.family_children fc
      join public.parental_consents pc on pc.child_id = fc.child_id
      where fc.family_id = f.id
    );
$$;

revoke all on function public.set_summary_preferences(text, boolean) from public, anon, authenticated;
revoke all on function public.unsubscribe_summary(uuid) from public, anon, authenticated;
revoke all on function public.weekly_summary_data(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.set_summary_preferences(text, boolean) to authenticated;
grant execute on function public.unsubscribe_summary(uuid) to service_role;
grant execute on function public.weekly_summary_data(timestamptz, timestamptz) to service_role;

-- Tarea semanal: lunes a las 07:00 UTC llama a la Edge Function `weekly-summary`.
-- La dirección y la clave de la tarea están en Vault (`weekly_summary_url`, `weekly_summary_secret`;
-- las pone Luis, nunca van en el repo). Si faltan, o pg_net/Vault no existen, no hace nada.
create function public.trigger_weekly_summary()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = ''weekly_summary_url''' into fn_url;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = ''weekly_summary_secret''' into fn_secret;
  if fn_url is null or fn_secret is null then
    return;
  end if;
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || fn_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_weekly_summary() from public, anon, authenticated;
-- Solo la ejecuta el rol dueño (pg_cron).

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'weekly-summary';
    perform cron.schedule('weekly-summary', '0 7 * * 1', 'select public.trigger_weekly_summary()');
  else
    raise notice 'pg_cron no está disponible: el resumen semanal no se ha programado';
  end if;
end;
$$;

-- La exportación del niño no cambia: las columnas nuevas son de la familia (del adulto), no del niño.
