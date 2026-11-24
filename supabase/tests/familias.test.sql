begin;
select plan(37);

-- Dos adultos (con correo, solo en auth.users) y seis niños anónimos.
insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ana@example.com', now(), false),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'bea@example.com', now(), false);
insert into auth.users (id, aud, role, is_anonymous)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'authenticated', 'authenticated', true
from generate_series(1, 6) n;
insert into public.children (id, nickname)
select ('c0000000-0000-0000-0000-00000000000' || n)::uuid, 'Niño ' || n from generate_series(1, 6) n;
insert into public.progress (child_id, skill, mastery, attempts, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', 40, 5, 4),
  ('c0000000-0000-0000-0000-000000000001', 'sub-within-10', 20, 3, 2),
  ('c0000000-0000-0000-0000-000000000006', 'add-within-10', 90, 9, 9);
insert into public.answers (child_id, skill, seed, given, correct) values
  ('c0000000-0000-0000-0000-000000000001', 'add-within-10', '1', 7, true);

-- Para cambiar de «persona» dentro del test.
create function pg_temp.act(uid text, adult boolean) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', not adult)::text, true);
end;
$$;
grant execute on function pg_temp.act(text, boolean) to public;

-- Esquema: el correo solo existe en auth.users; ninguna tabla pública tiene columna de correo.
select is(
  (select string_agg(table_name || '.' || column_name, ',')
     from information_schema.columns
    where table_schema = 'public' and (column_name ilike '%mail%' or column_name ilike '%correo%')),
  'parental_consents.adult_email', 'la única columna de correo de public es parental_consents.adult_email (#48)');
select columns_are('public', 'families', array['id', 'owner_id', 'created_at'], 'families: solo id, dueño y fecha');
select columns_are('public', 'family_children', array['child_id', 'family_id', 'joined_at'], 'family_children: sin datos personales');
select columns_are('public', 'link_codes', array['code_hash', 'child_id', 'created_at', 'expires_at'], 'link_codes: solo hash y caducidad');

-- anon no ejecuta nada.
reset role;
set local role anon;
select throws_ok($$select public.create_link_code()$$, '42501', null, 'anon no crea códigos');
select throws_ok($$select public.join_family_with_code('AAAAAAAA', '0.2', true)$$, '42501', null, 'anon no une');
select throws_ok($$select public.leave_family('c0000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon no suelta');

-- El niño 1 crea su código.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
create temp table code1 as select public.create_link_code() as code;
grant select on code1 to public;
select matches((select code from code1), '^[A-HJ-NP-Z2-9]{8}$', 'el código tiene 8 letras y cifras');
select throws_ok($$select public.join_family_with_code((select code from code1), '0.2', true)$$, '42501', null, 'un niño no puede unirse como adulto');
select is((select count(*) from public.families), 0::bigint, 'el niño no ve families');

-- Un adulto no puede pedir un código (no es un niño).
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.create_link_code()$$, '42501', null, 'un adulto no crea códigos de niño');
select throws_ok($$select public.join_family_with_code('ZZZZZZZZ', '0.2', true)$$, 'P0001', 'invalid-code', 'un código inventado no sirve');

-- El hash robado no sirve como código.
reset role;
create temp table hash1 as select code_hash as h from public.link_codes where child_id = 'c0000000-0000-0000-0000-000000000001';
grant select on hash1 to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.join_family_with_code((select h from hash1), '0.2', true)$$, 'P0001', 'invalid-code', 'con el hash robado no se puede unir');

