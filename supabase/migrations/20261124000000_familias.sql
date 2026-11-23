-- Cuenta de familia (#47): un adulto (login por enlace de correo) con hasta 4 niños.
-- El correo vive SOLO en auth.users del adulto: ninguna tabla de niño tiene columna de correo.
-- El niño sigue siendo un login anónimo; el adulto es un usuario no anónimo.

-- ¿La sesión actual es la de un adulto? (no anónimo y con sesión)
create function public.is_adult()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Un niño está como mucho en una familia (clave primaria = child_id).
create table public.family_children (
  child_id uuid primary key references public.children (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index family_children_family_id_idx on public.family_children (family_id);

-- Código corto de un solo uso para unir un niño. Solo se guarda su hash (sha-256).
create table public.link_codes (
  code_hash text primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index link_codes_child_id_idx on public.link_codes (child_id);

-- Máximo 4 niños por familia. Se bloquea la fila de la familia para que dos
-- uniones a la vez no se salten el límite.
create function public.family_children_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.families where id = new.family_id for update;
  if (select count(*) from public.family_children where family_id = new.family_id) >= 4 then
    raise exception 'family-full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger family_children_limit
  before insert on public.family_children
  for each row execute function public.family_children_limit();

-- Permisos: RLS forzada. Los adultos solo leen; escribir es cosa de las funciones de abajo.
alter table public.families enable row level security;
alter table public.family_children enable row level security;
alter table public.link_codes enable row level security;
alter table public.families force row level security;
alter table public.family_children force row level security;
alter table public.link_codes force row level security;

revoke all on public.families, public.family_children, public.link_codes from anon, authenticated;
grant select on public.families, public.family_children to authenticated;
-- link_codes: sin ningún permiso ni política; solo las funciones security definer la tocan.

create policy families_owner_read on public.families
  for select to authenticated
  using (public.is_adult() and owner_id = (select auth.uid()));

create policy family_children_owner_read on public.family_children
  for select to authenticated
  using (
    public.is_adult()
    and family_id in (select f.id from public.families f where f.owner_id = (select auth.uid()))
  );

-- El adulto lee a los niños de su familia: ficha y dominio. Nunca las respuestas, nunca escribe.
create policy children_family_read on public.children
  for select to authenticated
  using (
    public.is_adult()
    and id in (
      select fc.child_id from public.family_children fc
      join public.families f on f.id = fc.family_id
      where f.owner_id = (select auth.uid())
    )
  );

create policy progress_family_read on public.progress
  for select to authenticated
  using (
    public.is_adult()
    and child_id in (
      select fc.child_id from public.family_children fc
      join public.families f on f.id = fc.family_id
      where f.owner_id = (select auth.uid())
    )
  );

-- El niño genera un código de 8 letras y cifras (sin 0/O/1/I) que vale 10 minutos.
-- Devuelve el código en claro una sola vez; en la base solo queda el hash.
create function public.create_link_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := uuid_send(gen_random_uuid());
  -- Los bytes 6 y 8 de un uuid v4 llevan bits fijos: no se usan.
  picks constant int[] := array[0, 1, 2, 3, 4, 5, 9, 10];
  code text := '';
  i int;
begin
  if uid is null or public.is_adult() then
    raise exception 'not-child' using errcode = '42501';
  end if;
  if not exists (select 1 from public.children where id = uid) then
    raise exception 'no-child' using errcode = 'P0001';
  end if;
  for i in 1 .. array_length(picks, 1) loop
    code := code || substr(alphabet, (get_byte(raw, picks[i]) % 32) + 1, 1);
  end loop;
  delete from public.link_codes where child_id = uid or expires_at < now();
  insert into public.link_codes (code_hash, child_id, expires_at)
  values (encode(sha256(convert_to(code, 'utf8')), 'hex'), uid, now() + interval '10 minutes');
  return code;
end;
$$;

-- El adulto une al niño del código a su familia (la crea si no la tiene).
-- Unir a un niño que ya está en esta familia no cambia nada.
create function public.join_family_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  hash text;
  cid uuid;
  fid uuid;
  nick text;
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  hash := encode(sha256(convert_to(normalized, 'utf8')), 'hex');
  select lc.child_id into cid
    from public.link_codes lc
   where lc.code_hash = hash and lc.expires_at > now()
   for update;
  if cid is null then
    raise exception 'invalid-code' using errcode = 'P0001';
  end if;

  insert into public.families (owner_id) values (uid) on conflict (owner_id) do nothing;
  select f.id into fid from public.families f where f.owner_id = uid;

  if exists (select 1 from public.family_children where child_id = cid and family_id <> fid) then
    raise exception 'child-in-family' using errcode = 'P0001';
  end if;
  -- Si ya estaba en esta familia no se inserta (así el límite de 4 no estorba).
  if not exists (select 1 from public.family_children where child_id = cid) then
    insert into public.family_children (child_id, family_id) values (cid, fid);
  end if;
  delete from public.link_codes where code_hash = hash;

  select c.nickname into nick from public.children c where c.id = cid;
  return jsonb_build_object('child_id', cid, 'nickname', nick);
end;
$$;

-- El adulto suelta a un niño de su familia (el niño y su progreso no se tocan).
create function public.leave_family(p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_adult() then
    raise exception 'not-adult' using errcode = '42501';
  end if;
  delete from public.family_children fc
   where fc.child_id = p_child
     and fc.family_id in (select f.id from public.families f where f.owner_id = auth.uid());
end;
$$;

revoke all on function public.is_adult() from public, anon;
revoke all on function public.create_link_code() from public, anon, authenticated;
revoke all on function public.join_family_with_code(text) from public, anon, authenticated;
revoke all on function public.leave_family(uuid) from public, anon, authenticated;
grant execute on function public.is_adult() to authenticated;
grant execute on function public.create_link_code() to authenticated;
grant execute on function public.join_family_with_code(text) to authenticated;
grant execute on function public.leave_family(uuid) to authenticated;

-- La exportación del niño (#50) incluye lo nuevo: a qué familia pertenece y si tiene un código vivo
-- (sin el hash). De la familia solo sale su id: ni el correo ni nada del adulto.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'children', coalesce((select jsonb_agg(to_jsonb(c)) from public.children c where c.id = uid), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(to_jsonb(p) order by p.skill) from public.progress p where p.child_id = uid), '[]'::jsonb),
    'answers', coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a where a.child_id = uid), '[]'::jsonb),
    'family_children', coalesce((select jsonb_agg(to_jsonb(fc)) from public.family_children fc where fc.child_id = uid), '[]'::jsonb),
    'link_codes', coalesce((select jsonb_agg(jsonb_build_object('created_at', lc.created_at, 'expires_at', lc.expires_at)) from public.link_codes lc where lc.child_id = uid), '[]'::jsonb)
  );
end;
$$;
