begin;
select plan(16);

-- Adultos: Ana (confirmada), Bea (correo sin confirmar), Carla (confirmada, sin consentimiento aún).
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ana@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'bea@example.com', null, false),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'carla@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true from generate_series(1, 4) n;
insert into public.children (id, nickname)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'Niño ' || n from generate_series(1, 4) n;
-- Familias a mano (el consentimiento se inserta aparte).
insert into public.families (id, owner_id) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003');
insert into public.family_children (child_id, family_id) values
  ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003');
-- Consentimiento: niños 1 y 3 (el 2 y el 4 no).
insert into public.parental_consents (child_id, adult_id, adult_email, policy_version) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ana@example.com', '0.4'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'bea@example.com', '0.4');
insert into public.answers (child_id, skill, seed, given, correct, created_at) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', '1', 7, true, '2026-11-17 10:00+00'),
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', '2', 7, false, '2026-11-30 10:00+00'),
  ('c0000000-0000-0000-0000-000000000002', 'add-within-10', '3', 7, true, '2026-11-17 10:00+00');

create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Valores por defecto: idioma es y recibe el resumen.
select is((select summary_locale from public.families where id = 'f0000000-0000-0000-0000-000000000001'), 'es', 'idioma por defecto: es');
select is((select summary_opt_out_at from public.families where id = 'f0000000-0000-0000-0000-000000000001'), null, 'activado por defecto');

-- Destinatarios: solo Ana (Bea no confirmó el correo; Carla no tiene consentimiento).
create temp table data1 as select public.weekly_summary_data('2026-11-16 00:00+00', '2026-11-23 00:00+00') as d;
select is(jsonb_array_length((select d from data1)), 1, 'solo una familia: correo confirmado y consentimiento');
select is((select d -> 0 ->> 'email' from data1), 'ana@example.com', 'es la de Ana');
select is(jsonb_array_length((select d -> 0 -> 'children' from data1)), 1, 'solo el niño con consentimiento');
select is(jsonb_array_length((select d -> 0 -> 'children' -> 0 -> 'answers' from data1)), 1, 'solo las respuestas de la semana pedida');

-- Los permisos: un niño y un adulto no leen los datos del resumen ni dan de baja a nadie.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.weekly_summary_data(now() - interval '7 days', now())$$, '42501', null, 'un adulto no pide los datos del resumen');
select throws_ok($$select public.unsubscribe_summary('f0000000-0000-0000-0000-000000000001')$$, '42501', null, 'un adulto no usa la baja del servidor');
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select throws_ok($$select public.set_summary_preferences('ca', false)$$, '42501', 'not-adult', 'un niño no cambia las preferencias');

-- El adulto cambia idioma y se da de baja desde Familia.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.set_summary_preferences('ca', false);
select is((select summary_locale from public.families where id = 'f0000000-0000-0000-0000-000000000001'), 'ca', 'guarda el idioma');
select isnt((select summary_opt_out_at from public.families where id = 'f0000000-0000-0000-0000-000000000001'), null, 'queda de baja');
select throws_ok($$select public.set_summary_preferences('fr', true)$$, 'P0001', 'invalid-preferences', 'idioma no válido');
select public.set_summary_preferences('ca', true);
select is((select summary_opt_out_at from public.families where id = 'f0000000-0000-0000-0000-000000000001'), null, 'se vuelve a activar');

-- Baja en un clic desde el correo (service_role): la familia dada de baja ya no recibe nada.
reset role;
set local role service_role;
select is(public.unsubscribe_summary('f0000000-0000-0000-0000-000000000001'), 'ca', 'la baja devuelve el idioma');
select is(jsonb_array_length(public.weekly_summary_data('2026-11-16 00:00+00', '2026-11-23 00:00+00')), 0, 'una familia dada de baja no recibe más correos');
select is(public.unsubscribe_summary('f0000000-0000-0000-0000-0000000000ff'), null, 'una familia que no existe no da error');

select * from finish();
rollback;
