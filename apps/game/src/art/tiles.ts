import { autotile, PATH_TILES, WATER_TILES, type TileKind, type WorldMap } from '@kalku/world';
import { BOSS, edgedTile, FLOWERS, GRASS, HOUSE, PATH, SHOP, TALL_GRASS, TREE, WATER } from './pixelArt';

/** Tamaño de una casilla en pantalla, en píxeles del juego (sprites de 8 px a doble tamaño). */
export const TILE_SIZE = 16;

/** Clave de la textura con todas las casillas en fila (tileset del mapa). */
export const TILESET_KEY = 'tileset';

/** Variantes de borde de agua y camino (máscaras de lados 0–15, ver WATER_TILES y PATH_TILES). */
const EDGE_VARIANTS = 16;

/** Casillas de un solo dibujo, en el orden en que van en el tileset. Si se añade un tipo de casilla, TypeScript obliga a darle dibujo aquí. */
const PLAIN: Readonly<Record<Exclude<TileKind, 'water' | 'path'>, readonly string[]>> = {
  grass: GRASS,
  tallGrass: TALL_GRASS,
  flowers: FLOWERS,
  tree: TREE,
  house: HOUSE,
  shop: SHOP,
  boss: BOSS,
};
const PLAIN_KINDS = Object.keys(PLAIN) as (keyof typeof PLAIN)[];

const WATER_FIRST = PLAIN_KINDS.length;
const PATH_FIRST = WATER_FIRST + EDGE_VARIANTS;

/**
 * Los dibujos de todas las casillas, en orden de fotograma: primero las de
 * un solo dibujo, luego las 16 de agua y las 16 de camino. Con el pack de
 * gráficos (#10) esto se sustituye por su PNG y su tabla.
 */
export function tileFrames(): string[][] {
  const frames: string[][] = PLAIN_KINDS.map((kind) => [...PLAIN[kind]]);
  for (let v = 0; v < EDGE_VARIANTS; v++) frames.push(edgedTile(v, WATER, 'e'));
  for (let v = 0; v < EDGE_VARIANTS; v++) frames.push(edgedTile(v, PATH, 'g'));
  return frames;
}

const PLAIN_FRAME = new Map<TileKind, number>(PLAIN_KINDS.map((kind, i) => [kind, i]));

/**
 * Fotograma del tileset para cada casilla del mapa, por filas, listo para
 * `make.tilemap({ data })`. El agua y el camino eligen su borde según sus
 * vecinas (`autotile`).
 */
export function tilemapData(map: WorldMap): number[][] {
  const water = autotile(map, WATER_TILES);
  const path = autotile(map, PATH_TILES);
  const frameAt = (i: number): number => {
    const kind = map.tiles[i] ?? 'grass';
    if (kind === 'water') return WATER_FIRST + clampVariant(water[i]);
    if (kind === 'path') return PATH_FIRST + clampVariant(path[i]);
    return PLAIN_FRAME.get(kind) ?? 0;
  };
  return Array.from({ length: map.height }, (_, y) => Array.from({ length: map.width }, (_, x) => frameAt(y * map.width + x)));
}

function clampVariant(variant: number | undefined): number {
  return variant !== undefined && variant >= 0 && variant < EDGE_VARIANTS ? variant : EDGE_VARIANTS - 1;
}
