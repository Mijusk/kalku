-- Derechos del RGPD de un niño (#50): llevarse sus datos y borrarlos.
-- Las dos funciones solo actúan sobre auth.uid(): nadie toca los datos de otro.

-- Todo lo que el servidor guarda del niño. to_jsonb(fila) incluye todas las
-- columnas, también las que se añadan en el futuro.
create function public.export_my_data()
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
    'answers', coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a where a.child_id = uid), '[]'::jsonb)
  );
end;
$$;

-- Borra la cuenta del niño. children, progress y answers caen por `on delete cascade`.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.export_my_data() from public, anon, authenticated;
revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
