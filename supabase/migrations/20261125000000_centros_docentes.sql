-- Cuentas de centro y de docente (#51). Un docente es un adulto (enlace de correo, como en #47).
-- El correo sigue SOLO en auth.users: ninguna tabla nueva guarda correo ni nombre real.
-- Un centro tiene un director y docentes que se unen con un código. Las clases y sus alumnos
-- (class_children) están aquí solo con las tablas y los permisos; las pantallas llegan en #52.

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Código para que los docentes se unan. Solo se guarda su hash (sha-256); no caduca, se renueva.
  join_code_hash text not null unique,
  created_at timestamptz not null default now()
);

-- Un adulto está como mucho en un centro. `school_id` vacío = docente sin centro.
create table public.teachers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  role text not null default 'docente' check (role in ('director', 'docente')),
  created_at timestamptz not null default now()
);

create index teachers_school_id_idx on public.teachers (school_id);

-- Prueba de que el centro aceptó el contrato de encargo de tratamiento (#49). No lleva correo:
-- quién lo aceptó se enlaza por su id (y se borra el enlace si se borra su cuenta).
create table public.school_contracts (
  school_id uuid not null references public.schools (id) on delete cascade,
  contract_version text not null check (char_length(contract_version) between 1 and 20),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz not null default now(),
  primary key (school_id, contract_version)
);

-- Una clase es de un docente (con o sin centro).
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

-- Un niño está como mucho en una clase (clave primaria = child_id).
create table public.class_children (
  child_id uuid primary key references public.children (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index class_children_class_id_idx on public.class_children (class_id);

-- Máximo 30 alumnos por clase (el límite gratuito del docente). Se bloquea la fila de la clase
-- para que dos altas a la vez no se salten el límite.
create function public.class_children_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.classes where id = new.class_id for update;
  if (select count(*) from public.class_children where class_id = new.class_id) >= 30 then
    raise exception 'class-full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger class_children_limit
  before insert on public.class_children
  for each row execute function public.class_children_limit();

-- ¿El adulto de la sesión es director del centro donde está ese docente? (security definer para que
-- las políticas no se llamen a sí mismas en bucle al leer `teachers`).
create function public.is_school_director_of(p_teacher uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_adult()
     and exists (
       select 1
         from public.teachers me
         join public.teachers t on t.school_id = me.school_id
        where me.user_id = auth.uid()
          and me.role = 'director'
          and me.school_id is not null
          and t.user_id = p_teacher
     );
$$;

-- Permisos: RLS forzada. Los adultos solo leen; escribir es cosa de las funciones de abajo.
alter table public.schools enable row level security;
alter table public.teachers enable row level security;
alter table public.school_contracts enable row level security;
alter table public.classes enable row level security;
alter table public.class_children enable row level security;
alter table public.schools force row level security;
alter table public.teachers force row level security;
alter table public.school_contracts force row level security;
alter table public.classes force row level security;
alter table public.class_children force row level security;

revoke all on public.schools, public.teachers, public.school_contracts, public.classes, public.class_children from anon, authenticated;
-- schools: sin la columna del hash del código.
grant select (id, name, created_at) on public.schools to authenticated;
grant select on public.teachers, public.classes, public.class_children to authenticated;
-- school_contracts: sin permisos; solo las funciones security definer la tocan.

create policy teachers_read on public.teachers
  for select to authenticated
  using (public.is_adult() and (user_id = (select auth.uid()) or public.is_school_director_of(user_id)));

create policy schools_read on public.schools
  for select to authenticated
  using (
    public.is_adult()
    and id in (select t.school_id from public.teachers t where t.user_id = (select auth.uid()))
  );

-- El docente lee sus clases; el director, todas las de su centro.
create policy classes_read on public.classes
  for select to authenticated
  using (public.is_adult() and (teacher_id = (select auth.uid()) or public.is_school_director_of(teacher_id)));

-- Las políticas de abajo se apoyan en las de `classes` (una consulta sobre `classes` ya filtra por RLS).
create policy class_children_read on public.class_children
  for select to authenticated
  using (public.is_adult() and class_id in (select c.id from public.classes c));

-- Ficha y dominio de los alumnos de sus clases. Nunca las respuestas, nunca escribe.
create policy children_class_read on public.children
  for select to authenticated
  using (public.is_adult() and id in (select cc.child_id from public.class_children cc));

create policy progress_class_read on public.progress
  for select to authenticated
  using (public.is_adult() and child_id in (select cc.child_id from public.class_children cc));

-- Código de 8 letras y cifras (sin 0/O/1/I), como el de los niños. Solo lo llaman las funciones de abajo.
create function public.new_school_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := uuid_send(gen_random_uuid());
  -- Los bytes 6 y 8 de un uuid v4 llevan bits fijos: no se usan.
  picks constant int[] := array[0, 1, 2, 3, 4, 5, 9, 10];
  code text := '';
  i int;
begin
  for i in 1 .. array_length(picks, 1) loop
    code := code || substr(alphabet, (get_byte(raw, picks[i]) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- Da de alta un centro: exige correo confirmado y contrato aceptado. El autor queda como director.
-- Devuelve el código en claro una sola vez; en la base solo queda el hash.
create function public.create_school(p_name text, p_contract_version text, p_accepts boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  confirmed timestamptz;
  mail text;
  sid uuid;
  code text := public.new_school_code();
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  select u.email, u.email_confirmed_at into mail, confirmed from auth.users u where u.id = uid;
  if mail is null or confirmed is null then
    raise exception 'email-not-confirmed' using errcode = 'P0001';
  end if;
  if p_accepts is distinct from true or p_contract_version is null or btrim(p_contract_version) = '' then
    raise exception 'contract-required' using errcode = 'P0001';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'invalid-name' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.teachers where user_id = uid and school_id is not null) then
    raise exception 'already-in-school' using errcode = 'P0001';
  end if;

  insert into public.schools (name, join_code_hash)
  values (btrim(p_name), encode(sha256(convert_to(code, 'utf8')), 'hex'))
  returning id into sid;
  insert into public.school_contracts (school_id, contract_version, accepted_by)
  values (sid, btrim(p_contract_version), uid);
  insert into public.teachers (user_id, school_id, role) values (uid, sid, 'director')
  on conflict (user_id) do update set school_id = excluded.school_id, role = 'director';
  return jsonb_build_object('school_id', sid, 'name', btrim(p_name), 'code', code);
end;
$$;

-- El director renueva el código: el anterior deja de valer. Devuelve el nuevo, en claro, una sola vez.
create function public.rotate_school_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  code text := public.new_school_code();
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  select t.school_id into sid from public.teachers t where t.user_id = uid and t.role = 'director';
  if sid is null then
    raise exception 'not-director' using errcode = 'P0001';
  end if;
  update public.schools set join_code_hash = encode(sha256(convert_to(code, 'utf8')), 'hex') where id = sid;
  return code;
end;
$$;

-- Un docente se une a un centro con su código. Unirse otra vez al mismo centro no cambia nada.
create function public.join_school_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  sid uuid;
  sname text;
  current_school uuid;
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  select s.id, s.name into sid, sname
    from public.schools s
   where s.join_code_hash = encode(sha256(convert_to(normalized, 'utf8')), 'hex');
  if sid is null then
    raise exception 'invalid-code' using errcode = 'P0001';
  end if;
  select t.school_id into current_school from public.teachers t where t.user_id = uid;
  if current_school is not null and current_school <> sid then
    raise exception 'already-in-school' using errcode = 'P0001';
  end if;
  insert into public.teachers (user_id, school_id, role) values (uid, sid, 'docente')
  on conflict (user_id) do update set school_id = excluded.school_id;
  return jsonb_build_object('school_id', sid, 'name', sname);
end;
$$;

-- El docente deja su centro (sus clases y alumnos siguen siendo suyos). El director no puede:
-- sin director el centro quedaría sin nadie que renueve el código.
create function public.leave_school()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r text;
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  select t.role into r from public.teachers t where t.user_id = uid and t.school_id is not null;
  if r = 'director' then
    raise exception 'director-cannot-leave' using errcode = 'P0001';
  end if;
  update public.teachers set school_id = null where user_id = uid;
end;
$$;

revoke all on function public.class_children_limit() from public, anon, authenticated;
revoke all on function public.is_school_director_of(uuid) from public, anon, authenticated;
revoke all on function public.new_school_code() from public, anon, authenticated;
revoke all on function public.create_school(text, text, boolean) from public, anon, authenticated;
revoke all on function public.rotate_school_code() from public, anon, authenticated;
revoke all on function public.join_school_with_code(text) from public, anon, authenticated;
revoke all on function public.leave_school() from public, anon, authenticated;
-- Las políticas llaman a is_school_director_of con el rol del adulto.
grant execute on function public.is_school_director_of(uuid) to authenticated;
grant execute on function public.create_school(text, text, boolean) to authenticated;
grant execute on function public.rotate_school_code() to authenticated;
grant execute on function public.join_school_with_code(text) to authenticated;
grant execute on function public.leave_school() to authenticated;

-- El borrado a los 30 días (#48) no toca a los niños que están en una clase: los cubre el contrato
-- de encargo del centro (o la responsabilidad del docente).
create or replace function public.purge_unconsented_children()
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
       and not exists (select 1 from public.class_children cc where cc.child_id = c.id)
    returning u.id
  )
  select count(*) into n from gone;
  return n;
end;
$$;

-- La exportación del niño incluye su clase (solo ids y fecha: nada del docente ni del centro).
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
    'class_children', coalesce((select jsonb_agg(to_jsonb(cc)) from public.class_children cc where cc.child_id = uid), '[]'::jsonb)
  );
end;
$$;
