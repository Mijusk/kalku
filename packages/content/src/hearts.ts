import type { Band } from './story/scenes.js';

/**
 * Corazones del combate (27 nov 2026, petición de Luis: que fallar tenga
 * consecuencias y el juego tenga un toque de dificultad).
 *
 * - Si fallas una cuenta, la criatura te ataca y pierdes un corazón. Luego
 *   llegan la pista y otra oportunidad, como siempre: los siguientes intentos
 *   de la misma cuenta ya no quitan corazones.
 * - Sin corazones, la criatura se escapa: ese combate no da victoria ni
 *   rescate. **No se pierde nada de lo ganado** (Cifras, XP, dominio,
 *   colección): la regla 2 se mantiene.
 * - Escudo (comodín): cada 3 aciertos seguidos ganas uno, como mucho uno a la
 *   vez. Para el siguiente golpe.
 * - Combate perfecto (28 nov): ganar sin perder ningún corazón da unas
 *   Cifras de más. Se gana solo acertando; nunca se resta nada.
 * - Si pierdes dos combates seguidos, el siguiente empieza con un corazón más
 *   (sin avisar), para que nadie se quede atascado.
 */
export const HEARTS = {
  /** Corazones por combate según el inicio de la historia (5–8 años y 8–12 años). */
  base: { young: 4, older: 3 } as Readonly<Record<Band, number>>,
  /** Contra el jefe el combate es más largo (tres fases): un corazón más. */
  bossExtra: 1,
  /** Aciertos seguidos para ganar un escudo. */
  shieldStreak: 3,
  /** Combates perdidos seguidos a partir de los que se da un corazón de más. */
  comebackAfter: 2,
  /** Cifras extra por ganar sin perder ningún corazón (el escudo no cuenta como perder). */
  perfectBonus: { normal: 10, boss: 25 },
} as const;

export interface HeartsState {
  readonly hearts: number;
  readonly max: number;
  readonly shield: boolean;
  /** Aciertos seguidos (para el escudo). */
  readonly streak: number;
}

/** Corazones al empezar un combate. */
export function startHearts(band: Band, boss: boolean, lossStreak: number): HeartsState {
  const max = HEARTS.base[band] + (boss ? HEARTS.bossExtra : 0) + (lossStreak >= HEARTS.comebackAfter ? 1 : 0);
  return { hearts: max, max, shield: false, streak: 0 };
}

export type HitResult = { readonly state: HeartsState; readonly blocked: boolean };

/** La criatura ataca tras un fallo: el escudo lo para; si no, se pierde un corazón (nunca por debajo de 0). */
export function takeHit(state: HeartsState): HitResult {
  if (state.shield) return { state: { ...state, shield: false, streak: 0 }, blocked: true };
  return { state: { ...state, hearts: Math.max(0, state.hearts - 1), streak: 0 }, blocked: false };
}

/** Un acierto: suma a la racha y, cada `shieldStreak` seguidos, da un escudo si no lo tiene. */
export function scoreHit(state: HeartsState): { readonly state: HeartsState; readonly gotShield: boolean } {
  const streak = state.streak + 1;
  const gotShield = !state.shield && streak % HEARTS.shieldStreak === 0;
  return { state: { ...state, streak, shield: state.shield || gotShield }, gotShield };
}

/** ¿Se ha quedado sin corazones? Entonces la criatura se escapa. */
export function outOfHearts(state: HeartsState): boolean {
  return state.hearts <= 0;
}

/** ¿Ha ganado sin perder ningún corazón? */
export function isPerfect(state: HeartsState): boolean {
  return state.hearts >= state.max;
}

/** Cifras extra por un combate perfecto. */
export function perfectBonus(boss: boolean): number {
  return boss ? HEARTS.perfectBonus.boss : HEARTS.perfectBonus.normal;
}
