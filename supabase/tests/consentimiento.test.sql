begin;
select plan(23);

-- Adultos: Ana (correo confirmado), Bea (correo SIN confirmar) y Carla (confirmado, otra familia).
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ana@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'bea@example.com', null, false),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'carla@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true
from generate_series(1, 5) n;
insert into public.children (id, nickname)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'Niño ' || n from generate_series(1, 5) n;
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 40, 5, 4),
  ('c0000000-0000-0000-0000-000000000001', 'sub-within-10', 20, 3, 2),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', 70, 9, 8);
insert into public.answers (child_id, skill, seed, given, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', '1', 7, true),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', '2', 7, true);

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Un código por niño (1 a 4).
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
create temp table code1 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000002', false);
create temp table code2 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000003', false);
create temp table code3 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000004', false);
create temp table code4 as select public.create_link_code() as code;
grant select on code1, code2, code3, code4 to public;

-- Sin consentimiento completo, el niño NO queda unido.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.join_family_with_code((select code from code1), '0.2', true)$$, 'P0001', 'email-not-confirmed', 'sin correo confirmado no se une');

select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.join_family_with_code((select code from code1), '0.2', false)$$, 'P0001', 'consent-required', 'sin declarar ser madre/padre/tutor no se une');
select throws_ok($$select public.join_family_with_code((select code from code1), '0.2', null)$$, 'P0001', 'consent-required', 'la declaración no puede ser nula');
select throws_ok($$select public.join_family_with_code((select code from code1), '', true)$$, 'P0001', 'consent-required', 'sin versión de la política no se une');
reset role;
select is((select count(*) from public.family_children) + (select count(*) from public.parental_consents), 0::bigint, 'los intentos fallidos no dejan ni unión ni consentimiento');
select is((select count(*) from public.link_codes where child_id = 'c0000000-0000-0000-0000-000000000001'), 1::bigint, 'el código sigue vivo tras un intento fallido');

-- Unir bien guarda fecha, versión y correo.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.join_family_with_code((select code from code1), '0.2', true);
select public.join_family_with_code((select code from code2), '0.2', true);
select public.join_family_with_code((select code from code3), '0.2', true);
reset role;
select is(
  (select adult_email || '|' || policy_version || '|' || (consented_at > now() - interval '1 minute')::text
     from public.parental_consents where child_id = 'c0000000-0000-0000-0000-000000000001'),
  'ana@example.com|0.2|true', 'se guardan correo, versión y fecha');
select is((select count(*) from public.parental_consents), 3::bigint, 'un consentimiento por niño unido');

-- Unir otra vez al mismo niño no duplica ni cambia el consentimiento.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
create temp table code1b as select public.create_link_code() as code;
grant select on code1b to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.join_family_with_code((select code from code1b), '0.3', true);
reset role;
select is((select policy_version from public.parental_consents where child_id = 'c0000000-0000-0000-0000-000000000001'), '0.2', 'volver a unir no duplica ni cambia el consentimiento');

-- Nadie lee parental_consents desde el cliente.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select * from public.parental_consents$$, '42501', null, 'el adulto no lee parental_consents');
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select throws_ok($$select * from public.parental_consents$$, '42501', null, 'el niño no lee parental_consents');

-- La exportación lleva el consentimiento sin el correo.
create temp table export1 as select public.export_my_data() as d;
grant select on export1 to public;
select ok(
  (select d -> 'parental_consents' -> 0 ->> 'policy_version' = '0.2' and d::text not like '%ana@example.com%' from export1),
  'el export lleva el consentimiento y no el correo del adulto');

-- Última actividad: jugar la actualiza (con el niño 4, que aún no tiene consentimiento).
reset role;
update public.children set last_active_at = now() - interval '5 days' where id = 'c0000000-0000-0000-0000-000000000004';
insert into public.answers (child_id, skill, seed, given, correct) values ('c0000000-0000-0000-0000-000000000004', 'add-within-10', '9', 1, true);
select ok((select last_active_at > now() - interval '1 minute' from public.children where id = 'c0000000-0000-0000-0000-000000000004'), 'guardar una respuesta cuenta como actividad');

-- Borrado a los 30 días sin jugar, solo sin consentimiento.
-- Niño 4: sin consentimiento, 31 días. Niño 5: sin consentimiento, 29 días. Niño 1: con consentimiento, 400 días.
update public.children set last_active_at = now() - interval '31 days' where id = 'c0000000-0000-0000-0000-000000000004';
update public.children set last_active_at = now() - interval '29 days' where id = 'c0000000-0000-0000-0000-000000000005';
update public.children set last_active_at = now() - interval '400 days' where id = 'c0000000-0000-0000-0000-000000000001';
select pg_temp.act('c0000000-0000-0000-0000-000000000004', false);
select throws_ok($$select public.purge_unconsented_children()$$, '42501', null, 'un niño no lanza la tarea de borrado');
reset role;
select is(public.purge_unconsented_children(), 1, 'la tarea borra una cuenta');
select is((select count(*) from public.children where id = 'c0000000-0000-0000-0000-000000000004')
        + (select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000004')
        + (select count(*) from public.answers where child_id = 'c0000000-0000-0000-0000-000000000004')
        + (select count(*) from auth.users where id = 'c0000000-0000-0000-0000-000000000004'), 0::bigint, 'sin consentimiento y 31 días sin jugar: se borra con todo');
select is((select count(*) from public.children where id = 'c0000000-0000-0000-0000-000000000005'), 1::bigint, 'sin consentimiento pero 29 días: se queda');
select is((select count(*) from public.children where id = 'c0000000-0000-0000-0000-000000000001'), 1::bigint, 'con consentimiento no se borra, por antiguo que sea');

-- Retirar el consentimiento borra todo del niño.
select pg_temp.act('a0000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.withdraw_consent('c0000000-0000-0000-0000-000000000002')$$, 'P0001', 'not-in-family', 'otro adulto no retira el consentimiento');
select pg_temp.act('c0000000-0000-0000-0000-000000000002', false);
select throws_ok($$select public.withdraw_consent('c0000000-0000-0000-0000-000000000002')$$, '42501', null, 'el propio niño no retira el consentimiento');
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.withdraw_consent('c0000000-0000-0000-0000-000000000002');
reset role;
select is((select count(*) from public.children where id = 'c0000000-0000-0000-0000-000000000002')
        + (select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000002')
        + (select count(*) from public.answers where child_id = 'c0000000-0000-0000-0000-000000000002')
        + (select count(*) from public.family_children where child_id = 'c0000000-0000-0000-0000-000000000002')
        + (select count(*) from public.parental_consents where child_id = 'c0000000-0000-0000-0000-000000000002')
        + (select count(*) from auth.users where id = 'c0000000-0000-0000-0000-000000000002'), 0::bigint, 'retirar el consentimiento borra progreso, respuestas, consentimiento y cuenta');
select is((select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001'), 2::bigint, 'los otros niños de la familia no se tocan');

-- Soltar al niño de la familia retira su consentimiento.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.leave_family('c0000000-0000-0000-0000-000000000003');
reset role;
select is((select count(*) from public.parental_consents where child_id = 'c0000000-0000-0000-0000-000000000003'), 0::bigint, 'soltar al niño borra su consentimiento (y el correo)');

select * from finish();
rollback;
