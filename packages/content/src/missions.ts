import { createRng, type Localized } from '@kalku/exercises';
import { activeEvent, getEvent, type SeasonalEvent } from './events.js';

/**
 * Misiones del día y de la semana (docs/JUEGO-SIN-FIN.md §3, #98).
 *
 * - Salen de la semilla de la fecha (hora de Madrid) y, si hay, del id de la
 *   clase: toda la clase ve las mismas y lo puede comentar al día siguiente.
 * - Solo se cumplen aprendiendo: acertar, ganar combates, rescatar.
 * - Ninguna depende del tiempo de respuesta (regla 3) ni castiga fallar o no
 *   jugar un día (regla 2): no hay rachas que se pierdan.
 * - Premio: Cifras (cosméticas). Nunca XP: la XP solo sale de acertar.
 */
export type MissionKind =
  /** Acertar cuentas (cualquiera). */
  | 'answers'
  /** Acertar sumas. */
  | 'additions'
  /** Acertar restas. */
  | 'subtractions'
  /** Acertar con el Rayo (ejercicio de reto). */
  | 'strong'
  /** Ganar combates. */
  | 'battles'
  /** Rescatar criaturas. */
  | 'rescues'
  /** Ganar a la invitada del evento de temporada (solo mientras dura, `events.ts`). */
  | 'guests';

export interface MissionTemplate {
  kind: MissionKind;
  /** Cantidades posibles en las del día y en la de la semana. */
  daily: readonly number[];
  weekly: readonly number[];
  /** Con `{n}`. */
  text: Localized;
}

export interface Mission {
  id: string;
  kind: MissionKind;
  need: number;
  reward: number;
  weekly: boolean;
}

export interface MissionsState {
  /** Día (AAAA-MM-DD) y semana (AAAA-MM-DD del lunes) a los que se refiere `progress`. */
  day: string;
  week: string;
  /** Cuánto lleva en cada misión (por id). */
  progress: Record<string, number>;
  /** Misiones cuyo premio ya se ha dado. */
  claimed: string[];
}

export type MissionEvent =
  | { type: 'answer'; correct: boolean; operator: '+' | '-'; strong: boolean }
  | { type: 'battleWon'; rescued: boolean; guest?: boolean };

const t = (es: string, ca: string): Localized => ({ es, ca });

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  { kind: 'answers', daily: [8, 10, 12], weekly: [40, 50], text: t('Acierta {n} cuentas', 'Encerta {n} comptes') },
  { kind: 'additions', daily: [5, 6, 8], weekly: [25], text: t('Acierta {n} sumas', 'Encerta {n} sumes') },
  { kind: 'subtractions', daily: [5, 6, 8], weekly: [25], text: t('Acierta {n} restas', 'Encerta {n} restes') },
  { kind: 'strong', daily: [2, 3], weekly: [10], text: t('Acierta {n} Rayos', 'Encerta {n} Llamps') },
  { kind: 'battles', daily: [2, 3], weekly: [10, 12], text: t('Devuelve la chispa a {n} criaturas', 'Torna l’espurna a {n} criatures') },
  { kind: 'rescues', daily: [1, 2], weekly: [5], text: t('Rescata {n} criaturas', 'Rescata {n} criatures') },
];

/** Fecha AAAA-MM-DD en Madrid (el día escolar de los niños, esté donde esté el servidor). */
export function dateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Lunes de la semana de `day` (AAAA-MM-DD). */
export function weekKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const back = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

/** Semilla estable a partir de un texto (FNV-1a de 32 bits). */
export function textSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Las 3 del día y la de la semana. Misma fecha y misma clase = mismas misiones.
 * Durante un evento de temporada se añade su misión (`event`, por defecto el de ese día).
 */
