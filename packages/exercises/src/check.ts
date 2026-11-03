import type { CheckResult, Exercise } from './types.js';

/**
 * Corrige una respuesta. Acepta espacios y el signo menos tipográfico.
 * Algo que no es un número entero devuelve `invalid`: el juego debe
 * pedir que lo escriba otra vez, sin contarlo como fallo.
 */
export function checkAnswer(exercise: Exercise, input: string | number): CheckResult {
  const value = parseAnswer(input);
  if (value === undefined) return { status: 'invalid' };
  return { status: value === exercise.answer ? 'correct' : 'wrong', value };
}

export function parseAnswer(input: string | number): number | undefined {
  if (typeof input === 'number') return Number.isInteger(input) ? input : undefined;
  const cleaned = input.trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (!/^-?\d{1,4}$/.test(cleaned)) return undefined;
  return Number.parseInt(cleaned, 10);
}
