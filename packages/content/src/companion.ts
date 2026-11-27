import type { Collection } from './collection.js';
import type { CreatureId } from './creatures.js';

/**
 * Compañero: una criatura rescatada que el niño elige para que le acompañe
 * por el mapa y le anime en los combates. Solo es compañía: no da vida, daño
 * ni ninguna ventaja (regla 1). Solo puede serlo una criatura de su colección.
 */
export interface Companion {
  id: CreatureId;
  /** Se ve en su versión brillante (solo si la rescató brillante). */
  shiny: boolean;
}

/**
 * El compañero si se elige esta criatura: tiene que estar en la colección, y
 * sale brillante si la tiene brillante. `undefined` si no la ha rescatado.
 */
export function chooseCompanion(collection: Collection, id: string): Companion | undefined {
  const entry = collection.find((e) => e.id === id);
  if (!entry) return undefined;
  return { id: entry.id, shiny: entry.shiny !== undefined };
}

/** Lee el compañero guardado: si ya no está en la colección (o son datos raros), no hay compañero. */
export function parseCompanion(raw: unknown, collection: Collection): Companion | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, shiny } = raw as Record<string, unknown>;
  if (typeof id !== 'string') return null;
  const chosen = chooseCompanion(collection, id);
  if (!chosen) return null;
  // Brillante solo si de verdad la tiene brillante.
  return { id: chosen.id, shiny: chosen.shiny && shiny !== false };
}
