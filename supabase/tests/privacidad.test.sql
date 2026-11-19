begin;
select plan(3);

-- Si alguien añade una columna, este test falla y hay que decidirlo a propósito
-- (regla 5: nada de nombre real, correo ni ubicación).
select columns_are('public', 'children', array['id', 'nickname', 'created_at'],
  'children solo guarda id, apodo y fecha');
select columns_are('public', 'progress',
  array['child_id', 'skill', 'mastery', 'attempts', 'correct', 'updated_at'],
  'progress solo guarda el dominio por habilidad');
select columns_are('public', 'answers',
  array['id', 'child_id', 'skill', 'seed', 'given', 'correct', 'hints_used', 'created_at'],
  'answers solo guarda la respuesta y su semilla');

select * from finish();
rollback;
