# Workflows de Supabase (pendientes de copiar)

La app de GitHub con la que trabaja Claude no tiene permiso para crear ficheros en `.github/workflows/`. Copia estos dos a esa carpeta (Luis, a mano o desde la web de GitHub) y borra esta carpeta:

- `supabase.yml`: en cada PR que toque `supabase/**`, aplica las migraciones desde cero y lanza los tests pgTAP.
- `supabase-migrar.yml`: manual (solo Luis), aplica las migraciones al proyecto real; necesita los secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`.
