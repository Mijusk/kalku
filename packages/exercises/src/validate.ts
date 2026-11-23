import { checkAnswer, parseAnswer } from './check.js';
import { generateExercise } from './generators.js';
import { applyAnswer, type MasteryProfile, type Slot } from './mastery.js';
import { isPlacementDone, nextPlacementSkill, recordPlacement, startPlacement, applyPlacement, placementResult, PLACEMENT_MAX } from './placement.js';
import { createRng } from './rng.js';
import { SKILL_IDS } from './skills.js';
import type { Exercise, SkillId } from './types.js';

/**
 * Validación de respuestas en el servidor (#46).
 *
 * El cliente solo cuenta qué ejercicio le salió (habilidad + semilla) y qué
 * respondió. Aquí se vuelve a generar el ejercicio desde la semilla, se corrige
 * y se aplica el dominio con la misma lógica que el juego. Es lógica pura: la
 * Edge Function solo lee el perfil, llama aquí y guarda el resultado.
 *
 * Reglas de producto que se mantienen: fallar nunca baja de 0 ni quita intentos
 * (lo garantiza `applyAnswer`) y el tiempo de respuesta ni se envía ni se usa,
 * así que ser lento nunca resta.
 */

/** Semilla en texto: un entero de 32 bits sin signo, escrito de una única manera. */
export const SEED_MAX_LENGTH = 10;

/** Los operandos que el cliente vio. Si no coinciden con los regenerados, se rechaza. */
export interface ExerciseClaim {
  a: number;
  b: number;
  c: number;
  hidden: Exercise['hidden'];
}

export interface AnswerRequest {
  skill: SkillId;
  seed: string;
  /** Lo último que respondió el niño (se corrige aquí, no se fía de «acertó»). */
  given: number;
  exercise: ExerciseClaim;
  /** Declarado por el cliente: hubo pista o un fallo antes de acertar. */
  helped: boolean;
  slot: Slot;
  hintsUsed: 0 | 1 | 2 | 3;
}

export interface PlacementAnswer {
  skill: SkillId;
  seed: string;
  given: number;
  exercise: ExerciseClaim;
  helped: boolean;
  hintsUsed: 0 | 1 | 2 | 3;
}

