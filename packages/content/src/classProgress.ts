import { SKILLS, type Locale, type Localized, type SkillId } from '@kalku/exercises';

/**
 * Panel de dominio del docente (#55). Lógica pura: los datos los trae el servidor (totales por
 * alumno y habilidad, y por día) y aquí solo se clasifica. Reglas de producto:
 * - Nada de rankings: el orden es alfabético por apodo, nunca por dominio.
 * - El color nunca va solo: cada tramo lleva icono, nombre y el número.
 * - El docente no ve respuestas sueltas, solo totales.
 */

export type MasteryLevelId = 'none' | 'starting' | 'progressing' | 'good' | 'mastered';

export interface MasteryLevel {
  id: MasteryLevelId;
  /** Dominio mínimo (incluido) del tramo. */
  from: number;
  icon: string;
  name: Localized;
}

/** Tramos de color como datos. `none` = sin empezar (casilla vacía). */
export const MASTERY_LEVELS: readonly MasteryLevel[] = [
  { id: 'starting', from: 0, icon: '◔', name: { es: 'Empezando', ca: 'Començant' } },
  { id: 'progressing', from: 40, icon: '◑', name: { es: 'Avanzando', ca: 'Avançant' } },
  { id: 'good', from: 70, icon: '◕', name: { es: 'Bien', ca: 'Bé' } },
  { id: 'mastered', from: 90, icon: '●', name: { es: 'Dominada', ca: 'Dominada' } },
];

export const NO_LEVEL: MasteryLevel = { id: 'none', from: -1, icon: '·', name: { es: 'Sin empezar', ca: 'Sense començar' } };

/** Tramo de un dominio 0–100; `null` si el alumno aún no ha practicado la habilidad. */
export function masteryLevel(mastery: number | null): MasteryLevel {
  if (mastery === null || Number.isNaN(mastery)) return NO_LEVEL;
  const m = Math.min(100, Math.max(0, mastery));
  let found = MASTERY_LEVELS[0] as MasteryLevel;
  for (const l of MASTERY_LEVELS) if (m >= l.from) found = l;
  return found;
}

/** Acierto mínimo para estar «bien»: el suelo del objetivo del 70–85 %. */
export const LOW_ACCURACY = 0.7;
/** Días seguidos con actividad por debajo del 70 % para marcar a un alumno. */
export const FLAG_DAYS = 3;
/** Un día solo cuenta si tiene al menos tantas respuestas. */
export const FLAG_MIN_ANSWERS = 5;

export interface MasteryRow {
  studentId: string;
  nickname: string;
  /** Nulo: el alumno aún no tiene progreso. */
  skill: SkillId | null;
  mastery: number | null;
  attempts: number | null;
  correct: number | null;
}

export interface DayRow {
  studentId: string;
  /** Fecha `AAAA-MM-DD`. */
  day: string;
  attempts: number;
  correct: number;
}

export interface SkillCell {
  skill: SkillId;
  mastery: number;
  attempts: number;
  correct: number;
  level: MasteryLevel;
}

export interface StudentProgress {
  studentId: string;
  nickname: string;
  cells: Map<SkillId, SkillCell>;
  /** Días con actividad, del más reciente al más antiguo. */
  days: DayRow[];
  flagged: boolean;
}

const SKILL_ORDER = new Map(SKILLS.map((s, i) => [s.id, i] as const));

function compareNickname(a: string, b: string, locale: Locale): number {
  return a.localeCompare(b, locale, { sensitivity: 'base' }) || a.localeCompare(b);
}

/**
 * ¿Lleva `FLAG_DAYS` días seguidos con actividad por debajo del 70 %? Solo cuentan los días con
 * al menos `FLAG_MIN_ANSWERS` respuestas; un día sin jugar (o con pocas) ni cuenta ni rompe la racha.
 */
export function isFlagged(days: readonly DayRow[]): boolean {
  const counted = days.filter((d) => d.attempts >= FLAG_MIN_ANSWERS).sort((a, b) => b.day.localeCompare(a.day));
  if (counted.length < FLAG_DAYS) return false;
  return counted.slice(0, FLAG_DAYS).every((d) => d.correct / d.attempts < LOW_ACCURACY);
}

/** Une los dos listados del servidor en una ficha por alumno, en orden alfabético (nunca por dominio). */
export function buildClassProgress(mastery: readonly MasteryRow[], days: readonly DayRow[], locale: Locale): StudentProgress[] {
  const byId = new Map<string, StudentProgress>();
  for (const r of mastery) {
    let s = byId.get(r.studentId);
    if (!s) byId.set(r.studentId, (s = { studentId: r.studentId, nickname: r.nickname, cells: new Map(), days: [], flagged: false }));
    if (r.skill !== null && r.mastery !== null) {
      s.cells.set(r.skill, { skill: r.skill, mastery: r.mastery, attempts: r.attempts ?? 0, correct: r.correct ?? 0, level: masteryLevel(r.mastery) });
    }
  }
  for (const d of days) byId.get(d.studentId)?.days.push(d);
  for (const s of byId.values()) {
    s.days.sort((a, b) => b.day.localeCompare(a.day));
    s.flagged = isFlagged(s.days);
  }
  return [...byId.values()].sort((a, b) => compareNickname(a.nickname, b.nickname, locale) || a.studentId.localeCompare(b.studentId));
}

/** Habilidades que la clase ha tocado, en orden de currículo: las columnas de la tabla. */
export function classSkills(students: readonly StudentProgress[]): SkillId[] {
  const used = new Set<SkillId>();
  for (const s of students) for (const k of s.cells.keys()) used.add(k);
  return [...used].sort((a, b) => (SKILL_ORDER.get(a) ?? 0) - (SKILL_ORDER.get(b) ?? 0));
}

/** Habilidades en curso: practicadas y todavía no dominadas, en orden de currículo. */
export function skillsInProgress(student: StudentProgress): SkillCell[] {
  return [...student.cells.values()]
    .filter((c) => c.attempts > 0 && c.level.id !== 'mastered')
    .sort((a, b) => (SKILL_ORDER.get(a.skill) ?? 0) - (SKILL_ORDER.get(b.skill) ?? 0));
}

/** Texto de una celda: icono, número y nombre del tramo (el color solo refuerza). */
export function cellLabel(mastery: number | null, locale: Locale): string {
  const level = masteryLevel(mastery);
  return mastery === null ? `${level.icon} ${level.name[locale]}` : `${level.icon} ${Math.round(mastery)} · ${level.name[locale]}`;
}
