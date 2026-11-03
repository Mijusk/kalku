/**
 * Puntos (Cifras) por ejercicio, según el documento de diseño:
 * - Base por acierto, multiplicada por la dificultad.
 * - Bonus por racha de aciertos.
 * - Bonus moderado por rapidez, con tope: rápido suma, lento NUNCA resta.
 * - Fallar no quita monedas; acertar tras una pista da menos puntos.
 */
export const SCORING = {
  basePoints: 10,
  /** Bonus por cada acierto seguido, hasta `maxStreakBonus`. */
  streakStep: 0.1,
  maxStreakBonus: 0.5,
  /** Por debajo de este tiempo se cobra el bonus de rapidez completo. */
  fastMs: 5_000,
  /** Por encima de este tiempo no hay bonus de rapidez (pero tampoco penalización). */
  slowMs: 20_000,
  maxSpeedBonus: 0.3,
  /** Multiplicador si se acertó después de una pista o un fallo. */
  helpedMultiplier: 0.5,
} as const;

export interface ScoreInput {
  correct: boolean;
  difficulty: number;
  /** Aciertos seguidos ANTES de este ejercicio. */
  streak: number;
  helped: boolean;
  /** Tiempo de respuesta. Sin tiempo (accesibilidad), no hay bonus de rapidez. */
  elapsedMs?: number;
}

export interface ScoreBreakdown {
  total: number;
  base: number;
  streakBonus: number;
  speedBonus: number;
}

export function scoreAnswer(input: ScoreInput): ScoreBreakdown {
  if (!input.correct) return { total: 0, base: 0, streakBonus: 0, speedBonus: 0 };

  const base = SCORING.basePoints * input.difficulty * (input.helped ? SCORING.helpedMultiplier : 1);
  const streakBonus = base * Math.min(SCORING.maxStreakBonus, input.streak * SCORING.streakStep);
  const speedBonus = input.helped || input.elapsedMs === undefined ? 0 : base * speedFactor(input.elapsedMs);

  const total = Math.round(base + streakBonus + speedBonus);
  return { total, base: Math.round(base), streakBonus: Math.round(streakBonus), speedBonus: Math.round(speedBonus) };
}

/** Fracción de bonus: el máximo si es rápido, 0 si es lento, lineal entre medias. Nunca negativa. */
function speedFactor(ms: number): number {
  if (ms <= SCORING.fastMs) return SCORING.maxSpeedBonus;
  if (ms >= SCORING.slowMs) return 0;
  return SCORING.maxSpeedBonus * (1 - (ms - SCORING.fastMs) / (SCORING.slowMs - SCORING.fastMs));
}
