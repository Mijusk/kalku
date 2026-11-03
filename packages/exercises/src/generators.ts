import type { Rng } from './rng.js';
import { getSkill, skillDifficulty } from './skills.js';
import type { Exercise, ExerciseFormat, SkillId } from './types.js';

/** Operandos de una operación a (op) b = c, antes de elegir el formato. */
interface Operation {
  a: number;
  b: number;
  c: number;
}

type OperationGenerator = (rng: Rng) => Operation;

/**
 * Un generador por habilidad. Cada uno garantiza las reglas de su
 * habilidad (por ejemplo, «sin llevar» nunca pasa de la decena).
 * Evitamos el 0 como operando: no enseña nada y aburre.
 */
const GENERATORS: Record<SkillId, OperationGenerator> = {
  'add-within-10': (rng) => {
    const c = rng.int(2, 10);
    const a = rng.int(1, c - 1);
    return { a, b: c - a, c };
  },

  'sub-within-10': (rng) => {
    const a = rng.int(2, 10);
    const b = rng.int(1, a - 1);
    return { a, b, c: a - b };
  },

  // 13 + 4 = 17: las unidades suman 9 como mucho.
  'add-within-20-no-carry': (rng) => {
    const unitsA = rng.int(0, 8);
    const b = rng.int(1, 9 - unitsA);
    const a = 10 + unitsA;
    // A veces el número pequeño va primero: 4 + 13.
    return rng.chance(0.3) ? { a: b, b: a, c: a + b } : { a, b, c: a + b };
  },

  // 17 - 4 = 13: se quita de las unidades sin cruzar la decena.
  'sub-within-20-no-borrow': (rng) => {
    const unitsA = rng.int(1, 9);
    const a = 10 + unitsA;
    const b = rng.int(1, unitsA);
    return { a, b, c: a - b };
  },

  // 8 + 5 = 13: dos números de una cifra que pasan de 10.
  'add-within-20-carry': (rng) => {
    const a = rng.int(2, 9);
    const b = rng.int(11 - a, 9);
    return { a, b, c: a + b };
  },

  // 13 - 5 = 8: hay que cruzar la decena.
  'sub-within-20-borrow': (rng) => {
    const a = rng.int(11, 18);
    const unitsA = a - 10;
    const b = rng.int(unitsA + 1, 9);
    return { a, b, c: a - b };
  },
};

export function hasGenerator(skill: SkillId): boolean {
  return skill in GENERATORS;
}

export interface GenerateOptions {
  /** Si no se indica, 70 % `result` y 30 % `missing`. */
  format?: ExerciseFormat;
}

let counter = 0;

export function generateExercise(skill: SkillId, rng: Rng, options: GenerateOptions = {}): Exercise {
  const { operator } = getSkill(skill);
  const { a, b, c } = GENERATORS[skill](rng);
  const format: ExerciseFormat = options.format ?? (rng.chance(0.3) ? 'missing' : 'result');

  let hidden: Exercise['hidden'] = 'c';
  if (format === 'missing') hidden = rng.chance(0.5) ? 'b' : 'a';

  const answer = hidden === 'a' ? a : hidden === 'b' ? b : c;
  // Completar el hueco cuesta un poco más que calcular el resultado.
  const difficulty = skillDifficulty(skill) + (format === 'missing' ? 0.5 : 0);

  counter += 1;
  return {
    id: `${skill}:${a}${operator}${b}:${hidden}:${counter}`,
    skill,
    format,
    operator,
    a,
    b,
    c,
    hidden,
    answer,
    difficulty,
  };
}

/** Texto del ejercicio con el hueco marcado, por ejemplo «7 + _ = 12». */
export function formatExercise(exercise: Exercise, blank = '_'): string {
  const show = (key: 'a' | 'b' | 'c') => (exercise.hidden === key ? blank : String(exercise[key]));
  const op = exercise.operator === '-' ? '−' : '+';
  return `${show('a')} ${op} ${show('b')} = ${show('c')}`;
}
