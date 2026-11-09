import { CREATURES, type CreatureDefinition, type CreatureId } from './creatures.js';

/**
 * Colección de criaturas rescatadas. Solo sirve para coleccionar: nada de
 * aquí da ventaja en el combate (regla 1) y fallar un rescate no quita nada.
 */

/** Con esta fracción de vida o menos (y más de 0) se puede rescatar. */
export const RESCUE_HP_RATIO = 0.25;

export interface CollectionEntry {
  id: CreatureId;
  /** Fecha del primer rescate, en ISO (`2026-11-06`). */
  date: string;
}

export type Collection = readonly CollectionEntry[];

/** ¿Sale el botón «Rescatar»? Nunca con un jefe ni con la criatura ya derrotada. */
export function canRescue(creature: CreatureDefinition, hp: number, maxHp: number): boolean {
  if (creature.boss === true) return false;
  if (!(maxHp > 0) || !(hp > 0)) return false;
  return hp / maxHp <= RESCUE_HP_RATIO;
}

/** Colección nueva con la criatura añadida. Si ya estaba, devuelve la misma sin tocar su fecha. */
export function addToCollection(collection: Collection, id: CreatureId, date: string): Collection {
  if (collection.some((e) => e.id === id)) return collection;
  return [...collection, { id, date }];
}

/** Lee el guardado: descarta ids desconocidos, entradas sin fecha y repetidas. */
export function parseCollection(raw: unknown): Collection {
  if (!Array.isArray(raw)) return [];
  const known = new Set<string>(CREATURES.map((c) => c.id));
  let result: Collection = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, date } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !known.has(id) || typeof date !== 'string' || date === '') continue;
    result = addToCollection(result, id as CreatureId, date);
  }
  return result;
}

export interface CollectionStatus {
  creature: CreatureDefinition;
  rescued: boolean;
}

/** Todas las criaturas, en orden de contenido, con si ya están rescatadas (para la pantalla). */
export function collectionStatus(collection: Collection): CollectionStatus[] {
  return CREATURES.map((creature) => ({ creature, rescued: collection.some((e) => e.id === creature.id) }));
}
