import { parseCollection, parseEncounters, type Collection, type EncounterCounts } from '@kalku/content';
import { createProfile, SKILL_IDS, type Locale, type MasteryProfile, type SkillId, type SkillProgress } from '@kalku/exercises';

/**
 * Progreso del jugador.
 *
 * Fuente de verdad: Supabase (UE), ligado al niño (cuenta anónima, ver
 * `sync.ts`). localStorage es solo la copia local para jugar sin conexión.
 */
export interface Settings {
  /** Con false no se mide el tiempo ni hay bonus de rapidez (los puntos no bajan). */
  timed: boolean;
  textSize: 'normal' | 'large';
  /** Lee el ejercicio en voz alta al aparecer (si el navegador tiene voz en el idioma). */
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
  /** La prueba de nivel inicial ya se hizo (o se saltó). Solo sale la primera vez. */
  placementDone: boolean;
  /** Criaturas rescatadas (id y fecha). Solo para coleccionar: no da ventaja en el combate. */
  collection: Collection;
}

const STORAGE_KEY = 'kalku:progress';

export function defaultProgress(): PlayerProgress {
  return {
    version: 1,
    locale: 'es',
    coins: 0,
    profile: createProfile(),
    gems: [],
    settings: { ...DEFAULT_SETTINGS },
    encounters: {},
    placementDone: false,
    collection: [],
  };
}

/** Valida datos de fuera (localStorage o servidor): completa lo que falte e ignora lo inválido. */
export function parseProgress(raw: unknown): PlayerProgress {
  if (typeof raw !== 'object' || raw === null) return defaultProgress();
  const parsed = raw as Partial<PlayerProgress>;
  if (parsed.version !== 1) return defaultProgress();
  // Añade habilidades nuevas que no existían cuando se guardó.
  const profile = { ...createProfile(), ...(typeof parsed.profile === 'object' ? parsed.profile : {}) };
  for (const id of SKILL_IDS) profile[id] = sanitizeSkill(profile[id]);
  // Datos guardados a mano o corruptos: solo se aceptan textos.
  const gems = Array.isArray(parsed.gems) ? parsed.gems.filter((g): g is string => typeof g === 'string') : [];
  const locale: Locale = parsed.locale === 'ca' ? 'ca' : 'es';
  // Un guardado antiguo con intentos cuenta como hecho: no se molesta a quien ya juega.
  const placementDone = typeof parsed.placementDone === 'boolean' ? parsed.placementDone : hasAttempts(profile);
  const coins = typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? Math.max(0, parsed.coins) : 0;
  return { ...defaultProgress(), ...parsed, locale, coins, profile, gems, settings: parseSettings(parsed.settings), placementDone, encounters: parseEncounters(parsed.encounters), collection: parseCollection(parsed.collection) };
}

/** Dominio entre 0 y 100, intentos enteros ≥ 0 y aciertos ≤ intentos (lo mismo que exige la base de datos). */
function sanitizeSkill(raw: unknown): SkillProgress {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const attempts = Math.max(0, Math.floor(num(r.attempts)));
  const correct = Math.min(attempts, Math.max(0, Math.floor(num(r.correct))));
  return { mastery: Math.min(100, Math.max(0, num(r.mastery))), attempts, correct };
}

export function hasAttempts(profile: MasteryProfile): boolean {
  return SKILL_IDS.some((id) => profile[id].attempts > 0);
}

/** Guardado local, sin pasar por el servidor. Devuelve `null` si no hay nada guardado. */
export function loadLocalProgress(): PlayerProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function loadProgress(): PlayerProgress {
  return loadLocalProgress() ?? defaultProgress();
}

/** Lo que se sube a `children.extra`: todo menos el dominio, que va en `progress`. Sin datos personales. */
export interface ExtraData {
  locale: Locale;
  coins: number;
  gems: string[];
  settings: Settings;
  encounters: EncounterCounts;
  placementDone: boolean;
  collection: Collection;
}

export interface ProgressRow {
  skill: SkillId;
  mastery: number;
  attempts: number;
  correct: number;
}

export function toServerRows(progress: PlayerProgress): { extra: ExtraData; rows: ProgressRow[] } {
  const { profile, version: _version, ...extra } = progress;
  const rows = SKILL_IDS.map((skill) => ({ skill, ...sanitizeSkill(profile[skill]) }));
  return { extra, rows };
}

/** Inversa de `toServerRows`. Ignora habilidades desconocidas y datos corruptos. */
export function fromServerRows(extra: unknown, rows: readonly { skill: string; mastery: unknown; attempts: unknown; correct: unknown }[]): PlayerProgress {
  const profile = createProfile();
  for (const row of rows) {
    if ((SKILL_IDS as readonly string[]).includes(row.skill)) {
      // La base devuelve `numeric` como número o como texto según el cliente.
      profile[row.skill as SkillId] = sanitizeSkill({ mastery: Number(row.mastery), attempts: Number(row.attempts), correct: Number(row.correct) });
    }
  }
  const e = typeof extra === 'object' && extra !== null && !Array.isArray(extra) ? extra : {};
  return parseProgress({ ...e, version: 1, profile });
}

type SaveListener = (progress: PlayerProgress) => void;
let saveListener: SaveListener | undefined;

/** `sync` se registra aquí para enterarse de cada guardado sin que este fichero dependa de él. */
export function onProgressSaved(listener: SaveListener | undefined): void {
  saveListener = listener;
}

/** Guarda la copia local (también tras bajar del servidor, para jugar sin conexión). */
export function writeLocalProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Modo privado o almacenamiento lleno: el juego sigue, solo no guarda.
  }
}

export function saveProgress(progress: PlayerProgress): void {
  writeLocalProgress(progress);
  saveListener?.(progress);
}
