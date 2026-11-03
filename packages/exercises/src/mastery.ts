import { SKILLS } from './skills.js';
import type { SkillId } from './types.js';

/**
 * Motor de dominio v1 (documento de diseño): cada habilidad tiene un
 * dominio de 0 a 100 que sube y baja con cada respuesta.
 *
 * Interpretación de +8 / +5 / −6 / −3 (ver docs/DECISIONS.md):
 * - +8 acierto a la primera
 * - +5 acierto después de una pista o un fallo
 * - −6 fallo en un ejercicio de su nivel o de repaso
 * - −3 fallo en un ejercicio de reto (arriesgarse se castiga menos)
 */
export const MASTERY_DELTAS = {
  correctFirstTry: 8,
  correctWithHelp: 5,
  wrong: -6,
  wrongChallenge: -3,
} as const;

/** A partir de aquí la habilidad está dominada y da una gema. */
export const MASTERY_THRESHOLD = 80;
/** Mínimo de respuestas para dar una habilidad por dominada (evita rachas de suerte). */
export const MASTERY_MIN_ATTEMPTS = 10;

export interface SkillProgress {
  mastery: number;
  attempts: number;
  correct: number;
}

export type MasteryProfile = Record<SkillId, SkillProgress>;

export type Slot = 'current' | 'review' | 'challenge';

export interface AnswerOutcome {
  correct: boolean;
  /** Si hubo pista o un intento fallido antes de acertar. */
  helped: boolean;
  slot: Slot;
}

export function createProfile(): MasteryProfile {
  const profile = {} as MasteryProfile;
  for (const skill of SKILLS) profile[skill.id] = { mastery: 0, attempts: 0, correct: 0 };
  return profile;
}

export function masteryDelta(outcome: AnswerOutcome): number {
  if (outcome.correct) return outcome.helped ? MASTERY_DELTAS.correctWithHelp : MASTERY_DELTAS.correctFirstTry;
  return outcome.slot === 'challenge' ? MASTERY_DELTAS.wrongChallenge : MASTERY_DELTAS.wrong;
}

/** Devuelve un perfil nuevo; no modifica el original. */
export function applyAnswer(profile: MasteryProfile, skill: SkillId, outcome: AnswerOutcome): MasteryProfile {
  const prev = profile[skill];
  const mastery = clamp(prev.mastery + masteryDelta(outcome), 0, 100);
  return {
    ...profile,
    [skill]: {
      mastery,
      attempts: prev.attempts + 1,
      correct: prev.correct + (outcome.correct ? 1 : 0),
    },
  };
}

export function isMastered(progress: SkillProgress): boolean {
  return progress.mastery >= MASTERY_THRESHOLD && progress.attempts >= MASTERY_MIN_ATTEMPTS;
}

/** Porcentaje de aciertos (0–1). El objetivo del juego es mantenerlo entre 0,70 y 0,85. */
export function accuracy(progress: SkillProgress): number {
  return progress.attempts === 0 ? 0 : progress.correct / progress.attempts;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
