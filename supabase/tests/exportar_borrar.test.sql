begin;
select plan(12);

insert into auth.users (id, aud, role, is_anonymous)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', true),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', true);

insert into public.children (id, nickname, extra) values
  ('11111111-1111-1111-1111-111111111111', 'Ana', '{"coins": 5}'),
  ('22222222-2222-2222-2222-222222222222', 'Beto', '{"coins": 99}');
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('11111111-1111-1111-1111-111111111111', 'add-within-10', 40, 5, 4),
  ('11111111-1111-1111-1111-111111111111', 'sub-within-10', 20, 3, 2),
  ('22222222-2222-2222-2222-222222222222', 'add-within-10', 70, 9, 8);
insert into public.answers (child_id, skill, seed, given, correct, hints_used) values
  ('11111111-1111-1111-1111-111111111111', 'add-within-10', 's1', 7, true, 0),
  ('11111111-1111-1111-1111-111111111111', 'sub-within-10', 's2', 3, false, 2),
  ('11111111-1111-1111-1111-111111111111', 'sub-within-10', 's3', 4, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'add-within-10', 's4', 9, false, 0);

-- Sin sesión: ninguna de las dos funciones.
set local role anon;
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anon no puede exportar');
select throws_ok($$select public.delete_my_account()$$, '42501', null, 'anon no puede borrar');

-- Entra Ana.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

create temp table export_ana as select public.export_my_data() as d;
grant select on export_ana to authenticated;

select is((select jsonb_array_length(d -> 'progress') from export_ana), 2, 'el export lleva todo el progreso');
select is((select jsonb_array_length(d -> 'answers') from export_ana), 3, 'el export lleva todas las respuestas');
select is((select d -> 'children' -> 0 ->> 'nickname' from export_ana), 'Ana', 'el export lleva el apodo');
select is((select d -> 'children' -> 0 -> 'extra' ->> 'coins' from export_ana), '5', 'el export lleva el progreso extra');
select ok(
  (select (d -> 'children' -> 0) ?& array['id', 'nickname', 'created_at', 'extra'] from export_ana),
  'el export lleva todas las columnas de children');
select ok(
  (select (d -> 'answers' -> 0) ?& array['id', 'child_id', 'skill', 'seed', 'given', 'correct', 'hints_used', 'created_at'] from export_ana),
  'el export lleva todas las columnas de answers');
select ok(
  not exists (select 1 from export_ana where d::text like '%Beto%' or d::text like '%22222222-2222%'),
  'el export no incluye nada de otro niño');

-- Cobertura: toda tabla de public con datos de un niño tiene que estar en el export.
reset role;
select is(
  (select count(*) from (
     select table_name::text as t from information_schema.columns
      where table_schema = 'public' and column_name = 'child_id'
     union select 'children'
   ) tablas
   where not exists (select 1 from export_ana where d ? tablas.t)),
  0::bigint,
  'ninguna tabla con child_id se queda fuera del export');

-- Borrado.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.delete_my_account();

reset role;
select is(
  (select count(*) from public.children where id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.progress where child_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.answers where child_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'tras borrar no queda ninguna fila del niño');
select is(
  (select count(*) from public.children where id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.progress where child_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.answers where child_id = '22222222-2222-2222-2222-222222222222')
  + (select count(*) from auth.users where id = '22222222-2222-2222-2222-222222222222'),
  4::bigint, 'los datos de otro niño siguen intactos');

select * from finish();
rollback;
