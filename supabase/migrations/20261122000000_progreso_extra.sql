-- Resto del progreso del juego (monedas, gemas, colección, encuentros, ajustes,
-- idioma, prueba de nivel) en una sola columna, con límite de tamaño (#45).
-- Sin datos personales: el apodo sigue siendo lo único que escribe el niño.
alter table public.children
  add column extra jsonb not null default '{}'::jsonb
  check (jsonb_typeof(extra) = 'object' and pg_column_size(extra) <= 8192);
