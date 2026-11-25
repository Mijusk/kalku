-- Panel de dominio del docente (#55). El docente ve, por alumno de su clase, el dominio por habilidad
-- y los totales por día (intentos y aciertos). Nunca ve las respuestas sueltas: `answers` sigue sin
-- política para docentes y estas funciones solo devuelven números agregados.
-- Leen quien lee la clase: su docente y la dirección de su centro (misma regla que `classes_read`).

create function public.can_read_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_adult()
     and exists (
       select 1 from public.classes c
        where c.id = p_class
          and (c.teacher_id = auth.uid() or public.is_school_director_of(c.teacher_id))
     );
$$;

-- Una fila por alumno y habilidad con intentos. Un alumno que aún no ha entrado (o no ha jugado)
-- sale con `skill` nulo: no desaparece de la lista.
create function public.class_mastery(p_class uuid)
returns table (student_id uuid, nickname text, skill text, mastery numeric, attempts integer, correct integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.nickname, p.skill, p.mastery, p.attempts, p.correct
    from public.class_students s
    left join public.progress p on p.child_id = s.child_id and p.attempts > 0
   where s.class_id = p_class
     and public.can_read_class(p_class)
   order by s.nickname, s.created_at, p.skill;
$$;

-- Totales por alumno y día (hora de Madrid) de los últimos 14 días: solo cuántas respuestas y cuántos aciertos.
create function public.class_student_days(p_class uuid)
returns table (student_id uuid, day date, attempts integer, correct integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id,
         (a.created_at at time zone 'Europe/Madrid')::date as day,
         count(*)::integer,
         (count(*) filter (where a.correct))::integer
    from public.class_students s
    join public.answers a on a.child_id = s.child_id
   where s.class_id = p_class
     and public.can_read_class(p_class)
     and a.created_at >= now() - interval '14 days'
   group by s.id, 2
   order by s.id, 2;
$$;

revoke all on function public.can_read_class(uuid) from public, anon, authenticated;
revoke all on function public.class_mastery(uuid) from public, anon, authenticated;
revoke all on function public.class_student_days(uuid) from public, anon, authenticated;
grant execute on function public.class_mastery(uuid) to authenticated;
grant execute on function public.class_student_days(uuid) to authenticated;
