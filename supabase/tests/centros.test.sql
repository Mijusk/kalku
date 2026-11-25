begin;
select plan(46);

-- Adultos: director del centro 1 (D1), docentes T1 y T2, director del centro 2 (D2), docente sin centro (S),
-- U (correo SIN confirmar) y X (un docente más). Los correos viven solo en auth.users.
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'd1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 't1@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 't2@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'd2@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 's@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'u@example.com', null, false),
  ('a0000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'x@example.com', now(), false);

-- Niños: c1 a c4 (uno por clase), e1 y e2 (para el borrado a los 30 días) y 31 para el límite de la clase.
insert into auth.users (id, aud, role, is_anonymous)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true from generate_series(1, 4) n;
insert into auth.users (id, aud, role, is_anonymous)
select ('e0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true from generate_series(1, 2) n;
insert into auth.users (id, aud, role, is_anonymous)
select ('f0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'authenticated', 'authenticated', true from generate_series(1, 31) n;
insert into public.children (id, nickname)
select id, 'Niño ' || right(id::text, 2) from auth.users where is_anonymous;
update public.children set last_active_at = now() - interval '60 days'
 where id in ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 40, 5, 4),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', 70, 9, 8),
  ('c0000000-0000-0000-0000-000000000003', 'add-within-10', 10, 2, 1);
insert into public.answers (child_id, skill, seed, given, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', '1', 7, true),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', '2', 7, true);

-- Clases (la pantalla para crearlas llega en #52): A de T1, B de T2, C de S (sin centro), D de D1, L para el límite.
insert into public.classes (id, teacher_id, name) values
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'A'),
  ('ca000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'B'),
  ('ca000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'C'),
  ('ca000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'D'),
  ('ca000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'L');
insert into public.class_children (child_id, class_id) values
  ('c0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001');

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Alta de centro: exige correo confirmado, contrato aceptado y nombre.
select pg_temp.act('a0000000-0000-0000-0000-000000000006', true);
select throws_ok($$select public.create_school('Cole', '0.1', true)$$, 'P0001', 'email-not-confirmed', 'sin correo confirmado no se crea el centro');
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.create_school('Cole', '0.1', false)$$, 'P0001', 'contract-required', 'sin aceptar el contrato no se crea el centro');
select throws_ok($$select public.create_school('   ', '0.1', true)$$, 'P0001', 'invalid-name', 'el centro necesita nombre');
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select throws_ok($$select public.create_school('Cole', '0.1', true)$$, '42501', 'not-adult', 'un niño (anónimo) no crea centros');

select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
create temp table code1 as select public.create_school('Cole', '0.1', true) ->> 'code' as code;
grant select on code1 to public;
select throws_ok($$select public.create_school('Otro', '0.1', true)$$, 'P0001', 'already-in-school', 'un adulto no crea un segundo centro');
reset role;
select is((select count(*) from public.schools) + (select count(*) from public.school_contracts), 2::bigint, 'el centro y la prueba del contrato quedan guardados');
select is((select role from public.teachers where user_id = 'a0000000-0000-0000-0000-000000000001'), 'director', 'quien crea el centro es director');

-- Unirse con el código.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.join_school_with_code('ZZZZZZZZ')$$, 'P0001', 'invalid-code', 'un código erróneo no vale');
select lives_ok($$select public.join_school_with_code(lower(substr((select code from code1), 1, 4) || ' ' || substr((select code from code1), 5)))$$, 'con el código (en minúsculas y con espacio) el docente se une');
reset role;
select is((select school_id from public.teachers where user_id = 'a0000000-0000-0000-0000-000000000002'),
          (select id from public.schools where name = 'Cole'), 'el docente queda unido a su centro');
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.join_school_with_code((select code from code1))$$, 'unirse otra vez al mismo centro no falla');

select pg_temp.act('a0000000-0000-0000-0000-000000000004', true);
create temp table code2 as select public.create_school('Otro cole', '0.1', true) ->> 'code' as code;
grant select on code2 to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
select lives_ok($$select public.join_school_with_code((select code from code2))$$, 'T2 se une al otro centro');
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.join_school_with_code((select code from code2))$$, 'P0001', 'already-in-school', 'un docente no está en dos centros');
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select throws_ok($$select public.join_school_with_code((select code from code1))$$, '42501', 'not-adult', 'un niño no se une a un centro');

-- Renovar el código: solo el director; el anterior deja de valer.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.rotate_school_code()$$, 'P0001', 'not-director', 'un docente no renueva el código');
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
create temp table code1b as select public.rotate_school_code() as code;
grant select on code1b to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000007', true);
select throws_ok($$select public.join_school_with_code((select code from code1))$$, 'P0001', 'invalid-code', 'el código viejo deja de valer');
select lives_ok($$select public.join_school_with_code((select code from code1b))$$, 'el código nuevo vale');
reset role;
select is((select school_id from public.teachers where user_id = 'a0000000-0000-0000-0000-000000000007'),
          (select id from public.schools where name = 'Cole'), 'X queda unido con el código nuevo');
select pg_temp.act('a0000000-0000-0000-0000-000000000007', true);
select lives_ok($$select public.leave_school()$$, 'un docente deja su centro');
reset role;
select is((select school_id from public.teachers where user_id = 'a0000000-0000-0000-0000-000000000007'), null::uuid, 'sin centro tras salir');
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.leave_school()$$, 'P0001', 'director-cannot-leave', 'el director no deja el centro');

