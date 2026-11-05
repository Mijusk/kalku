import { createProfile, MASTERY_MIN_ATTEMPTS, MASTERY_THRESHOLD, type MasteryProfile } from './mastery.js';
import { SKILLS } from './skills.js';
import type { SkillId } from './types.js';

/**
 * Prueba de nivel (#36): propone ejercicios que suben por el currículo al
 * acertar y bajan al fallar, y al terminar da un dominio inicial a cada
 * habilidad. Es lógica pura: no sabe nada del tiempo de respuesta (ser
 * lento nunca cambia el resultado) y nunca quita dominio a nadie.
 */

/** Ejercicios normales de la prueba. */
export const PLACEMENT_LENGTH = 10;
/** Tope duro: nunca se pasa de aquí. */
export const PLACEMENT_MAX = 12;
/** Dominio de la habilidad del nivel detectado. */
export const PLACEMENT_LEVEL_MASTERY = 40;
/** Intentos «de prueba» de las habilidades por debajo del nivel (los mismos que pide el dominio). */
export const PLACEMENT_BELOW_ATTEMPTS = MASTERY_MIN_ATTEMPTS;

export interface PlacementStep {
  /** Posición de la habilidad en `SKILLS`. */
  level: number;
  correct: boolean;
}

export interface PlacementState {
  asked: number;
  /** Posición (en `SKILLS`) de la habilidad del próximo ejercicio. */
  level: number;
  history: readonly PlacementStep[];
}

const LAST_LEVEL = SKILLS.length - 1;

/** Empieza a mitad del currículo, no en la primera habilidad. */
export function startPlacement(): PlacementState {
  return { asked: 0, level: Math.floor(LAST_LEVEL / 2), history: [] };
}

/** Ya está claro el nivel: rebota entre dos vecinas, o toca techo o suelo dos veces seguidas. */
function isClear(history: readonly PlacementStep[]): boolean {
  const [a, b] = history.slice(-2);
  if (a && b && a.level === b.level) {
    if (a.level === LAST_LEVEL && a.correct && b.correct) return true;
    if (a.level === 0 && !a.correct && !b.correct) return true;
  }
  // Acierta en `n`, falla en `n + 1`, y otra vez lo mismo.
  const last4 = history.slice(-4);
  if (last4.length < 4) return false;
  const [p, q, r, s] = last4 as [PlacementStep, PlacementStep, PlacementStep, PlacementStep];
  return (
    p.level === r.level &&
    q.level === s.level &&
    q.level === p.level + 1 &&
    p.correct &&
    r.correct &&
    !q.correct &&
    !s.correct
  );
}

export function isPlacementDone(state: PlacementState): boolean {
  return state.asked >= PLACEMENT_LENGTH || state.asked >= PLACEMENT_MAX || isClear(state.history);
}

/** Habilidad del siguiente ejercicio, o `undefined` si la prueba ha terminado. */
export function nextPlacementSkill(state: PlacementState): SkillId | undefined {
  if (isPlacementDone(state)) return undefined;
  return SKILLS[state.level]?.id;
}

/** Estado nuevo tras responder; no muta el anterior. */
export function recordPlacement(state: PlacementState, correct: boolean): PlacementState {
  const step: PlacementStep = { level: state.level, correct };
  const level = Math.min(LAST_LEVEL, Math.max(0, state.level + (correct ? 1 : -1)));
  return { asked: state.asked + 1, level, history: [...state.history, step] };
}

/**
 * Nivel detectado: la habilidad más alta en la que se acertó más de lo
 * que se falló. -1 si no hay ninguna.
 */
function knownLevel(state: PlacementState): number {
  let known = -1;
  for (let level = 0; level <= LAST_LEVEL; level++) {
    const steps = state.history.filter((s) => s.level === level);
    const right = steps.filter((s) => s.correct).length;
    if (right > steps.length - right) known = level;
  }
  return known;
}

/**
 * Dominio inicial por habilidad: por debajo del nivel detectado, 80 con
 * 10 intentos «de prueba»; el nivel, 40; por encima, 0. Si no se acertó
 * nada, todo queda en 0.
 */
export function placementResult(state: PlacementState): MasteryProfile {
  const result = createProfile();
  const known = knownLevel(state);
  if (known < 0) return result;
  const detected = Math.min(LAST_LEVEL, known + 1);
  SKILLS.forEach((skill, index) => {
    if (index < detected) {
      result[skill.id] = {
        mastery: MASTERY_THRESHOLD,
        attempts: PLACEMENT_BELOW_ATTEMPTS,
        correct: PLACEMENT_BELOW_ATTEMPTS,
      };
    } else if (index === detected) {
      result[skill.id] = { mastery: PLACEMENT_LEVEL_MASTERY, attempts: 0, correct: 0 };
    }
  });
  return result;
}

/**
 * Aplica el resultado al perfil y devuelve uno nuevo. Nunca baja nada:
 * se queda con lo más alto de cada campo, siempre entre 0 y 100.
 */
export function applyPlacement(profile: MasteryProfile, result: MasteryProfile): MasteryProfile {
  const next = { ...profile };
  for (const skill of SKILLS) {
    const prev = profile[skill.id];
    const add = result[skill.id];
    next[skill.id] = {
      mastery: Math.min(100, Math.max(0, Math.max(prev.mastery, add.mastery))),
      attempts: Math.max(prev.attempts, add.attempts),
      correct: Math.max(prev.correct, add.correct),
    };
  }
  return next;
}
