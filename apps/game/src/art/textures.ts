import { CREATURES, outfitPieces, type Outfit } from '@kalku/content';
import {
  CHARACTER_FRAMES,
  drawBuilding,
  drawCharacter,
  drawChest,
  MATERIAL,
  drawCreature,
  drawMapSprite,
  drawPortrait,
  MAP_SPRITES,
  PORTRAITS,
  type MapSpriteId,
  type PortraitId,
  drawGate,
  TILE_PX,
  tilesetGrids,
  toSheet,
  WATER_FRAMES,
  type Building,
  type Sheet,
} from '@kalku/art';
import type Phaser from 'phaser';

/** Tamaño de una casilla en pantalla, en píxeles del juego: los dibujos son de 16 px y se ven a tamaño real. */
export const TILE_SIZE = TILE_PX;

/** Claves de los tilesets: el mismo mapa con cada fotograma de la animación del agua. */
export const TILESET_KEYS: readonly string[] = Array.from({ length: WATER_FRAMES }, (_, f) => `tileset-${f}`);

/** Texturas de la puerta de las zonas y del cofre (cerrado y abierto). */
export const GATE_TEXTURE = 'zone-gate';
export const CHEST_TEXTURES = { closed: 'zone-chest-closed', open: 'zone-chest-open' } as const;
/** El cofre sorpresa del día: morado, para que no se confunda con los de las zonas. */
export const SURPRISE_TEXTURES = { closed: 'surprise-chest-closed', open: 'surprise-chest-open' } as const;

/** Cuánto dura cada fotograma de las animaciones (ms). */
export const ANIMATION_MS = 170;

/** Una tira de dibujos como textura de Phaser, con un fotograma por dibujo (0, 1, 2…). */
function addSheet(scene: Phaser.Scene, key: string, sheet: Sheet): void {
  const texture = scene.textures.createCanvas(key, sheet.width, sheet.height);
  if (texture === null) throw new Error(`No se pudo crear la textura ${key}`);
  const ctx = texture.getContext();
  const image = ctx.createImageData(sheet.width, sheet.height);
  image.data.set(sheet.rgba);
  ctx.putImageData(image, 0, 0);
  texture.refresh();
  for (let i = 0; i < sheet.width / sheet.cell; i++) texture.add(i, 0, i * sheet.cell, 0, sheet.cell, sheet.height);
}

/** Clave de la textura del personaje: una tira con sus fotogramas (parado, paso, parado, paso). */
export const HERO_KEY = 'hero';

/** (Re)crea la textura del personaje con las piezas del atuendo. Llamar al cambiar de pieza. */
export function createHeroTexture(scene: Phaser.Scene, outfit: Outfit): void {
  // Primero se dibuja (puede lanzar si el atuendo no es válido) y solo después se sustituye la textura.
  const art = outfitPieces(outfit).map((p) => p.art);
  const sheet = toSheet(Array.from({ length: CHARACTER_FRAMES }, (_, f) => drawCharacter(art, f)));
  if (scene.textures.exists(HERO_KEY)) scene.textures.remove(HERO_KEY);
  addSheet(scene, HERO_KEY, sheet);
}

/** Genera todas las texturas del mundo y las criaturas a partir de los datos. */
export function createArtTextures(scene: Phaser.Scene): void {
  TILESET_KEYS.forEach((key, frame) => addSheet(scene, key, toSheet(tilesetGrids(frame))));
  addSheet(scene, GATE_TEXTURE, toSheet([drawGate()]));
  addSheet(scene, CHEST_TEXTURES.closed, toSheet([drawChest(false)]));
  addSheet(scene, CHEST_TEXTURES.open, toSheet([drawChest(true)]));
  addSheet(scene, SURPRISE_TEXTURES.closed, toSheet([drawChest(false, MATERIAL.runa)]));
  addSheet(scene, SURPRISE_TEXTURES.open, toSheet([drawChest(true, MATERIAL.runa)]));
  for (const creature of CREATURES) addSheet(scene, creature.sprite, toSheet(drawCreature(creature.look)));
  for (const id of Object.keys(PORTRAITS) as PortraitId[]) addSheet(scene, portraitKey(id), toSheet([drawPortrait(id)]));
  for (const id of Object.keys(MAP_SPRITES) as MapSpriteId[]) addSheet(scene, mapSpriteKey(id), toSheet([drawMapSprite(id)]));
}

/** Textura del retrato de un personaje de la historia. */
export const portraitKey = (id: PortraitId): string => `portrait-${id}`;
/** Textura de un personaje u objeto de la historia en el mapa. */
export const mapSpriteKey = (id: MapSpriteId): string => `map-${id}`;

/** Textura de un edificio entero (la crea la primera vez que se pide) y su clave. */
export function buildingTexture(scene: Phaser.Scene, b: Pick<Building, 'kind' | 'width' | 'height'>): string {
  const key = `building-${b.kind}-${b.width}x${b.height}`;
  if (!scene.textures.exists(key)) {
    addSheet(scene, key, toSheet([drawBuilding(b.kind, b.width, b.height)]));
  }
  return key;
}
