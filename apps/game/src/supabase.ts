import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase (proyecto en Frankfurt). Solo usa la clave pública (anon);
 * la `service_role` no va nunca en el navegador. Los permisos los decide RLS.
 * Si faltan las variables, devuelve `null` y el juego sigue con el guardado local.
 */
export function createSupabaseClient(
  url: string | undefined,
  anonKey: string | undefined,
  role: 'child' | 'adult' = 'child',
): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    // El adulto (enlace de correo, #47) tiene su propia sesión, en otra clave de
    // localStorage: así entrar como adulto no pisa la sesión del niño de este aparato.
    // Solo el cliente del adulto lee el enlace de acceso de la URL.
    return createClient(url, anonKey, {
      auth:
        role === 'adult'
          ? { persistSession: true, autoRefreshToken: true, storageKey: 'kalku-adult-auth', detectSessionInUrl: true }
          : { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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

let cachedAdult: SupabaseClient | null | undefined;

/** Cliente con la sesión del adulto de la familia (distinta de la del niño). */
export function getAdultSupabase(): SupabaseClient | null {
  if (cachedAdult === undefined) {
    cachedAdult = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      'adult',
    );
  }
  return cachedAdult;
}
