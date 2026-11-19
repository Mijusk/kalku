import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase (proyecto en Frankfurt). Solo usa la clave pública (anon);
 * la `service_role` no va nunca en el navegador. Los permisos los decide RLS.
 * Si faltan las variables, devuelve `null` y el juego sigue con el guardado local.
 */
export function createSupabaseClient(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch {
    return null;
  }
}

let cached: SupabaseClient | null | undefined;

/** Cliente de la app, creado la primera vez que se pide. */
export function getSupabase(): SupabaseClient | null {
  if (cached === undefined) {
    cached = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return cached;
}
