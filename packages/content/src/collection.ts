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
  /** Fecha del primer rescate en versión brillante (#101). Solo es una pegatina: no da ventaja. */
  shiny?: string;
}

export type Collection = readonly CollectionEntry[];

/** ¿Sale el botón «Rescatar»? Nunca con un jefe ni con la criatura ya derrotada. */
export function canRescue(creature: CreatureDefinition, hp: number, maxHp: number): boolean {
  if (creature.boss === true) return false;
  if (!(maxHp > 0) || !(hp > 0)) return false;
  return hp / maxHp <= RESCUE_HP_RATIO;
}

/**
 * Colección nueva con la criatura añadida. Si ya estaba, devuelve la misma sin
 * tocar su fecha; si ahora es brillante y antes no, se apunta también eso.
 */
export function addToCollection(collection: Collection, id: CreatureId, date: string, shiny = false): Collection {
  const had = collection.find((e) => e.id === id);
  if (!had) return [...collection, shiny ? { id, date, shiny: date } : { id, date }];
  if (!shiny || had.shiny !== undefined) return collection;
  return collection.map((e) => (e.id === id ? { ...e, shiny: date } : e));
}

/** Lee el guardado: descarta ids desconocidos, entradas sin fecha y repetidas. */
export function parseCollection(raw: unknown): Collection {
  if (!Array.isArray(raw)) return [];
  const known = new Set<string>(CREATURES.map((c) => c.id));
  let result: Collection = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, date, shiny } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !known.has(id) || typeof date !== 'string' || date === '') continue;
    result = addToCollection(result, id as CreatureId, date);
    if (typeof shiny === 'string' && shiny !== '') result = addToCollection(result, id as CreatureId, shiny, true);
  }
  return result;
}

export interface CollectionStatus {
  creature: CreatureDefinition;
  rescued: boolean;
  /** Rescatada también en versión brillante. */
  shiny: boolean;
}

/** Todas las criaturas, en orden de contenido, con si ya están rescatadas (para la pantalla). */
export function collectionStatus(collection: Collection): CollectionStatus[] {
  return CREATURES.map((creature) => {
    const entry = collection.find((e) => e.id === creature.id);
    return { creature, rescued: entry !== undefined, shiny: entry?.shiny !== undefined };
  });
}

export interface AlbumPage {
  /** Id de la región (o `eventos`). */
  id: string;
  entries: CollectionStatus[];
  /** Todas rescatadas: la página gana su pegatina. */
  complete: boolean;
}

/** El álbum por páginas, en el orden en que aparecen las criaturas (una página por región y la de eventos). */
export function albumPages(collection: Collection): AlbumPage[] {
  const pages: AlbumPage[] = [];
  for (const entry of collectionStatus(collection)) {
    let page = pages.find((p) => p.id === entry.creature.album);
    if (!page) {
      page = { id: entry.creature.album, entries: [], complete: false };
      pages.push(page);
    }
    page.entries.push(entry);
  }
  for (const page of pages) page.complete = page.entries.every((e) => e.rescued);
  return pages;
}
