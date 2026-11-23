import type { Locale } from '@kalku/exercises';

/** Misma clave que `progress.ts`; aquí solo se lee el idioma, sin cargar el juego. */
const STORAGE_KEY = 'kalku:progress';

function asLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null;
  const base = value.toLowerCase().split('-')[0];
  return base === 'es' || base === 'ca' ? base : null;
}

/**
 * Idioma de la página de privacidad: primero el de `?lang=`, luego el ajuste
 * guardado en el juego y, si no hay, el del navegador. Por defecto, castellano.
 */
export function pickPrivacyLocale(query: string, stored: string | null, browserLanguages: readonly string[]): Locale {
  const fromQuery = asLocale(new URLSearchParams(query).get('lang'));
  if (fromQuery) return fromQuery;
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const fromSetting = asLocale((parsed as { locale?: unknown }).locale);
        if (fromSetting) return fromSetting;
      }
    } catch {
      // Guardado corrupto: se ignora y se mira el navegador.
    }
  }
  for (const lang of browserLanguages) {
    const l = asLocale(lang);
    if (l) return l;
  }
  return 'es';
}

export function readStoredProgress(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
