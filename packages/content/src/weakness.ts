import type { Operator } from '@kalku/exercises';
import { FAMILIES, getFamily, type CreatureDefinition, type CreatureFamily } from './creatures.js';

/**
 * Cuánto más daño hace un ataque de la operación inversa a la de la criatura.
 * Único sitio donde vive el valor; se afinará en el piloto. Nunca baja de 1:
 * nada resta daño ni quita nada al niño.
 */
export const WEAKNESS_MULTIPLIER = 1.5;

/** Cuántos encuentros con una familia enseñan el cartel de debilidad. Después, el niño tiene que acordarse. */
export const WEAKNESS_HINT_ENCOUNTERS = 5;

function inverse(operator: Operator): Operator {
  return operator === '+' ? '-' : '+';
}

/** La operación a la que es débil la criatura: la inversa de la de su familia. Los problemus mezclan operaciones y no tienen debilidad. */
export function weakOperator(creature: CreatureDefinition): Operator | undefined {
  const operator = getFamily(creature.family).operator;
  return operator === 'mixed' ? undefined : inverse(operator);
}

/** Multiplicador de daño de un ataque de esa operación contra la criatura (1 si no es su debilidad). */
export function damageMultiplier(creature: CreatureDefinition, operator: Operator): number {
  return operator === weakOperator(creature) ? WEAKNESS_MULTIPLIER : 1;
}

/** `encountersSoFar` cuenta el encuentro actual: 1 es el primero. */
export function shouldShowWeaknessHint(encountersSoFar: number): boolean {
  return encountersSoFar >= 1 && encountersSoFar <= WEAKNESS_HINT_ENCOUNTERS;
}

/** Encuentros por familia, tal como se guardan en el progreso. */
export type EncounterCounts = Partial<Record<CreatureFamily, number>>;

/** Lee los contadores guardados; lo que falte o esté corrupto cuenta como 0. */
export function parseEncounters(raw: unknown): EncounterCounts {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const counts: EncounterCounts = {};
  for (const family of FAMILIES) {
    const n = r[family.id];
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) counts[family.id] = n;
  }
  return counts;
}

/** Suma un encuentro a la familia sin mutar los contadores. */
export function countEncounter(counts: EncounterCounts, family: CreatureFamily): EncounterCounts {
  return { ...counts, [family]: (counts[family] ?? 0) + 1 };
}
