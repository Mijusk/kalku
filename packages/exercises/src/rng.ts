/**
 * Generador de números aleatorios con semilla (mulberry32).
 *
 * Todo lo aleatorio del juego pasa por aquí: ejercicios, selección de
 * habilidad y, más adelante, los mapas generados. Con la misma semilla
 * sale siempre lo mismo, lo que permite tests reproducibles y que todos
 * los niños vean el mismo mundo.
 */
export interface Rng {
  /** Número decimal en [0, 1). */
  next(): number;
  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number;
  /** Elemento al azar de una lista no vacía. */
  pick<T>(items: readonly T[]): T;
  /** true con probabilidad p (0–1). */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rango no válido: [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('pick() con lista vacía');
    return items[int(0, items.length - 1)] as T;
  };

  const chance = (p: number): boolean => next() < p;

  return { next, int, pick, chance };
}

/** Semilla aleatoria para cuando no importa reproducir el resultado. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}
