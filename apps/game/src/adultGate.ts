import { createRng } from '@kalku/exercises';

export interface AdultGate {
  a: number;
  b: number;
  answer: number;
}

/**
 * Cuenta para entrar en «Para adultos» (tipo 47 × 6). No es seguridad: solo
 * evita que un niño borre su progreso por error. Con semilla, como todo.
 */
export function createAdultGate(seed: number): AdultGate {
  const rng = createRng(seed);
  const a = 23 + rng.int(23, 79);
  const b = 6 + rng.int(6, 9);
  return { a, b, answer: a * b };
}

export function checkAdultGate(gate: AdultGate, raw: string): boolean {
  const text = raw.trim();
  return /^\d+$/.test(text) && Number(text) === gate.answer;
}
