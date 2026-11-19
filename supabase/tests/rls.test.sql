begin;
select plan(16);

-- Dos niños (logins anónimos simulados).
insert into auth.users (id, aud, role, is_anonymous)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', true),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', true);

insert into public.children (id, nickname) values
  ('11111111-1111-1111-1111-111111111111', 'Ana'),
  ('22222222-2222-2222-2222-222222222222', 'Beto');
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('11111111-1111-1111-1111-111111111111', 'add-within-10', 40, 5, 4),
  ('22222222-2222-2222-2222-222222222222', 'add-within-10', 70, 9, 8);
insert into public.answers (child_id, skill, seed, given, correct) values
  ('11111111-1111-1111-1111-111111111111', 'add-within-10', 's1', 7, true),
  ('22222222-2222-2222-2222-222222222222', 'add-within-10', 's2', 9, false);

-- Sin sesión (anon): no ve ni escribe nada.
set local role anon;
select throws_ok($$select * from public.progress$$, '42501', null, 'sin sesión no se lee el progreso');
select throws_ok($$select * from public.children$$, '42501', null, 'sin sesión no se leen los niños');
select throws_ok($$select * from public.answers$$, '42501', null, 'sin sesión no se leen las respuestas');

-- Entra el niño A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select results_eq($$select nickname from public.children$$, $$values ('Ana')$$,
  'un niño solo ve su propia ficha');
select results_eq($$select mastery::int from public.progress$$, $$values (40)$$,
  'un niño no lee el progreso de otro');
select results_eq($$select given from public.answers$$, $$values (7)$$,
  'un niño no lee las respuestas de otro');

select throws_ok(
  $$insert into public.progress (child_id, skill) values ('22222222-2222-2222-2222-222222222222', 'sub-within-10')$$,
  '42501', null, 'un niño no inserta progreso en nombre de otro');
select throws_ok(
  $$insert into public.answers (child_id, skill, seed, given, correct) values ('22222222-2222-2222-2222-222222222222', 'add-within-10', 'x', 1, true)$$,
  '42501', null, 'un niño no inserta respuestas en nombre de otro');
select throws_ok(
  $$insert into public.children (id, nickname) values ('22222222-2222-2222-2222-222222222222', 'Falso')$$,
  '42501', null, 'un niño no crea la ficha de otro');

select lives_ok(
  $$insert into public.progress (child_id, skill, mastery) values ('11111111-1111-1111-1111-111111111111', 'sub-within-10', 10)$$,
  'un niño inserta su propio progreso');
select lives_ok(
  $$insert into public.answers (child_id, skill, seed, given, correct) values ('11111111-1111-1111-1111-111111111111', 'add-within-10', 's3', 3, true)$$,
  'un niño inserta sus propias respuestas');

-- Modificar lo de otro no afecta a ninguna fila.
update public.progress set mastery = 0 where child_id = '22222222-2222-2222-2222-222222222222';
delete from public.progress where child_id = '22222222-2222-2222-2222-222222222222';
select is((select count(*)::int from public.progress), 2, 'un niño no modifica ni borra el progreso de otro (solo ve el suyo)');

select throws_ok($$update public.answers set correct = false$$, '42501', null,
  'las respuestas no se editan');
select throws_ok($$delete from public.answers$$, '42501', null,
  'las respuestas no se borran');

-- Vuelta a superusuario: el progreso de B sigue intacto.
reset role;
select is((select mastery::int from public.progress
  where child_id = '22222222-2222-2222-2222-222222222222'), 70,
  'el progreso de B no cambió');

select * from finish();
rollback;
