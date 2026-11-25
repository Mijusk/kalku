import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLASS_AUTH_KEY, isClassDevice } from './classDevice';

/**
 * Cliente de Supabase (proyecto en Frankfurt). Solo usa la clave pública (anon);
 * la `service_role` no va nunca en el navegador. Los permisos los decide RLS.
 * Si faltan las variables, devuelve `null` y el juego sigue con el guardado local.
 */
export function createSupabaseClient(
  url: string | undefined,
  anonKey: string | undefined,
  role: 'child' | 'adult' | 'class' = 'child',
): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    // El adulto (enlace de correo, #47) tiene su propia sesión, en otra clave de
    // localStorage: así entrar como adulto no pisa la sesión del niño de este aparato.
    // Solo el cliente del adulto lee el enlace de acceso de la URL.
    // El alumno de un aparato compartido (#53) guarda su sesión en sessionStorage: al cerrar la
    // pestaña se va sola y no queda nada que herede el siguiente. Sin token de refresco (dura un día).
    if (role === 'class') {
      return createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: false, storageKey: CLASS_AUTH_KEY, storage: window.sessionStorage, detectSessionInUrl: false },
      });
    }
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
    const classDevice = typeof window !== 'undefined' && isClassDevice(window.location.search, window.sessionStorage);
    cached = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      classDevice ? 'class' : 'child',
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