-- En la base solo queda el hash del código.
reset role;
select is((select count(*) from public.schools where join_code_hash ~ '^[0-9a-f]{64}$'), 2::bigint, 'los códigos se guardan como hash sha-256');
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select join_code_hash from public.schools$$, '42501', null, 'nadie lee el hash desde el cliente');

-- Permisos (RLS). T1: docente del centro 1 con la clase A.
select results_eq($$select id from public.classes$$, $$values ('ca000000-0000-0000-0000-000000000001'::uuid)$$, 'T1 solo ve su clase');
select results_eq($$select child_id from public.class_children order by child_id$$,
  $$values ('c0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000001'::uuid)$$, 'T1 solo ve los alumnos de su clase');
select results_eq($$select id from public.children order by id$$,
  $$values ('c0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000001'::uuid)$$, 'T1 solo ve las fichas de sus alumnos');
select results_eq($$select distinct child_id from public.progress$$, $$values ('c0000000-0000-0000-0000-000000000001'::uuid)$$, 'T1 solo ve el dominio de sus alumnos');
select is((select count(*) from public.answers), 0::bigint, 'T1 no lee las respuestas');
select is((select count(*) from public.schools) + (select count(*) from public.teachers), 2::bigint, 'T1 ve su centro y solo a sí mismo');
select throws_ok($$select * from public.school_contracts$$, '42501', null, 'T1 no lee los contratos');
select throws_ok($$insert into public.classes (teacher_id, name) values ('a0000000-0000-0000-0000-000000000002', 'Z')$$, '42501', null, 'nadie escribe clases directo');

-- D1: director del centro 1, ve las clases de su centro y no las de otros.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select results_eq($$select id from public.classes order by id$$,
  $$values ('ca000000-0000-0000-0000-000000000001'::uuid), ('ca000000-0000-0000-0000-000000000004'::uuid)$$, 'el director ve las clases de su centro y ninguna de otro');
select results_eq($$select id from public.children order by id$$,
  $$values ('c0000000-0000-0000-0000-000000000001'::uuid), ('c0000000-0000-0000-0000-000000000004'::uuid), ('e0000000-0000-0000-0000-000000000001'::uuid)$$,
  'el director ve a los alumnos de su centro y a ninguno de otro');
select is((select count(*) from public.teachers), 2::bigint, 'el director ve a los docentes de su centro (no a X, que salió)');

-- Otro centro y docente sin centro.
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
select results_eq($$select id from public.classes$$, $$values ('ca000000-0000-0000-0000-000000000002'::uuid)$$, 'T2 solo ve su clase');
select pg_temp.act('a0000000-0000-0000-0000-000000000004', true);
select results_eq($$select id from public.classes$$, $$values ('ca000000-0000-0000-0000-000000000002'::uuid)$$, 'D2 solo ve las clases de su centro');
select pg_temp.act('a0000000-0000-0000-0000-000000000005', true);
select results_eq($$select id from public.classes order by id$$,
  $$values ('ca000000-0000-0000-0000-000000000003'::uuid), ('ca000000-0000-0000-0000-000000000005'::uuid)$$, 'un docente sin centro ve sus clases');
select results_eq($$select id from public.children$$, $$values ('c0000000-0000-0000-0000-000000000003'::uuid)$$, 'y solo a sus alumnos');

-- Un niño no lee nada de centros ni de clases; y sin sesión tampoco.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select is((select count(*) from public.classes) + (select count(*) from public.class_children) + (select count(*) from public.teachers) + (select count(*) from public.schools), 0::bigint, 'el niño no ve clases, docentes ni centros');
select is((select count(*) from public.children), 1::bigint, 'el niño sigue viendo solo su ficha');
reset role;
set local role anon;
select throws_ok($$select * from public.classes$$, '42501', null, 'sin sesión no se leen las clases');

-- Docente sin centro: hasta 30 alumnos por clase.
reset role;
select lives_ok($$insert into public.class_children (child_id, class_id)
  select ('f0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'ca000000-0000-0000-0000-000000000005' from generate_series(1, 30) n$$,
  'una clase admite 30 alumnos');
select throws_ok($$insert into public.class_children (child_id, class_id) values ('f0000000-0000-0000-0000-000000000031', 'ca000000-0000-0000-0000-000000000005')$$,
  'P0001', 'class-full', 'el alumno 31 no entra');

-- Borrado a los 30 días (#48): no toca a quien está en una clase.
select is(public.purge_unconsented_children(), 1, 'el borrado solo quita al niño sin clase ni consentimiento');
select is((select count(*) from public.children where id = 'e0000000-0000-0000-0000-000000000001'), 1::bigint, 'el niño de una clase sigue aunque lleve 60 días sin jugar');
select is((select count(*) from public.children where id = 'e0000000-0000-0000-0000-000000000002'), 0::bigint, 'el niño sin clase ni consentimiento se borró');

select * from finish();
rollback;
