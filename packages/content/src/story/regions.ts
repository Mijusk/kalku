import type { MapSpriteId } from '@kalku/art';
import type { Localized } from '@kalku/exercises';
import * as bosque from './bosqueDecenas.js';
import * as pradera from './praderaUno.js';
import type { CharacterId, SceneId } from './scenes.js';
import type { ChapterInfo, StoryStep } from './story.js';

/**
 * Dónde se pone algo de la historia en el mapa de la región, en casillas:
 * relativo a la esquina de un lugar (`place`, por id), a la esquina de una
 * zona (`zone`), a la puerta de una zona (`gate`) o a la entrada del mapa
 * (`entrance`). Solo uno de ellos.
 */
export interface Anchor {
  place?: string;
  zone?: string;
  gate?: string;
  entrance?: boolean;
  dx: number;
  dy: number;
}

/** El jefe de la región: quién es, cómo se dibuja y en qué se convierte al final. */
export interface BossInfo {
  character: CharacterId;
  sprite: MapSpriteId;
  /** Dibujo tras vencerle (Borroncito, Ovillo). */
  becomes: MapSpriteId;
  /** Diálogo al acercarse. */
  appears: SceneId;
  /** Diálogo al pasar a la segunda fase. */
  shrinks: SceneId;
}

/** Cartel del camino a otra región. Solo se ve cuando esa región está abierta. */
export interface RegionPath extends Anchor {
  to: string;
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
  /** Dibujo de las luces apagadas y encendidas (cristales, farolillos). */
  lightSprites: { off: MapSpriteId; on: MapSpriteId };
  /** Zona oscura que se ilumina al encender `lights` (en casillas). */
  shade?: Anchor & { width: number; height: number };
  /** Guardián de los acertijos (pasos `riddles` y encargos de acertijos) y su presentación. */
  riddler?: { npc: CharacterId; intro: SceneId };
  /** Criatura del primer rescate guiado (solo si la región tiene ese paso). */
  firstCreature?: string;
  boss: BossInfo;
  /** Diálogo al llegar por primera vez. */
  arrival?: SceneId;
  /** Lo que dice Uni al terminar la historia de la región. */
  afterEnding: SceneId;
  /** Caminos a otras regiones. */
  paths: readonly RegionPath[];
  /** Región que se abre al terminar esta. */
  next?: string;
}

export const PRADERA_UNO_STORY: RegionStory = {
  id: 'pradera-uno',
  name: { es: 'Pradera Uno', ca: 'Pradera Un' },
  chapters: pradera.CHAPTERS,
  steps: pradera.STORY,
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
  lightSprites: { off: 'crystal-off', on: 'crystal-on' },
  shade: { zone: 'cueva', dx: 1, dy: 1, width: 5, height: 2 },
  riddler: { npc: 'pedrolo', intro: 'pedrolo-riddles' },
  firstCreature: 'sumus-brote',
  boss: { character: 'borron', sprite: 'borron', becomes: 'borroncito', appears: 'borron-appears', shrinks: 'borron-shrinks' },
  afterEnding: 'after-ending',
  // El camino al bosque sale de la plaza del pueblo, por la derecha.
  paths: [{ to: 'bosque-decenas', place: 'pueblo-pradera', dx: 10, dy: 6 }],
  next: 'bosque-decenas',
};

export const BOSQUE_DECENAS_STORY: RegionStory = {
  id: 'bosque-decenas',
  name: { es: 'Bosque de las Decenas', ca: 'Bosc de les Desenes' },
  chapters: bosque.CHAPTERS,
  steps: bosque.STORY,
  npcs: {
    olma: { gate: 'claro-farolillos', dx: 1, dy: 1 },
    cuco: { gate: 'arbol-hueco', dx: 1, dy: 1 },
    ovillo: { place: 'campamento-bosque', dx: 3, dy: 4, afterEnd: true },
  },
  lights: [
    { zone: 'claro-farolillos', dx: 1, dy: 1 },
    { zone: 'claro-farolillos', dx: 3, dy: 1 },
    { zone: 'claro-farolillos', dx: 5, dy: 1 },
  ],
  lightSprites: { off: 'lantern-off', on: 'lantern-on' },
  shade: { zone: 'claro-farolillos', dx: 1, dy: 1, width: 5, height: 2 },
  riddler: { npc: 'cuco', intro: 'cuco-riddles' },
  boss: { character: 'enredo', sprite: 'enredo', becomes: 'ovillo', appears: 'enredo-appears', shrinks: 'enredo-shrinks' },
  arrival: 'forest-arrive',
  afterEnding: 'forest-after-ending',
  // De vuelta a Pradera Uno, junto a la entrada.
  paths: [{ to: 'pradera-uno', entrance: true, dx: 1, dy: 1 }],
};

/** Todas las regiones, en el orden en que se juegan. */
export const REGION_STORIES: readonly RegionStory[] = [PRADERA_UNO_STORY, BOSQUE_DECENAS_STORY];

export const FIRST_REGION = PRADERA_UNO_STORY.id;

/** La historia de una región; si el id no existe, la primera. */
export function regionStory(id: string | undefined): RegionStory {
  return REGION_STORIES.find((r) => r.id === id) ?? PRADERA_UNO_STORY;
}

/** Posición de la región en el orden de juego (-1 si no existe). */
export function regionIndex(id: string | undefined): number {
  return REGION_STORIES.findIndex((r) => r.id === id);
}