/** Lo que se guarda en la tabla `answers`. */
export interface AnswerRecord {
  skill: SkillId;
  seed: string;
  given: number;
  correct: boolean;
  hintsUsed: number;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ValidationOk {
  ok: true;
  profile: MasteryProfile;
  records: AnswerRecord[];
  /** Habilidades cuyo dominio ha cambiado (para devolverlas al juego). */
  changed: SkillId[];
}
export type Validation = ValidationOk | { ok: false; error: string };

const SLOTS: readonly Slot[] = ['current', 'review', 'challenge'];
const HIDDEN = ['a', 'b', 'c'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseSkill(v: unknown): SkillId | undefined {
  return typeof v === 'string' && (SKILL_IDS as readonly string[]).includes(v) ? (v as SkillId) : undefined;
}

/** Entero de 32 bits sin signo, en su forma canónica («5», nunca «05» ni «5.0»): así `unique (child, seed)` no se esquiva. */
export function parseSeed(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length === 0 || v.length > SEED_MAX_LENGTH || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n <= 0xffffffff && String(n) === v ? v : undefined;
}

function parseClaim(v: unknown): ExerciseClaim | undefined {
  if (!isRecord(v)) return undefined;
  const { a, b, c, hidden } = v;
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return undefined;
  if (!(HIDDEN as readonly unknown[]).includes(hidden)) return undefined;
  return { a: a as number, b: b as number, c: c as number, hidden: hidden as ExerciseClaim['hidden'] };
}

function parseHints(v: unknown): 0 | 1 | 2 | 3 | undefined {
  return v === 0 || v === 1 || v === 2 || v === 3 ? v : undefined;
}

function parseCommon(raw: Record<string, unknown>): Parsed<PlacementAnswer> {
  const skill = parseSkill(raw.skill);
  if (!skill) return { ok: false, error: 'skill' };
  const seed = parseSeed(raw.seed);
  if (seed === undefined) return { ok: false, error: 'seed' };
  const given = typeof raw.given === 'number' ? parseAnswer(raw.given) : undefined;
  if (given === undefined) return { ok: false, error: 'given' };
  const exercise = parseClaim(raw.exercise);
  if (!exercise) return { ok: false, error: 'exercise' };
  if (typeof raw.helped !== 'boolean') return { ok: false, error: 'helped' };
  const hintsUsed = parseHints(raw.hintsUsed);
  if (hintsUsed === undefined) return { ok: false, error: 'hintsUsed' };
  return { ok: true, value: { skill, seed, given, exercise, helped: raw.helped, hintsUsed } };
}

export function parseAnswerRequest(raw: unknown): Parsed<AnswerRequest> {
  if (!isRecord(raw)) return { ok: false, error: 'body' };
  const common = parseCommon(raw);
  if (!common.ok) return common;
  if (!(SLOTS as readonly unknown[]).includes(raw.slot)) return { ok: false, error: 'slot' };
  return { ok: true, value: { ...common.value, slot: raw.slot as Slot } };
}

export function parsePlacementRequest(raw: unknown): Parsed<PlacementAnswer[]> {
  if (!isRecord(raw) || !Array.isArray(raw.answers)) return { ok: false, error: 'body' };
  if (raw.answers.length === 0 || raw.answers.length > PLACEMENT_MAX) return { ok: false, error: 'answers' };
  const out: PlacementAnswer[] = [];
  for (const item of raw.answers) {
    if (!isRecord(item)) return { ok: false, error: 'answers' };
    const parsed = parseCommon(item);
    if (!parsed.ok) return parsed;
    out.push(parsed.value);
  }
  return { ok: true, value: out };
}

/** Regenera el ejercicio desde la semilla; `undefined` si lo que vio el cliente no coincide. */
function regenerate(answer: { skill: SkillId; seed: string; exercise: ExerciseClaim }): Exercise | undefined {
  const exercise = generateExercise(answer.skill, createRng(Number(answer.seed)));
  const c = answer.exercise;
  return exercise.a === c.a && exercise.b === c.b && exercise.c === c.c && exercise.hidden === c.hidden ? exercise : undefined;
}

/** Una respuesta del juego: corrige y aplica `applyAnswer`. No muta el perfil. */
export function validateAnswer(profile: MasteryProfile, request: AnswerRequest): Validation {
  const exercise = regenerate(request);
  if (!exercise) return { ok: false, error: 'exercise-mismatch' };
  const correct = checkAnswer(exercise, request.given).status === 'correct';
  const next = applyAnswer(profile, request.skill, { correct, helped: request.helped, slot: request.slot });
  return {
    ok: true,
    profile: next,
    records: [{ skill: request.skill, seed: request.seed, given: request.given, correct, hintsUsed: request.hintsUsed }],
    changed: [request.skill],
  };
}

/**
 * La prueba de nivel entera: se repite desde el principio con las respuestas
 * (cada ejercicio tiene que ser el que tocaba) y se da el dominio inicial que
 * ganan, que nunca baja nada (`applyPlacement`).
 */
export function validatePlacement(profile: MasteryProfile, answers: readonly PlacementAnswer[]): Validation {
  let state = startPlacement();
  const records: AnswerRecord[] = [];
  const seeds = new Set<string>();
  for (const answer of answers) {
    if (nextPlacementSkill(state) !== answer.skill) return { ok: false, error: 'placement-order' };
    if (seeds.has(answer.seed)) return { ok: false, error: 'repeated-seed' };
    seeds.add(answer.seed);
    const exercise = regenerate(answer);
    if (!exercise) return { ok: false, error: 'exercise-mismatch' };
    const right = checkAnswer(exercise, answer.given).status === 'correct';
    // Igual que en el juego: solo cuenta acertar sin pistas ni fallos previos.
    state = recordPlacement(state, right && !answer.helped);
    records.push({ skill: answer.skill, seed: answer.seed, given: answer.given, correct: right, hintsUsed: answer.hintsUsed });
  }
  if (!isPlacementDone(state)) return { ok: false, error: 'placement-incomplete' };
  const next = applyPlacement(profile, placementResult(state));
  const changed = SKILL_IDS.filter((id) => {
    const a = profile[id];
    const b = next[id];
    return a.mastery !== b.mastery || a.attempts !== b.attempts || a.correct !== b.correct;
  });
  return { ok: true, profile: next, records, changed };
}