-- Unir: antes y después, las filas del niño son idénticas.
reset role;
create temp table before_join as
  select (select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001') as p,
         (select count(*) from public.answers where child_id = 'c0000000-0000-0000-0000-000000000001') as a,
         (select md5(string_agg(skill || mastery || attempts || correct, ',' order by skill)) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001') as digest;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select is((select public.join_family_with_code((select code from code1), '0.2', true) ->> 'nickname'), 'Niño 1', 'el adulto une al niño con el código');
select throws_ok($$select public.join_family_with_code((select code from code1), '0.2', true)$$, 'P0001', 'invalid-code', 'el código vale una sola vez');
reset role;
select is(
  (select (select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001') = b.p
      and (select count(*) from public.answers where child_id = 'c0000000-0000-0000-0000-000000000001') = b.a
      and (select md5(string_agg(skill || mastery || attempts || correct, ',' order by skill)) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001') = b.digest
     from before_join b),
  true, 'unir no pierde ni duplica progreso ni respuestas');

-- Unir al mismo niño otra vez con otro código no cambia nada.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
create temp table code1b as select public.create_link_code() as code;
grant select on code1b to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.join_family_with_code((select code from code1b), '0.2', true);
select is((select count(*) from public.family_children), 1::bigint, 'unir dos veces al mismo niño no lo duplica');

-- El adulto lee ficha y dominio de su niño, pero no las respuestas y no escribe.
select is((select count(*) from public.children), 1::bigint, 'el adulto ve a su niño');
select is((select count(*) from public.progress), 2::bigint, 'el adulto ve el dominio de su niño');
select is((select count(*) from public.answers), 0::bigint, 'el adulto no ve las respuestas');
select lives_ok($$update public.children set nickname = 'X'$$, 'actualizar no da error…');
reset role;
select is((select nickname from public.children where id = 'c0000000-0000-0000-0000-000000000001'), 'Niño 1', '…pero el adulto no ha cambiado nada');
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$delete from public.progress$$, '42501', null, 'el adulto no borra el dominio');
reset role;
select is((select count(*) from public.progress where child_id = 'c0000000-0000-0000-0000-000000000001'), 2::bigint, 'el dominio sigue intacto');

-- Otro adulto no ve a los hijos de Ana.
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.children) + (select count(*) from public.progress) + (select count(*) from public.family_children) + (select count(*) from public.families), 0::bigint, 'otro adulto no ve nada de la familia de Ana');

-- Un niño ya en otra familia no se puede unir.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
create temp table code1c as select public.create_link_code() as code;
grant select on code1c to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select throws_ok($$select public.join_family_with_code((select code from code1c), '0.2', true)$$, 'P0001', 'child-in-family', 'un niño de otra familia se rechaza');

-- Máximo 4 niños por familia.
select pg_temp.act('c0000000-0000-0000-0000-000000000002', false);
create temp table code2 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000003', false);
create temp table code3 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000004', false);
create temp table code4 as select public.create_link_code() as code;
select pg_temp.act('c0000000-0000-0000-0000-000000000005', false);
create temp table code5 as select public.create_link_code() as code;
grant select on code2, code3, code4, code5 to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.join_family_with_code((select code from code2), '0.2', true);
select public.join_family_with_code((select code from code3), '0.2', true);
select public.join_family_with_code((select code from code4), '0.2', true);
select throws_ok($$select public.join_family_with_code((select code from code5), '0.2', true)$$, 'P0001', 'family-full', 'no se pasa de 4 hijos');
select is((select count(*) from public.family_children), 4::bigint, 'la familia tiene 4 hijos');

-- Con la familia llena, volver a unir a uno que ya está no falla ni cambia nada.
select pg_temp.act('c0000000-0000-0000-0000-000000000002', false);
create temp table code2b as select public.create_link_code() as code;
grant select on code2b to public;
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.join_family_with_code((select code from code2b), '0.2', true)$$, 'unir a uno que ya está, con la familia llena, no falla');

-- Un código caducado no sirve.
reset role;
update public.link_codes set expires_at = now() - interval '1 second';
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.join_family_with_code((select code from code5), '0.2', true)$$, 'P0001', 'invalid-code', 'un código caducado no sirve');

-- Soltar: el niño y su progreso se quedan; solo se va de la familia.
select public.leave_family('c0000000-0000-0000-0000-000000000004');
select is((select count(*) from public.family_children), 3::bigint, 'el adulto suelta a un niño');
reset role;
select is((select count(*) from public.children where id = 'c0000000-0000-0000-0000-000000000004'), 1::bigint, 'el niño soltado sigue existiendo');
select pg_temp.act('a0000000-0000-0000-0000-000000000002', true);
select public.leave_family('c0000000-0000-0000-0000-000000000001');
reset role;
select is((select count(*) from public.family_children), 3::bigint, 'otro adulto no puede soltar a los hijos de Ana');

-- Un niño no ve nada de las familias.
select pg_temp.act('c0000000-0000-0000-0000-000000000001', false);
select is((select count(*) from public.families) + (select count(*) from public.family_children), 0::bigint, 'el niño no ve families ni family_children');
select throws_ok($$select * from public.link_codes$$, '42501', null, 'el niño no lee link_codes');

-- Borrar la cuenta del adulto borra la familia, no a los niños.
select pg_temp.act('a0000000-0000-0000-0000-000000000001', true);
select public.delete_my_account();
reset role;
select is((select count(*) from public.families) + (select count(*) from public.family_children), 0::bigint, 'al borrar al adulto se va su familia');
select is((select count(*) from public.children), 6::bigint, 'los niños siguen con su progreso');

select * from finish();
rollback;
