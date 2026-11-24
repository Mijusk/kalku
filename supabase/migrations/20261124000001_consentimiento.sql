-- Consentimiento de los padres (#48, LOPDGDD art. 7): un menor de 14 no puede consentir solo.
-- Sin consentimiento, la cuenta del niño guarda lo imprescindible para jugar y se borra a los
-- 30 días sin jugar. Unir al niño a una familia es dar el consentimiento.

-- Última vez que el niño jugó (para borrar las cuentas abandonadas sin consentimiento).
alter table public.children
  add column last_active_at timestamptz not null default now();

-- Jugar (guardar una respuesta o el dominio) cuenta como actividad. Se escribe como mucho una vez por hora.
create function public.touch_child_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.children
     set last_active_at = now()
   where id = new.child_id and last_active_at < now() - interval '1 hour';
  return new;
end;
$$;

create trigger answers_touch_activity after insert on public.answers
  for each row execute function public.touch_child_activity();
create trigger progress_touch_activity after insert or update on public.progress
  for each row execute function public.touch_child_activity();

-- Una fila por niño con consentimiento. Es la única tabla pública con un correo: el del adulto que
-- consintió (prueba del consentimiento). Nadie la lee desde el cliente; solo las funciones del servidor.
create table public.parental_consents (
  child_id uuid primary key references public.children (id) on delete cascade,
  adult_id uuid not null references auth.users (id) on delete cascade,
  adult_email text not null,
  policy_version text not null check (char_length(policy_version) between 1 and 20),
  consented_at timestamptz not null default now()
);

create index parental_consents_adult_id_idx on public.parental_consents (adult_id);

alter table public.parental_consents enable row level security;
alter table public.parental_consents force row level security;
revoke all on public.parental_consents from anon, authenticated;
-- Sin ningún permiso ni política.

-- Une al niño del código a la familia del adulto Y registra el consentimiento, todo en una transacción.
-- Exige: correo confirmado, declarar ser madre/padre/tutor y aceptar la política.
drop function public.join_family_with_code(text);
create function public.join_family_with_code(p_code text, p_policy_version text, p_is_guardian boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  hash text;
  cid uuid;
  fid uuid;
  nick text;
  mail text;
  confirmed timestamptz;
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  select u.email, u.email_confirmed_at into mail, confirmed from auth.users u where u.id = uid;
  if mail is null or confirmed is null then
    raise exception 'email-not-confirmed' using errcode = 'P0001';
  end if;
  if p_is_guardian is distinct from true then
    raise exception 'consent-required' using errcode = 'P0001';
  end if;
  if p_policy_version is null or btrim(p_policy_version) = '' then
    raise exception 'consent-required' using errcode = 'P0001';
  end if;

  hash := encode(sha256(convert_to(normalized, 'utf8')), 'hex');
  select lc.child_id into cid
    from public.link_codes lc
   where lc.code_hash = hash and lc.expires_at > now()
   for update;
  if cid is null then
    raise exception 'invalid-code' using errcode = 'P0001';
  end if;

  insert into public.families (owner_id) values (uid) on conflict (owner_id) do nothing;
  select f.id into fid from public.families f where f.owner_id = uid;

  if exists (select 1 from public.family_children where child_id = cid and family_id <> fid) then
    raise exception 'child-in-family' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.family_children where child_id = cid) then
    insert into public.family_children (child_id, family_id) values (cid, fid);
  end if;
  -- Unir otra vez al mismo niño no duplica ni cambia el consentimiento original.
  insert into public.parental_consents (child_id, adult_id, adult_email, policy_version)
  values (cid, uid, mail, btrim(p_policy_version))
  on conflict (child_id) do nothing;
  delete from public.link_codes where code_hash = hash;

  select c.nickname into nick from public.children c where c.id = cid;
  return jsonb_build_object('child_id', cid, 'nickname', nick);
end;
$$;

-- Soltar al niño de la familia retira también el consentimiento (y con él el correo del adulto):
-- el niño vuelve a ser una cuenta sin consentimiento y caduca a los 30 días sin jugar.
create or replace function public.leave_family(p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  delete from public.family_children fc
   where fc.child_id = p_child
     and fc.family_id in (select f.id from public.families f where f.owner_id = auth.uid());
  if found then
    delete from public.parental_consents where child_id = p_child;
  end if;
end;
$$;

-- Retirar el consentimiento: el adulto de la familia borra al niño y todo lo suyo
-- (children, progress, answers, consentimiento y su cuenta anónima, por `on delete cascade`).
create function public.withdraw_consent(p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.family_children fc
    join public.families f on f.id = fc.family_id
    where fc.child_id = p_child and f.owner_id = auth.uid()
  ) then
    raise exception 'not-in-family' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_child;
end;
$$;

-- Borra las cuentas sin consentimiento con más de 30 días sin jugar. La lanza pg_cron cada día.
create function public.purge_unconsented_children()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with gone as (
    delete from auth.users u
     using public.children c
     where c.id = u.id
       and c.last_active_at < now() - interval '30 days'
       and not exists (select 1 from public.parental_consents pc where pc.child_id = c.id)
    returning u.id
  )
  select count(*) into n from gone;
  return n;
end;
$$;

revoke all on function public.touch_child_activity() from public, anon, authenticated;
revoke all on function public.join_family_with_code(text, text, boolean) from public, anon, authenticated;
revoke all on function public.withdraw_consent(uuid) from public, anon, authenticated;
revoke all on function public.purge_unconsented_children() from public, anon, authenticated;
grant execute on function public.join_family_with_code(text, text, boolean) to authenticated;
grant execute on function public.withdraw_consent(uuid) to authenticated;
-- purge_unconsented_children: solo la ejecuta el rol dueño (pg_cron).

-- Tarea diaria a las 03:00 UTC.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-unconsented-children';
    perform cron.schedule('purge-unconsented-children', '0 3 * * *', 'select public.purge_unconsented_children()');
  else
    raise notice 'pg_cron no está disponible: la tarea de borrado no se ha programado';
  end if;
end;
$$;

-- La exportación del niño incluye su consentimiento (fecha y versión), nunca el correo del adulto.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'children', coalesce((select jsonb_agg(to_jsonb(c)) from public.children c where c.id = uid), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(to_jsonb(p) order by p.skill) from public.progress p where p.child_id = uid), '[]'::jsonb),
    'answers', coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a where a.child_id = uid), '[]'::jsonb),
    'family_children', coalesce((select jsonb_agg(to_jsonb(fc)) from public.family_children fc where fc.child_id = uid), '[]'::jsonb),
    'link_codes', coalesce((select jsonb_agg(jsonb_build_object('created_at', lc.created_at, 'expires_at', lc.expires_at)) from public.link_codes lc where lc.child_id = uid), '[]'::jsonb),
    'parental_consents', coalesce((select jsonb_agg(jsonb_build_object('child_id', pc.child_id, 'policy_version', pc.policy_version, 'consented_at', pc.consented_at)) from public.parental_consents pc where pc.child_id = uid), '[]'::jsonb)
  );
end;
$$;
