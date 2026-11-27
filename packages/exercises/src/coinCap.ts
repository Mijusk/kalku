import { isMastered, type SkillProgress, type Slot } from './mastery.js';

/**
 * Límite diario de Cifras (#13, docs/DECISIONS.md del 27 nov 2026).
 *
 * Repasar lo que ya se domina sigue dando dominio y experiencia, pero solo da
 * Cifras hasta un tope al día, para que no compense repetir lo fácil. Practicar
 * lo que cuesta (reto o poco dominio) da un pequeño extra. Nunca se quitan
 * Cifras ya ganadas: el tope solo deja de sumar.
 */
export const COIN_CAP = {
  /** Cifras al día que pueden salir de habilidades ya dominadas. */
  masteredPerDay: 150,
  /** Extra (fracción) por un ejercicio de reto o de una habilidad con poco dominio. */
  effortBonus: 0.25,
  /** Por debajo de este dominio, la habilidad «cuesta» y da el extra. */
  lowMastery: 40,
} as const;

/** Cuántas Cifras de habilidades dominadas lleva hoy. */
export interface CoinDay {
  /** AAAA-MM-DD (hora de Madrid, la pone quien llama). */
  day: string;
  mastered: number;
}

export interface CapInput {
  /** Cifras que daría el ejercicio sin límite (`scoreAnswer().total`). */
  coins: number;
  /** El dominio de la habilidad ANTES de responder. */
  skill: SkillProgress;
  slot: Slot;
}

export interface CapResult {
  /** Cifras que se suman de verdad (nunca negativas). */
  coins: number;
  state: CoinDay;
  /** true si el tope ha dejado parte (o todo) sin dar. */
  capped: boolean;
  /** Cifras de extra por esfuerzo, ya incluidas en `coins`. */
  bonus: number;
}

/** Aplica el tope del día. No muta `state`; con otro día, el contador empieza de cero. */
export function capCoins(input: CapInput, state: CoinDay | null, day: string): CapResult {
  const today: CoinDay = state?.day === day ? { ...state } : { day, mastered: 0 };
  const coins = Math.max(0, Math.round(input.coins));
  if (coins === 0) return { coins: 0, state: today, capped: false, bonus: 0 };
  if (isMastered(input.skill) && input.slot !== 'challenge') {
    const left = Math.max(0, COIN_CAP.masteredPerDay - today.mastered);
    const given = Math.min(coins, left);
    return { coins: given, state: { day, mastered: today.mastered + given }, capped: given < coins, bonus: 0 };
  }
  const effort = input.slot === 'challenge' || input.skill.mastery < COIN_CAP.lowMastery;
  const bonus = effort ? Math.round(coins * COIN_CAP.effortBonus) : 0;
  return { coins: coins + bonus, state: today, capped: false, bonus };
}

/** Lee el contador guardado (o `null` si no vale). */
export function parseCoinDay(raw: unknown): CoinDay | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) return null;
  const mastered = typeof r.mastered === 'number' && Number.isFinite(r.mastered) ? Math.max(0, Math.floor(r.mastered)) : 0;
  return { day: r.day, mastered };
}
