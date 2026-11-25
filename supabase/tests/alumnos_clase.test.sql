begin;
select plan(22);

-- Adultos: T1 y T2 (docentes), D1 (director del centro de T1, sin clases propias) y un niño anónimo.
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'd1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 't1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 't2@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous) values
  ('c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true);
insert into public.schools (id, name, join_code_hash) values ('50000000-0000-0000-0000-000000000001', 'Cole', repeat('a', 64));
insert into public.teachers (user_id, school_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'director'),
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'docente');

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Crear clase.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select throws_ok($$select public.create_class('3A')$$, '42501', 'not-adult', 'un niño no crea clases');
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.create_class('  ')$$, 'P0001', 'invalid-name', 'la clase necesita nombre');
create temp table c1 as select public.create_class('3A') as id;
grant select on c1 to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
create temp table c2 as select public.create_class('4B') as id;
grant select on c2 to public;

-- Alta de alumnos (T1).
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
create temp table s1 as select public.add_student((select id from c1), 'Zorro', repeat('1', 64), 'LU', 'fox') as id;
grant select on s1 to public;
select lives_ok($$select public.add_student((select id from c1), 'Ana P.', repeat('2', 64), 'SO', 'owl')$$, 'el docente añade a otro alumno');
select throws_ok($$select public.add_student((select id from c1), 'Otro', repeat('1', 64), 'LU', 'fox')$$, 'P0001', 'code-taken', 'dos alumnos de la clase no comparten código');
select throws_ok($$select public.add_student((select id from c1), repeat('x', 21), repeat('3', 64), 'LU', 'fox')$$, 'P0001', 'invalid-nickname', 'el apodo tiene como máximo 20 letras');
select throws_ok($$select public.add_student((select id from c1), 'Ok', 'no-es-un-hash', 'LU', 'fox')$$, 'P0001', 'invalid-student', 'el hash tiene que ser sha-256');
select throws_ok($$select public.add_student((select id from c1), 'Ok', repeat('3', 64), 'LU', 'perro')$$, 'P0001', 'invalid-student', 'solo hay 6 animales');

-- Otro docente no toca la clase de T1.
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.add_student((select id from c1), 'Intruso', repeat('4', 64), 'LU', 'fox')$$, 'P0001', 'not-your-class', 'otro docente no añade alumnos a la clase');
select throws_ok($$select public.regenerate_student_code((select id from s1), repeat('4', 64), 'LU', 'fox')$$, 'P0001', 'not-your-class', 'otro docente no regenera códigos');
select throws_ok($$select public.remove_student((select id from s1))$$, 'P0001', 'not-your-class', 'otro docente no borra alumnos');
select is((select count(*) from public.class_students), 0::bigint, 'otro docente no ve alumnos que no son suyos');
-- El mismo código puede existir en otra clase.
select lives_ok($$select public.add_student((select id from c2), 'Zorro', repeat('1', 64), 'LU', 'fox')$$, 'el código solo es único dentro de la clase');

-- La dirección ve a los alumnos del centro, pero no escribe.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.class_students), 2::bigint, 'la dirección ve a los alumnos de las clases de su centro');
select throws_ok($$select public.add_student((select id from c1), 'Dir', repeat('5', 64), 'LU', 'fox')$$, 'P0001', 'not-your-class', 'la dirección no añade alumnos a una clase ajena');

-- Nadie lee el hash; el niño no lee nada; nadie escribe directo.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select code_hash from public.class_students$$, '42501', null, 'el hash del código no se lee desde el cliente');
select throws_ok($$insert into public.class_students (class_id, nickname, code_hash, code_hint, animal) values ((select id from c1), 'X', repeat('6', 64), 'LU', 'fox')$$, '42501', null, 'no se escribe en la tabla directamente');
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select is((select count(*) from public.class_students), 0::bigint, 'un niño no ve alumnos de clase');

-- Regenerar: el hash anterior deja de existir.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.regenerate_student_code((select id from s1), repeat('7', 64), 'MA', 'turtle')$$, 'el docente regenera el código');
reset role;
select is((select count(*) from public.class_students where class_id = (select id from c1) and code_hash = repeat('1', 64)), 0::bigint, 'el código anterior deja de valer');
select is((select code_hash || code_hint || animal from public.class_students where id = (select id from s1)), repeat('7', 64) || 'MAturtle', 'queda el código nuevo');

-- Límite de 30 por clase.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.add_student((select id from c1), 'N' || n, lpad(n::text, 64, '9'), 'AB', 'fox') from generate_series(1, 28) n$$, 'una clase admite 30 alumnos');
select throws_ok($$select public.add_student((select id from c1), 'N31', lpad('31', 64, '9'), 'AB', 'fox')$$, 'P0001', 'class-full', 'el alumno 31 no entra');

select * from finish();
rollback;
