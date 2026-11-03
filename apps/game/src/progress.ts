import { createProfile, SKILL_IDS, type Locale, type MasteryProfile } from '@kalku/exercises';

/**
 * Progreso del jugador.
 *
 * PROVISIONAL (fase 1): se guarda en localStorage del navegador. En la
 * fase 2 pasa a Supabase (UE) y las respuestas se validan en el servidor;
 * localStorage quedará solo como copia para jugar sin conexión.
 */
export interface PlayerProgress {
  version: 1;
  locale: Locale;
  coins: number;
  profile: MasteryProfile;
  /** Habilidades por las que ya se ha dado la gema de dominio. */
  gems: string[];
}

const STORAGE_KEY = 'kalku:progress';

export function defaultProgress(): PlayerProgress {
  return { version: 1, locale: 'es', coins: 0, profile: createProfile(), gems: [] };
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
    return { ...defaultProgress(), ...parsed, profile, gems };
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
