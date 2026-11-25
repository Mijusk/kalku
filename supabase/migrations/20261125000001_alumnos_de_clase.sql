-- Clases con tarjetas imprimibles (#52). Un alumno con tarjeta aún no ha entrado nunca, así que no
-- tiene fila en `children`: esta tabla es la lista de alumnos de la clase. «Entrar con la tarjeta»
-- (siguiente issue) enlazará cada alumno con un niño.
-- Privacidad: solo un apodo o iniciales (sin apellidos). El código NO se guarda en claro: solo su
-- hash (sha-256 de «<id de la clase>:<CÓDIGO>», calculado en el aparato del docente) y una pista
-- (las dos primeras letras). Si se pierde la tarjeta se regenera el código; no se puede volver a ver.

create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null check (code_hint ~ '^[A-Z]{1,3}$'),
  animal text not null check (animal in ('fox', 'owl', 'frog', 'whale', 'hedgehog', 'turtle')),
  created_at timestamptz not null default now(),
  unique (class_id, code_hash)
);

create index class_students_class_id_idx on public.class_students (class_id);

-- Máximo 30 alumnos por clase, igual que `class_children`; se bloquea la clase para las altas a la vez.
create function public.class_students_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.classes where id = new.class_id for update;
  if (select count(*) from public.class_students where class_id = new.class_id) >= 30 then
    raise exception 'class-full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger class_students_limit
  before insert on public.class_students
  for each row execute function public.class_students_limit();

alter table public.class_students enable row level security;
alter table public.class_students force row level security;
revoke all on public.class_students from anon, authenticated;
-- Sin la columna del hash: el cliente nunca la lee.
grant select (id, class_id, nickname, code_hint, animal, created_at) on public.class_students to authenticated;

-- Lee quien lee la clase (su docente y la dirección de su centro); una consulta sobre `classes` ya filtra por RLS.
create policy class_students_read on public.class_students
  for select to authenticated
  using (public.is_adult() and class_id in (select c.id from public.classes c));

-- ¿El adulto de la sesión es el docente de esa clase? (solo quien la creó escribe en ella)
create function public.owns_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_adult()
     and exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid());
$$;

create function public.create_class(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'invalid-name' using errcode = 'P0001';
  end if;
  insert into public.classes (teacher_id, name) values (auth.uid(), btrim(p_name)) returning id into cid;
  return cid;
end;
$$;

create function public.add_student(p_class uuid, p_nickname text, p_code_hash text, p_code_hint text, p_animal text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
begin
  if not public.owns_class(p_class) then
    raise exception 'not-your-class' using errcode = 'P0001';
  end if;
  if p_nickname is null or char_length(btrim(p_nickname)) not between 1 and 20 then
    raise exception 'invalid-nickname' using errcode = 'P0001';
  end if;
  begin
    insert into public.class_students (class_id, nickname, code_hash, code_hint, animal)
    values (p_class, btrim(p_nickname), p_code_hash, p_code_hint, p_animal)
    returning id into sid;
  exception
    when unique_violation then
      raise exception 'code-taken' using errcode = 'P0001';
    when check_violation then
      raise exception 'invalid-student' using errcode = 'P0001';
  end;
  return sid;
end;
$$;

-- Código nuevo (y animal nuevo): el anterior deja de valer porque ya no hay nada que lo reconozca.
create function public.regenerate_student_code(p_student uuid, p_code_hash text, p_code_hint text, p_animal text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  select s.class_id into cid from public.class_students s where s.id = p_student;
  if cid is null or not public.owns_class(cid) then
    raise exception 'not-your-class' using errcode = 'P0001';
  end if;
  begin
    update public.class_students
       set code_hash = p_code_hash, code_hint = p_code_hint, animal = p_animal
     where id = p_student;
  exception
    when unique_violation then
      raise exception 'code-taken' using errcode = 'P0001';
    when check_violation then
      raise exception 'invalid-student' using errcode = 'P0001';
  end;
end;
$$;

create function public.remove_student(p_student uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  select s.class_id into cid from public.class_students s where s.id = p_student;
  if cid is null or not public.owns_class(cid) then
    raise exception 'not-your-class' using errcode = 'P0001';
  end if;
  delete from public.class_students where id = p_student;
end;
$$;

revoke all on function public.class_students_limit() from public, anon, authenticated;
revoke all on function public.owns_class(uuid) from public, anon, authenticated;
revoke all on function public.create_class(text) from public, anon, authenticated;
revoke all on function public.add_student(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.regenerate_student_code(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.remove_student(uuid) from public, anon, authenticated;
grant execute on function public.create_class(text) to authenticated;
grant execute on function public.add_student(uuid, text, text, text, text) to authenticated;
grant execute on function public.regenerate_student_code(uuid, text, text, text) to authenticated;
grant execute on function public.remove_student(uuid) to authenticated;
