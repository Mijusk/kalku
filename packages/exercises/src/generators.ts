import type { Rng } from './rng.js';
import { getSkill, skillDifficulty } from './skills.js';
import type { Exercise, ExerciseFormat, Locale, Localized, Operator, SkillId } from './types.js';

/** Operandos de una operación a (op) b = c, antes de elegir el formato. */
interface Operation {
  a: number;
  b: number;
  c: number;
  /** Solo si la habilidad mezcla operaciones (`mixed`). */
  operator?: Operator;
  story?: Localized;
}

const NAMES = ['Ana', 'Leo', 'Marta', 'Pau'] as const;

/** Todos femeninos en las dos lenguas, para que «cuántas» concuerde siempre. */
const THINGS: readonly Localized[] = [
  { es: 'manzanas', ca: 'pomes' },
  { es: 'canicas', ca: 'bales' },
  { es: 'galletas', ca: 'galetes' },
  { es: 'piedras', ca: 'pedres' },
  { es: 'flores', ca: 'flors' },
  { es: 'pegatinas', ca: 'enganxines' },
];

type Template = (name: string, a: number, b: number, thing: Localized) => Localized;

const ADD_STORIES: readonly Template[] = [
  (n, a, b, o) => ({
    es: `${n} tiene ${a} ${o.es} y recibe ${b} más. ¿Cuántas tiene ahora?`,
    ca: `${n} té ${a} ${o.ca} i rep ${b} més. Quantes en té ara?`,
  }),
  (n, a, b, o) => ({
    es: `${n} tiene ${a} ${o.es}. Su abuela le da ${b} más. ¿Cuántas tiene en total?`,
    ca: `${n} té ${a} ${o.ca}. La seva àvia li'n dona ${b} més. Quantes en té en total?`,
  }),
  (_n, a, b, o) => ({
    es: `En una cesta hay ${a} ${o.es} y en otra hay ${b}. ¿Cuántas hay juntas?`,
    ca: `En una cistella hi ha ${a} ${o.ca} i en una altra n'hi ha ${b}. Quantes n'hi ha juntes?`,
  }),
];

const SUB_STORIES: readonly Template[] = [
  (n, a, b, o) => ({
    es: `${n} tiene ${a} ${o.es} y regala ${b}. ¿Cuántas le quedan?`,
    ca: `${n} té ${a} ${o.ca} i en regala ${b}. Quantes li'n queden?`,
  }),
  (n, a, b, o) => ({
    es: `Había ${a} ${o.es} en la mesa y ${n} se lleva ${b}. ¿Cuántas quedan?`,
    ca: `Hi havia ${a} ${o.ca} a la taula i ${n} se n'endú ${b}. Quantes en queden?`,
  }),
  (n, a, b, o) => ({
    es: `${n} tenía ${a} ${o.es} y pierde ${b}. ¿Cuántas le quedan?`,
    ca: `${n} tenia ${a} ${o.ca} i en perd ${b}. Quantes li'n queden?`,
  }),
];

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

  // Problemas con enunciado: suma o resta según el texto. Operandos de 2 en
  // adelante para que el texto siempre diga «2 manzanas», nunca «1 manzanas».
  'word-problems-within-10': (rng) => {
    const name = rng.pick(NAMES);
    const thing = rng.pick(THINGS);
    if (rng.chance(0.5)) {
      const c = rng.int(4, 10);
      const a = rng.int(2, c - 2);
      const b = c - a;
      return { a, b, c, operator: '+', story: rng.pick(ADD_STORIES)(name, a, b, thing) };
    }
    const a = rng.int(3, 10);
    const b = rng.int(2, a - 1);
    return { a, b, c: a - b, operator: '-', story: rng.pick(SUB_STORIES)(name, a, b, thing) };
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
  const skillOperator = getSkill(skill).operator;
  const op = GENERATORS[skill](rng);
  const { a, b, c, story } = op;
  const operator: Operator = skillOperator === 'mixed' ? (op.operator ?? '+') : skillOperator;
  // Los problemas siempre preguntan por el resultado: el niño decide la operación.
  const format: ExerciseFormat = story ? 'result' : (options.format ?? (rng.chance(0.3) ? 'missing' : 'result'));

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
    ...(story ? { story } : {}),
    difficulty,
  };
}

/** Texto del ejercicio con el hueco marcado, por ejemplo «7 + _ = 12». */
export function formatExercise(exercise: Exercise, blank = '_', locale: Locale = 'es'): string {
  if (exercise.story) return exercise.story[locale];
  const show = (key: 'a' | 'b' | 'c') => (exercise.hidden === key ? blank : String(exercise[key]));
  const op = exercise.operator === '-' ? '−' : '+';
  return `${show('a')} ${op} ${show('b')} = ${show('c')}`;
}
