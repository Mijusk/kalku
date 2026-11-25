begin;
select plan(16);

-- Adultos: D1 (director del centro de T1), T1 y T2 (docentes). Niños C1 y C2 (alumnos de T1), C3 (alumno de T2), C9 (sin clase).
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'd1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 't1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 't2@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true from generate_series(1, 9) n;
insert into public.children (id, nickname)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'Niño ' || n from generate_series(1, 9) n;
insert into public.schools (id, name, join_code_hash) values ('50000000-0000-0000-0000-000000000001', 'Cole', repeat('a', 64));
insert into public.teachers (user_id, school_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'director'),
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'docente');
insert into public.classes (id, teacher_id, name) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '3A'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '4B');
insert into public.class_students (id, class_id, nickname, code_hash, code_hint, animal, child_id) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Zoe', repeat('1', 64), 'LU', 'fox', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Ana', repeat('2', 64), 'SO', 'owl', 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Leo', repeat('3', 64), 'MA', 'frog', null),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Otro', repeat('4', 64), 'PA', 'whale', 'c0000000-0000-0000-0000-000000000003');

-- Progreso: C1 con dos habilidades, C2 con una, C3 (otra clase) con una, C9 (sin clase) con una.
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 85, 20, 17),
  ('c0000000-0000-0000-0000-000000000001', 'sub-within-10', 30, 10, 5),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', 55, 8, 5),
  ('c0000000-0000-0000-0000-000000000003', 'add-within-10', 99, 40, 40),
  ('c0000000-0000-0000-0000-000000000009', 'add-within-10', 77, 4, 4);
-- Respuestas de C1: hoy 3 de 5 y hace 2 días 5 de 5, más una de hace 30 días (fuera de los 14 días). C3 también juega.
insert into public.answers (child_id, skill, seed, given, correct, created_at) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'h1', 1, true, now()),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'h2', 1, true, now()),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'h3', 1, true, now()),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'h4', 1, false, now()),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'h5', 1, false, now()),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'a1', 1, true, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'a2', 1, true, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'a3', 1, true, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'a4', 1, true, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'a5', 1, true, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 'old', 1, true, now() - interval '30 days'),
  ('c0000000-0000-0000-0000-000000000003', 'add-within-10', 'x1', 1, true, now());

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- El docente T1 ve a todos los alumnos de su clase (también el que aún no ha entrado) y nada más.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select is((select count(distinct student_id) from public.class_mastery('b0000000-0000-0000-0000-000000000001')), 3::bigint, 've los 3 alumnos de su clase');
select is((select count(*) from public.class_mastery('b0000000-0000-0000-0000-000000000001')), 4::bigint, 'una fila por habilidad con intentos más la del alumno sin progreso');
select is(
  (select skill from public.class_mastery('b0000000-0000-0000-0000-000000000001') where nickname = 'Leo'),
  null, 'el alumno que no ha entrado sale sin habilidad, no desaparece');
select is(
  (select mastery from public.class_mastery('b0000000-0000-0000-0000-000000000001') where nickname = 'Zoe' and skill = 'sub-within-10'),
  30::numeric, 'el dominio coincide con progress');
select is(
  (select array_agg(nickname order by nickname) from (select distinct nickname from public.class_mastery('b0000000-0000-0000-0000-000000000001')) q),
  array['Ana', 'Leo', 'Zoe'], 'los apodos son los de la clase');
select is((select count(*) from public.class_mastery('b0000000-0000-0000-0000-000000000002')), 0::bigint, 'no ve la clase de otro docente');
select is((select count(*) from public.class_student_days('b0000000-0000-0000-0000-000000000002')), 0::bigint, 'ni sus días de juego');

-- Totales por día: hoy 5 y 3 aciertos, hace 2 días 5 y 5; lo de hace 30 días no sale.
select is((select count(*) from public.class_student_days('b0000000-0000-0000-0000-000000000001')), 2::bigint, 'dos días con actividad en los últimos 14');
select is(
  (select sum(attempts)::int * 100 + sum(correct)::int from public.class_student_days('b0000000-0000-0000-0000-000000000001')),
  1000 + 8, 'los intentos y aciertos coinciden con answers (10 y 8)');
select is(
  (select attempts * 100 + correct from public.class_student_days('b0000000-0000-0000-0000-000000000001') where day = (now() at time zone 'Europe/Madrid')::date),
  503, 'hoy: 5 respuestas, 3 aciertos');

-- Nunca las respuestas sueltas: el docente no lee answers.
select is((select count(*) from public.answers), 0::bigint, 'el docente no lee las respuestas directamente');

-- La dirección ve las clases de su centro; T1 no ve las de T2.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select is((select count(distinct student_id) from public.class_mastery('b0000000-0000-0000-0000-000000000001')), 3::bigint, 'la dirección ve la clase de su centro');
select is((select count(*) from public.class_mastery('b0000000-0000-0000-0000-000000000002')), 0::bigint, 'la dirección no ve clases de fuera de su centro');

-- Otro docente (T2) no ve la clase de T1.
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.class_mastery('b0000000-0000-0000-0000-000000000001')), 0::bigint, 'otro docente no ve la clase');

-- Un niño anónimo no ve nada.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select is((select count(*) from public.class_mastery('b0000000-0000-0000-0000-000000000001')), 0::bigint, 'un niño no ve el dominio de la clase');
select is((select count(*) from public.class_student_days('b0000000-0000-0000-0000-000000000001')), 0::bigint, 'ni los días de juego');

select * from finish();
rollback;
