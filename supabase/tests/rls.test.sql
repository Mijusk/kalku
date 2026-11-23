begin;
select plan(26);

-- Dos niños (logins anónimos simulados).
insert into auth.users (id, aud, role, is_anonymous)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', true),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', true);

insert into public.children (id, nickname, extra) values
  ('11111111-1111-1111-1111-111111111111', 'Ana', '{"coins": 5}'),
  ('22222222-2222-2222-2222-222222222222', 'Beto', '{"coins": 99}');
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

-- #46: el navegador ya no escribe el dominio ni las respuestas, ni siquiera lo suyo.
select throws_ok(
  $$insert into public.progress (child_id, skill, mastery) values ('11111111-1111-1111-1111-111111111111', 'sub-within-10', 10)$$,
  '42501', null, 'un niño no inserta su propio progreso');
select throws_ok(
  $$update public.progress set mastery = 100 where child_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'un niño no sube su propio dominio');
select throws_ok(
  $$delete from public.progress where child_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'un niño no borra su propio progreso');
select throws_ok(
  $$insert into public.answers (child_id, skill, seed, given, correct) values ('11111111-1111-1111-1111-111111111111', 'add-within-10', 's3', 3, true)$$,
  '42501', null, 'un niño no inserta respuestas, ni las suyas');
select throws_ok(
  $$select public.record_answers('11111111-1111-1111-1111-111111111111', '[]', '[]')$$,
  '42501', null, 'un niño no puede llamar a record_answers');

-- Lo de otro tampoco: desde #46 el navegador no tiene permiso de escribir en progress.
select throws_ok($$update public.progress set mastery = 0 where child_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'un niño no modifica el progreso de otro');
select throws_ok($$delete from public.progress where child_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'un niño no borra el progreso de otro');
select is((select count(*)::int from public.progress), 1, 'un niño solo ve su propio progreso');

select throws_ok($$update public.answers set correct = false$$, '42501', null,
  'las respuestas no se editan');
select throws_ok($$delete from public.answers$$, '42501', null,
  'las respuestas no se borran');

select results_eq($$select (extra->>'coins')::int from public.children$$, $$values (5)$$,
  'un niño no lee el extra de otro');
select lives_ok(
  $$update public.children set extra = '{"coins": 6}' where id = '11111111-1111-1111-1111-111111111111'$$,
  'un niño guarda su propio extra');
select throws_ok(
  $$update public.children set extra = (select jsonb_build_object('x', string_agg(md5(i::text), '')) from generate_series(1, 400) i) where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'el extra tiene límite de tamaño');

-- Vuelta a superusuario: el progreso de B sigue intacto.
reset role;

-- La Edge Function (service_role) sí guarda, de una vez y sin repetir semillas.
set local role service_role;
select lives_ok(
  $$select public.record_answers('11111111-1111-1111-1111-111111111111',
    '[{"skill":"add-within-10","seed":"77","given":4,"correct":true,"hints_used":0}]',
    '[{"skill":"add-within-10","mastery":48,"attempts":6,"correct":5}]')$$,
  'service_role guarda respuesta y dominio');
select throws_ok(
  $$select public.record_answers('11111111-1111-1111-1111-111111111111',
    '[{"skill":"add-within-10","seed":"77","given":4,"correct":true,"hints_used":0}]',
    '[{"skill":"add-within-10","mastery":99,"attempts":7,"correct":6}]')$$,
  '23505', null, 'una semilla no se responde dos veces');
reset role;
select is((select mastery::int from public.progress
  where child_id = '11111111-1111-1111-1111-111111111111'), 48,
  'la respuesta repetida no cambió el dominio');
select is((select mastery::int from public.progress
  where child_id = '22222222-2222-2222-2222-222222222222'), 70,
  'el progreso de B no cambió');

select * from finish();
rollback;
