begin;
select plan(8);

-- Si alguien añade una columna, este test falla y hay que decidirlo a propósito
-- (regla 5: nada de nombre real, correo ni ubicación).
select columns_are('public', 'children', array['id', 'nickname', 'created_at', 'extra', 'last_active_at'],
  'children solo guarda id, apodo, fecha, última actividad y el progreso extra (sin datos personales)');
select columns_are('public', 'progress',
  array['child_id', 'skill', 'mastery', 'attempts', 'correct', 'updated_at'],
  'progress solo guarda el dominio por habilidad');
select columns_are('public', 'answers',
  array['id', 'child_id', 'skill', 'seed', 'given', 'correct', 'hints_used', 'created_at'],
  'answers solo guarda la respuesta y su semilla');

-- Centros y docentes (#51): el correo no se copia, solo ids, nombre del centro y del grupo (sin nombres de niños).
select columns_are('public', 'schools', array['id', 'name', 'join_code_hash', 'created_at'], 'schools: nombre del centro y hash del código');
select columns_are('public', 'teachers', array['user_id', 'school_id', 'role', 'created_at'], 'teachers: solo ids y rol (el correo sigue en auth.users)');
select columns_are('public', 'school_contracts', array['school_id', 'contract_version', 'accepted_by', 'accepted_at'], 'school_contracts: versión, fecha y quién (por id)');
select columns_are('public', 'classes', array['id', 'teacher_id', 'name', 'created_at'], 'classes: solo id, docente y nombre del grupo');
select columns_are('public', 'class_children', array['child_id', 'class_id', 'joined_at'], 'class_children: sin datos personales');

select * from finish();
rollback;