export function missionsFor(day: string, classId: string | null = null, event: SeasonalEvent | undefined = activeEvent(day)): Mission[] {
  const rng = createRng(textSeed(`dia:${day}:${classId ?? ''}`));
  const pool = [...MISSION_TEMPLATES];
  const daily: Mission[] = [];
  for (let i = 0; i < 3; i++) {
    const index = rng.int(0, pool.length - 1);
    const template = pool.splice(index, 1)[0];
    if (!template) break;
    const need = rng.pick(template.daily);
    daily.push({ id: `${day}:${template.kind}`, kind: template.kind, need, reward: 15 + need * 2, weekly: false });
  }
  const week = weekKey(day);
  const wrng = createRng(textSeed(`semana:${week}:${classId ?? ''}`));
  const wt = wrng.pick(MISSION_TEMPLATES);
  const wneed = wrng.pick(wt.weekly);
  const weekly: Mission = { id: `${week}:${wt.kind}:semana`, kind: wt.kind, need: wneed, reward: 100, weekly: true };
  if (!event) return [...daily, weekly];
  const special: Mission = { id: `${day}:guests:${event.id}`, kind: 'guests', need: event.mission.need, reward: 30, weekly: false };
  return [...daily, special, weekly];
}

export function missionText(mission: Mission, locale: 'es' | 'ca'): string {
  const text = mission.kind === 'guests' ? getEvent(mission.id.split(':')[2] ?? '')?.mission.text : MISSION_TEMPLATES.find((m) => m.kind === mission.kind)?.text;
  return (text?.[locale] ?? '').split('{n}').join(String(mission.need));
}

function counts(kind: MissionKind, event: MissionEvent): boolean {
  if (event.type === 'answer') {
    if (!event.correct) return false;
    if (kind === 'answers') return true;
    if (kind === 'additions') return event.operator === '+';
    if (kind === 'subtractions') return event.operator === '-';
    if (kind === 'strong') return event.strong;
    return false;
  }
  if (kind === 'battles') return true;
  if (kind === 'rescues') return event.rescued;
  if (kind === 'guests') return event.guest === true;
  return false;
}

/** Estado al día: si ha cambiado el día o la semana, empieza de cero lo que toca (sin perder premios ya dados). */
export function refreshMissions(state: MissionsState | null, day: string): MissionsState {
  const week = weekKey(day);
  if (!state) return { day, week, progress: {}, claimed: [] };
  const keep = (id: string): boolean => id.startsWith(`${day}:`) || id.startsWith(`${week}:`);
  const progress = Object.fromEntries(Object.entries(state.progress).filter(([id]) => keep(id)));
  return { day, week, progress, claimed: state.claimed.filter(keep) };
}

/**
 * Aplica un evento a las misiones de hoy. No muta. Devuelve las misiones
 * terminadas ahora (para dar el premio una sola vez).
 */
export function advanceMissions(state: MissionsState, missions: readonly Mission[], event: MissionEvent): { state: MissionsState; completed: Mission[] } {
  const progress = { ...state.progress };
  const claimed = [...state.claimed];
  const completed: Mission[] = [];
  for (const m of missions) {
    if (claimed.includes(m.id) || !counts(m.kind, event)) continue;
    const have = Math.min(m.need, (progress[m.id] ?? 0) + 1);
    progress[m.id] = have;
    if (have >= m.need) {
      claimed.push(m.id);
      completed.push(m);
    }
  }
  return { state: { ...state, progress, claimed }, completed };
}

/** Lee el estado guardado sin fiarse. */
export function parseMissions(raw: unknown): MissionsState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isDay(r.day) || !isDay(r.week)) return null;
  const progress: Record<string, number> = {};
  if (typeof r.progress === 'object' && r.progress !== null) {
    for (const [id, n] of Object.entries(r.progress as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 1000) progress[id] = n;
    }
  }
  const claimed = Array.isArray(r.claimed) ? r.claimed.filter((c): c is string => typeof c === 'string').slice(0, 20) : [];
  return { day: r.day, week: r.week, progress, claimed };
}
