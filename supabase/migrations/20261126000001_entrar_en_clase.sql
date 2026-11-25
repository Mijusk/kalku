-- Entrar en la clase con apodo + animal o con el código de la tarjeta (#53).
-- Quien comprueba es el servidor: la función `class_login` solo la ejecuta la Edge Function
-- `class-session` (rol service_role); el navegador nunca ve el hash, la pista ni el animal.
-- Intentos limitados sin bloquear para siempre: tras 3 fallos seguidos de un alumno, 30 s; luego
-- 1 min y 5 min como tope. Un acierto lo pone a cero y un fallo de hace más de una hora no cuenta.

-- Se rellena la primera vez que el alumno entra: ahí nace su cuenta de niño.
alter table public.class_students add column child_id uuid references public.children (id) on delete set null;
alter table public.class_students add column failed_attempts int not null default 0;
alter table public.class_students add column last_failed_at timestamptz;
alter table public.class_students add column locked_until timestamptz;

create unique index class_students_child_id_idx on public.class_students (child_id) where child_id is not null;

-- Fallos de «código no existe» por clase: sin esto, alguien con el QR podría probar los ~5000 códigos.
create table public.class_login_limits (
  class_id uuid primary key references public.classes (id) on delete cascade,
  failed_attempts int not null default 0,
  last_failed_at timestamptz,
  locked_until timestamptz
);
alter table public.class_login_limits enable row level security;
alter table public.class_login_limits force row level security;
revoke all on public.class_login_limits from anon, authenticated;

-- Segundos de espera tras `n` fallos seguidos, empezando a contar en `threshold`: 30, 60, y 300 como tope.
create function public.login_lock_seconds(n int, threshold int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when n < threshold then 0
    when n = threshold then 30
    when n = threshold + 1 then 60
    else 300
  end;
$$;

-- Los apodos de una clase, para que el niño toque el suyo. Solo id y apodo: nunca hash, pista ni animal.
create function public.list_class_nicknames(p_class uuid)
returns table (id uuid, nickname text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.nickname from public.class_students s where s.class_id = p_class order by s.nickname, s.created_at;
$$;

-- Comprueba el animal (o el hash del código) y, si acierta, devuelve el niño del alumno (lo crea la primera vez).
-- Devuelve jsonb: {status: 'ok', child_id, nickname} | {status: 'wrong'|'locked', retry_after} | {status: 'unknown'}.
create function public.class_login(p_class uuid, p_student uuid, p_animal text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ timestamptz := clock_timestamp();
  s public.class_students;
  lim public.class_login_limits;
  failed int;
  secs int;
  cid uuid;
begin
  if p_code_hash is not null then
    insert into public.class_login_limits (class_id)
      select c.id from public.classes c where c.id = p_class
      on conflict do nothing;
    select * into lim from public.class_login_limits where class_id = p_class for update;
    if not found then
      return jsonb_build_object('status', 'unknown');
    end if;
    if lim.locked_until is not null and lim.locked_until > now_ then
      return jsonb_build_object('status', 'locked', 'retry_after', ceil(extract(epoch from lim.locked_until - now_))::int);
    end if;
    select * into s from public.class_students where class_id = p_class and code_hash = p_code_hash for update;
    if not found then
      -- Un código que no existe en la clase. Diez seguidos (sin contar los de hace más de una hora) y se frena.
      failed := case when lim.last_failed_at is null or lim.last_failed_at < now_ - interval '1 hour' then 1 else lim.failed_attempts + 1 end;
      secs := public.login_lock_seconds(failed, 10);
      update public.class_login_limits
         set failed_attempts = failed, last_failed_at = now_,
             locked_until = case when secs > 0 then now_ + make_interval(secs => secs) end
       where class_id = p_class;
      return jsonb_build_object('status', case when secs > 0 then 'locked' else 'wrong' end, 'retry_after', secs);
    end if;
  else
    select * into s from public.class_students where id = p_student and class_id = p_class for update;
    if not found then
      return jsonb_build_object('status', 'unknown');
    end if;
  end if;

  if s.locked_until is not null and s.locked_until > now_ then
    return jsonb_build_object('status', 'locked', 'retry_after', ceil(extract(epoch from s.locked_until - now_))::int);
  end if;

  if p_code_hash is null and p_animal is distinct from s.animal then
    failed := case when s.last_failed_at is null or s.last_failed_at < now_ - interval '1 hour' then 1 else s.failed_attempts + 1 end;
    secs := public.login_lock_seconds(failed, 3);
    update public.class_students
       set failed_attempts = failed, last_failed_at = now_,
           locked_until = case when secs > 0 then now_ + make_interval(secs => secs) end
     where id = s.id;
    return jsonb_build_object('status', case when secs > 0 then 'locked' else 'wrong' end, 'retry_after', secs);
  end if;

  -- Acierto: contador a cero. La primera vez nace el niño y queda en la clase (el docente ve su progreso, #51).
  cid := s.child_id;
  if cid is null then
    cid := gen_random_uuid();
    insert into auth.users (id, aud, role, is_anonymous) values (cid, 'authenticated', 'authenticated', true);
    insert into public.children (id, nickname) values (cid, s.nickname);
    insert into public.class_children (child_id, class_id) values (cid, p_class);
  end if;
  update public.class_students
     set child_id = cid, failed_attempts = 0, last_failed_at = null, locked_until = null
   where id = s.id;
  return jsonb_build_object('status', 'ok', 'child_id', cid, 'nickname', s.nickname);
end;
$$;

revoke all on function public.login_lock_seconds(int, int) from public, anon, authenticated;
revoke all on function public.list_class_nicknames(uuid) from public, anon, authenticated;
revoke all on function public.class_login(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.list_class_nicknames(uuid) to anon, authenticated;
grant execute on function public.class_login(uuid, uuid, text, text) to service_role;

-- El export del niño (RGPD) incluye su fila de alumno de clase: apodo, animal y clase, nunca el hash del código.
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
    'parental_consents', coalesce((select jsonb_agg(jsonb_build_object('child_id', pc.child_id, 'policy_version', pc.policy_version, 'consented_at', pc.consented_at)) from public.parental_consents pc where pc.child_id = uid), '[]'::jsonb),
    'class_children', coalesce((select jsonb_agg(to_jsonb(cc)) from public.class_children cc where cc.child_id = uid), '[]'::jsonb),
    'class_students', coalesce((select jsonb_agg(jsonb_build_object('class_id', cs.class_id, 'nickname', cs.nickname, 'animal', cs.animal, 'created_at', cs.created_at)) from public.class_students cs where cs.child_id = uid), '[]'::jsonb)
  );
end;
$$;
