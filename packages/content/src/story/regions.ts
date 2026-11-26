import type { Localized } from '@kalku/exercises';
import { CHAPTERS, STORY } from './praderaUno.js';
import type { CharacterId } from './scenes.js';
import type { ChapterInfo, StoryStep } from './story.js';

/**
 * Dónde se pone algo de la historia en el mapa de la región, en casillas:
 * relativo a la esquina de un lugar (`place`, por id), a la esquina de una
 * zona (`zone`) o a la puerta de una zona (`gate`). Solo uno de los tres.
 */
export interface Anchor {
  place?: string;
  zone?: string;
  gate?: string;
  dx: number;
  dy: number;
}

/**
 * La historia de una región como datos (docs/JUEGO-SIN-FIN.md §2): sus
 * capítulos, pasos y dónde viven personajes y objetivos en su mapa.
 * Añadir una región es escribir otro objeto así y añadirlo a `REGION_STORIES`.
 */
export interface RegionStory {
  /** Mismo id que la región del mapa en `@kalku/world`. */
  id: string;
  name: Localized;
  chapters: readonly ChapterInfo[];
  steps: readonly StoryStep[];
  /** Personajes del mapa. `afterEnd`: solo aparece al terminar la historia (Borroncito). */
  npcs: Partial<Record<CharacterId, Anchor & { afterEnd?: boolean }>>;
  /** Lo que hay que encender en los pasos `crystals` (en orden). */
  lights: readonly Anchor[];
  /** Zona oscura que se ilumina al encender `lights` (en casillas). */
  shade?: Anchor & { width: number; height: number };
  /** Criatura del primer rescate guiado. */
  firstCreature: string;
  /** Quién es el jefe en el mapa y en el combate. */
  boss: CharacterId;
  /** Región que se abre al terminar esta (más adelante). */
  next?: string;
}

export const PRADERA_UNO_STORY: RegionStory = {
  id: 'pradera-uno',
  name: { es: 'Pradera Uno', ca: 'Prada U' },
  chapters: CHAPTERS,
  steps: STORY,
  npcs: {
    tecla: { place: 'pueblo-pradera', dx: 6, dy: 4 },
    bruno: { gate: 'puente-roto', dx: 1, dy: 1 },
    lina: { gate: 'cueva', dx: 1, dy: 1 },
    pedrolo: { gate: 'puerta-de-piedra', dx: 1, dy: 1 },
    borroncito: { place: 'pueblo-pradera', dx: 4, dy: 4, afterEnd: true },
  },
  lights: [
    { zone: 'cueva', dx: 1, dy: 1 },
    { zone: 'cueva', dx: 3, dy: 1 },
    { zone: 'cueva', dx: 5, dy: 1 },
  ],
  shade: { zone: 'cueva', dx: 1, dy: 1, width: 5, height: 2 },
  firstCreature: 'sumus-brote',
  boss: 'borron',
};

export const REGION_STORIES: readonly RegionStory[] = [PRADERA_UNO_STORY];

export const FIRST_REGION = PRADERA_UNO_STORY.id;

/** La historia de una región; si el id no existe, la primera. */
export function regionStory(id: string | undefined): RegionStory {
  return REGION_STORIES.find((r) => r.id === id) ?? PRADERA_UNO_STORY;
}
