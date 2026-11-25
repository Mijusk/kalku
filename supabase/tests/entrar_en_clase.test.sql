begin;
select plan(27);

insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 't1@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous) values
  ('c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true);
insert into public.schools (id, name, join_code_hash) values ('50000000-0000-0000-0000-000000000001', 'Cole', repeat('a', 64));
insert into public.teachers (user_id, school_id, role) values ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'docente');
insert into public.classes (id, teacher_id, name) values
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '3A'),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '4B');
insert into public.class_students (id, class_id, nickname, code_hash, code_hint, animal) values
  ('51000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Zorro', repeat('1', 64), 'LU', 'fox'),
  ('51000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Ana P.', repeat('2', 64), 'SO', 'owl'),
  ('51000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Otra clase', repeat('3', 64), 'MA', 'frog');

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Apodos: solo id y apodo, y quien no está conectado también los puede pedir.
set local role anon;
select is((select count(*) from public.list_class_nicknames('c1000000-0000-0000-0000-000000000001')), 2::bigint, 'sin sesión se ven los apodos de la clase');
select ok(not has_function_privilege('anon', 'public.class_login(uuid, uuid, text, text)', 'execute'), 'el navegador no puede llamar a class_login');
select ok(not has_table_privilege('anon', 'public.class_students', 'select'), 'sin sesión no se lee la tabla de alumnos');
reset role;
select is((select count(*) from public.list_class_nicknames('c1000000-0000-0000-0000-000000000002')), 1::bigint, 'cada clase ve solo los suyos');

-- Animal correcto: entra y se crea su niño, que queda en la clase.
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'fox', null))->>'status', 'ok', 'con su animal entra');
select is((select count(*) from public.children where nickname = 'Zorro'), 1::bigint, 'nace su niño');
select is((select count(*) from public.class_children where class_id = 'c1000000-0000-0000-0000-000000000001'), 1::bigint, 'el niño queda en la clase');
select ok((select u.is_anonymous from auth.users u join public.class_students s on s.child_id = u.id where s.id = '51000000-0000-0000-0000-000000000001'), 'su cuenta es anónima (no es un adulto)');
-- Entrar otra vez da el MISMO niño: su progreso no se duplica.
create temp table first_child as select child_id from public.class_students where id = '51000000-0000-0000-0000-000000000001';
select is(((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'fox', null))->>'child_id')::uuid, (select child_id from first_child), 'la segunda vez es el mismo niño');
select is((select count(*) from public.children where nickname = 'Zorro'), 1::bigint, 'no se duplica el niño');

-- Animal incorrecto: no entra, y alumno de otra clase tampoco.
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'fox', null))->>'status', 'wrong', 'con otro animal no entra');
select is((select count(*) from public.children where nickname = 'Ana P.'), 0::bigint, 'y no se crea su niño');
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', 'frog', null))->>'status', 'unknown', 'un alumno de otra clase no existe aquí');

-- Tres fallos seguidos bloquean poco rato; con el bloqueo, ni el animal bueno entra.
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'frog', null))->>'status', 'wrong', 'segundo fallo: aún sin bloqueo');
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'fox', null))->>'retry_after', '30', 'tercer fallo: 30 s');
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'owl', null))->>'status', 'locked', 'bloqueado: ni el animal correcto entra');
-- Pasa el bloqueo: el siguiente fallo sube a 1 min y luego a 5 min como tope.
update public.class_students set locked_until = now() - interval '1 second' where id = '51000000-0000-0000-0000-000000000002';
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'fox', null))->>'retry_after', '60', 'cuarto fallo: 1 min');
update public.class_students set locked_until = now() - interval '1 second' where id = '51000000-0000-0000-0000-000000000002';
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'fox', null))->>'retry_after', '300', 'quinto fallo: 5 min');
update public.class_students set locked_until = now() - interval '1 second' where id = '51000000-0000-0000-0000-000000000002';
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'fox', null))->>'retry_after', '300', 'el tope es 5 min, no crece más');
-- Nunca para siempre: pasado el bloqueo, el animal correcto entra y el contador vuelve a cero.
update public.class_students set locked_until = now() - interval '1 second' where id = '51000000-0000-0000-0000-000000000002';
select is((public.class_login('c1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'owl', null))->>'status', 'ok', 'pasado el bloqueo, entra');
select is((select failed_attempts from public.class_students where id = '51000000-0000-0000-0000-000000000002'), 0, 'el acierto pone el contador a cero');

-- Código de la tarjeta: entra con su hash, no con el de otra clase.
select is((public.class_login('c1000000-0000-0000-0000-000000000001', null, null, repeat('1', 64)))->>'status', 'ok', 'el código de la tarjeta entra');
select is((public.class_login('c1000000-0000-0000-0000-000000000001', null, null, repeat('3', 64)))->>'status', 'wrong', 'el código de otra clase no entra');
select is((public.class_login('c1000000-0000-0000-0000-000000000009', null, null, repeat('1', 64)))->>'status', 'unknown', 'una clase que no existe no entra');
-- Probar códigos al azar se frena por clase: tras 10 fallos, espera.
select count(*) from (select public.class_login('c1000000-0000-0000-0000-000000000001', null, null, lpad(n::text, 64, 'e')) from generate_series(2, 9) n) q;
select is((public.class_login('c1000000-0000-0000-0000-000000000001', null, null, lpad('10', 64, 'e')))->>'status', 'locked', 'diez códigos que no existen frenan la clase un rato');

-- El docente no puede leer lo que no debe.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select child_id from public.class_students$$, '42501', null, 'el cliente no lee child_id');
select throws_ok($$select locked_until from public.class_students$$, '42501', null, 'el cliente no lee locked_until');

select * from finish();
rollback;
