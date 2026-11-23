-- Validación de respuestas en el servidor (#46).
-- El navegador deja de escribir `progress` y `answers`: solo lee. Escribe la
-- Edge Function `answer`, que corrige cada respuesta con @kalku/exercises y
-- guarda el resultado con `record_answers` (solo ejecutable por service_role).

-- Una semilla solo se puede responder una vez por niño: no se repite una respuesta correcta.
alter table public.answers add constraint answers_child_seed_unique unique (child_id, seed);

-- El navegador ya no inserta, edita ni borra el dominio ni las respuestas.
drop policy progress_own on public.progress;
drop policy answers_insert_own on public.answers;
create policy progress_select_own on public.progress
  for select to authenticated
  using (child_id = (select auth.uid()));

revoke insert, update, delete on public.progress from authenticated;
revoke insert, update, delete on public.answers from authenticated;
grant select on public.progress to authenticated;
grant select on public.answers to authenticated;
revoke usage on sequence public.answers_id_seq from authenticated;

-- Guarda de golpe las respuestas validadas y el dominio resultante.
-- p_answers: [{skill, seed, given, correct, hints_used}]
-- p_progress: [{skill, mastery, attempts, correct}]
-- Si una semilla ya estaba respondida lanza 23505 y no se guarda nada.
create function public.record_answers(p_child uuid, p_answers jsonb, p_progress jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.answers (child_id, skill, seed, given, correct, hints_used)
  select p_child, a.skill, a.seed, a.given, a.correct, a.hints_used
  from jsonb_to_recordset(p_answers)
    as a(skill text, seed text, given integer, correct boolean, hints_used smallint);

  insert into public.progress (child_id, skill, mastery, attempts, correct, updated_at)
  select p_child, p.skill, p.mastery, p.attempts, p.correct, now()
  from jsonb_to_recordset(p_progress)
    as p(skill text, mastery numeric, attempts integer, correct integer)
  on conflict (child_id, skill) do update
    set mastery = excluded.mastery,
        attempts = excluded.attempts,
        correct = excluded.correct,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.record_answers(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_answers(uuid, jsonb, jsonb) to service_role;
grant select, insert, update on public.progress to service_role;
grant select, insert on public.answers to service_role;
grant usage on sequence public.answers_id_seq to service_role;
grant select on public.children to service_role;
