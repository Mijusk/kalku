/** Idiomas del juego. Castellano y catalán desde el día 1. */
export type Locale = 'es' | 'ca';

/** Texto en todos los idiomas del juego. */
export type Localized = Record<Locale, string>;

/**
 * Habilidades de la fase 1 (Pradera Uno: sumas y restas hasta 20).
 * El orden de `SKILLS` en skills.ts es el orden del currículo.
 */
export type SkillId =
  | 'add-within-10'
  | 'sub-within-10'
  | 'add-within-20-no-carry'
  | 'sub-within-20-no-borrow'
  | 'add-within-20-carry'
  | 'sub-within-20-borrow'
  | 'word-problems-within-10';

export type Operator = '+' | '-';

/** Operador de una habilidad: `mixed` si mezcla sumas y restas (problemas con enunciado). */
export type SkillOperator = Operator | 'mixed';

/**
 * Formato del ejercicio.
 * - `result`: 7 + 5 = _
 * - `missing`: 7 + _ = 12 (completar el hueco)
 */
export type ExerciseFormat = 'result' | 'missing';

export interface Exercise {
  /** Identificador estable, útil para registrar respuestas. */
  id: string;
  skill: SkillId;
  format: ExerciseFormat;
  /** La operación real de este ejercicio (nunca `mixed`). */
  operator: Operator;
  /** Operandos tal como se muestran: a (op) b = c. */
  a: number;
  b: number;
  c: number;
  /** Qué posición está oculta: 'c' en `result`, 'a' o 'b' en `missing`. */
  hidden: 'a' | 'b' | 'c';
  /** La respuesta correcta (el valor de la posición oculta). */
  answer: number;
  /** Enunciado ya redactado (problemas con texto). Si existe, sustituye a la operación al mostrarlo. */
  story?: Localized;
  /** Dificultad: posición de la habilidad en el currículo (1–7), +0,5 si es de completar el hueco. */
  difficulty: number;
}

export interface CheckResult {
  /** `invalid` = no es un número entero; no cuenta como fallo. */
  status: 'correct' | 'wrong' | 'invalid';
  /** El número que se ha entendido, si se pudo leer. */
  value?: number;
}

export interface Hint {
  /** 1 = estrategia general, 2 = descomposición, 3 = casi la solución. */
  level: 1 | 2 | 3;
  text: string;
}
