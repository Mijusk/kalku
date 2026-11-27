import { activeEvent, dateKey, getEvent, type SeasonalEvent } from '@kalku/content';

/** Clave del evento forzado desde el panel de desarrollo (solo existe con __DEV_TOOLS__). */
export const DEV_EVENT_KEY = 'kalku:dev-evento';

/**
 * El evento de temporada de hoy (hora de Madrid), o undefined. En local y en
 * las vistas previas el panel DEV puede forzar uno para probarlo; en la web
 * publicada esa parte ni existe.
 */
export function currentEvent(now: Date = new Date()): SeasonalEvent | undefined {
  if (__DEV_TOOLS__) {
    let forced: string | null = null;
    try {
      forced = localStorage.getItem(DEV_EVENT_KEY);
    } catch {
      forced = null;
    }
    if (forced === 'ninguno') return undefined;
    if (forced) return getEvent(forced) ?? activeEvent(dateKey(now));
  }
  return activeEvent(dateKey(now));
}
