import { parseEncounters, type EncounterCounts } from '@kalku/content';
import { createProfile, SKILL_IDS, type Locale, type MasteryProfile } from '@kalku/exercises';

/**
 * Progreso del jugador.
 *
 * PROVISIONAL (fase 1): se guarda en localStorage del navegador. En la
 * fase 2 pasa a Supabase (UE) y las respuestas se validan en el servidor;
 * localStorage quedará solo como copia para jugar sin conexión.
 */
export interface Settings {
  /** Con false no se mide el tiempo ni hay bonus de rapidez (los puntos no bajan). */
  timed: boolean;
  textSize: 'normal' | 'large';
  /** Lectura en voz alta. De momento solo se guarda; la voz llega en otra tarea. */
  autoVoice: boolean;
}

export const DEFAULT_SETTINGS: Settings = { timed: true, textSize: 'normal', autoVoice: false };

/** Completa con valores por defecto e ignora lo que no sea válido. */
export function parseSettings(raw: unknown): Settings {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    timed: typeof r.timed === 'boolean' ? r.timed : DEFAULT_SETTINGS.timed,
    textSize: r.textSize === 'large' || r.textSize === 'normal' ? r.textSize : DEFAULT_SETTINGS.textSize,
    autoVoice: typeof r.autoVoice === 'boolean' ? r.autoVoice : DEFAULT_SETTINGS.autoVoice,
  };
}

export function applyTextSize(settings: Settings): void {
  document.documentElement.dataset.text = settings.textSize;
}

export interface PlayerProgress {
  version: 1;
  locale: Locale;
  coins: number;
  profile: MasteryProfile;
  /** Habilidades por las que ya se ha dado la gema de dominio. */
  gems: string[];
  settings: Settings;
  /** Encuentros por familia de criatura (para retirar el cartel de debilidad). */
  encounters: EncounterCounts;
}

const STORAGE_KEY = 'kalku:progress';

export function defaultProgress(): PlayerProgress {
  return { version: 1, locale: 'es', coins: 0, profile: createProfile(), gems: [], settings: { ...DEFAULT_SETTINGS }, encounters: {} };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    if (parsed.version !== 1) return defaultProgress();
    // Añade habilidades nuevas que no existían cuando se guardó.
    const profile = { ...createProfile(), ...parsed.profile };
    for (const id of SKILL_IDS) profile[id] ??= createProfile()[id];
    // Datos guardados a mano o corruptos: solo se aceptan textos.
    const gems = Array.isArray(parsed.gems) ? parsed.gems.filter((g): g is string => typeof g === 'string') : [];
    const locale: Locale = parsed.locale === 'ca' ? 'ca' : 'es';
    return { ...defaultProgress(), ...parsed, locale, profile, gems, settings: parseSettings(parsed.settings), encounters: parseEncounters(parsed.encounters) };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Modo privado o almacenamiento lleno: el juego sigue, solo no guarda.
  }
}
