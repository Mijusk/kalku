/**
 * Nivel del personaje. Sube solo acertando (regla 1) y nunca baja (reglas 2 y 3):
 * - La XP solo depende de la dificultad y de si se acertó con ayuda.
 * - La rapidez y la racha NO dan XP: responder despacio da lo mismo.
 * - El nivel no se guarda: se calcula siempre a partir de la XP.
 */

/** XP por acierto = esto × dificultad. */
export const XP_PER_DIFFICULTY = 10;
/** Un acierto con pista o tras un fallo da la mitad, nunca 0. */
export const XP_HELPED_MULTIPLIER = 0.5;

/**
 * Curva en datos: `LEVELS[i]` es la XP acumulada para llegar al nivel `i + 1`.
 * El nivel 1 empieza en 0. Primero 400, 900, 1500, 2300 y luego ~30 % más por nivel,
 * hasta el nivel 30. Se ajusta tocando solo esta tabla.
 */
export const LEVELS: readonly number[] = [
  0, 400, 900, 1500, 2300, 3300, 4600, 6300, 8500, 11400, 15200, 20200, 26700, 35100, 46100, 60400, 79000, 103200, 134700,
  175700, 229000, 298500, 389000, 507000, 660500, 860500, 1121000, 1460000, 1901000, 2475000,
];

export const MAX_LEVEL = LEVELS.length;

export interface XpInput {
  correct: boolean;
  difficulty: number;
  /** Acertó después de una pista o de un fallo. */
  helped: boolean;
}

/** XP de una respuesta. Fallar da 0 (y nunca resta). No hay parámetro de tiempo a propósito. */
export function xpForAnswer(input: XpInput): number {
  if (!input.correct) return 0;
  const base = XP_PER_DIFFICULTY * Math.max(0, input.difficulty);
  return Math.round(input.helped ? base * XP_HELPED_MULTIPLIER : base);
}

/** XP válida: entero ≥ 0 (lo demás, 0). */
export function sanitizeXp(xp: unknown): number {
  return typeof xp === 'number' && Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
}

/** Nivel (1 a `MAX_LEVEL`) que corresponde a una XP. */
export function levelForXp(xp: number): number {
  const total = sanitizeXp(xp);
  let level = 1;
  for (let i = 1; i < LEVELS.length; i++) {
    if (total >= (LEVELS[i] ?? Infinity)) level = i + 1;
    else break;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP ganada dentro del nivel actual. */
  xpInLevel: number;
  /** XP que cuesta pasar al siguiente nivel (0 en el máximo). */
  xpForNext: number;
  /** Lo que falta para el siguiente nivel (0 en el máximo). */
  xpToNext: number;
  /** Fracción 0–1 para la barra (1 en el máximo). */
  fraction: number;
  max: boolean;
}

export function levelProgress(xp: number): LevelProgress {
  const total = sanitizeXp(xp);
  const level = levelForXp(total);
  const start = LEVELS[level - 1] ?? 0;
  const next = LEVELS[level];
  if (next === undefined) return { level, xpInLevel: total - start, xpForNext: 0, xpToNext: 0, fraction: 1, max: true };
  const xpForNext = next - start;
  const xpInLevel = total - start;
  return { level, xpInLevel, xpForNext, xpToNext: next - total, fraction: xpInLevel / xpForNext, max: false };
}
