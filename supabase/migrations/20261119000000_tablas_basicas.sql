-- Tablas mínimas de Kalku (regla 5: datos mínimos de niños).
-- Un niño es un login anónimo de Supabase: children.id = auth.uid().
-- Nada de nombre real, correo ni ubicación en ninguna tabla.

create table public.children (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  created_at timestamptz not null default now()
);

-- Mismos ids que SkillId en packages/exercises/src/types.ts.
create table public.progress (
  child_id uuid not null references public.children (id) on delete cascade,
  skill text not null check (skill in (
    'add-within-10',
    'sub-within-10',
    'add-within-20-no-carry',
    'sub-within-20-no-borrow',
    'add-within-20-carry',
    'sub-within-20-borrow',
    'word-problems-within-10'
  )),
  mastery numeric not null default 0 check (mastery between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  correct integer not null default 0 check (correct >= 0 and correct <= attempts),
  updated_at timestamptz not null default now(),
  primary key (child_id, skill)
);

-- La semilla permite al servidor regenerar el ejercicio y validarlo (issue #46).
create table public.answers (
  id bigint generated always as identity primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  skill text not null check (skill in (
    'add-within-10',
    'sub-within-10',
    'add-within-20-no-carry',
    'sub-within-20-no-borrow',
    'add-within-20-carry',
    'sub-within-20-borrow',
    'word-problems-within-10'
  )),
  seed text not null check (char_length(seed) <= 64),
  given integer not null,
  correct boolean not null,
  hints_used smallint not null default 0 check (hints_used between 0 and 3),
  created_at timestamptz not null default now()
);

create index answers_child_id_idx on public.answers (child_id, created_at);

-- Permisos: solo `authenticated` (incluye el login anónimo). `anon` no puede nada.
alter table public.children enable row level security;
alter table public.progress enable row level security;
alter table public.answers enable row level security;
alter table public.children force row level security;
alter table public.progress force row level security;
alter table public.answers force row level security;

revoke all on public.children, public.progress, public.answers from anon, authenticated;
revoke all on sequence public.answers_id_seq from anon, authenticated;

grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
-- answers: solo leer e insertar; no se edita ni se borra.
grant select, insert on public.answers to authenticated;
grant usage on sequence public.answers_id_seq to authenticated;

-- Cada niño solo ve y escribe lo suyo.
create policy children_own on public.children
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy progress_own on public.progress
  for all to authenticated
  using (child_id = (select auth.uid()))
  with check (child_id = (select auth.uid()));

create policy answers_select_own on public.answers
  for select to authenticated
  using (child_id = (select auth.uid()));

create policy answers_insert_own on public.answers
  for insert to authenticated
  with check (child_id = (select auth.uid()));

-- TODO(#46): al validar en servidor, retirar la escritura de progress y answers.
