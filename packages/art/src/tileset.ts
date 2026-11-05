import { autotile, WATER_TILES_8, PATH_TILES_8, validMasks, type TileKind, type WorldMap } from '@kalku/world';
import { createRng } from '@kalku/exercises';
import type { Grid } from './grid.js';
import { drawBossMark, drawFlowers, drawGrass, drawPath, drawRock, drawTallGrass, drawTree, drawWater, WATER_FRAMES } from './tiles.js';

/** Cuántas hierbas lisas distintas hay; el mapa elige una según la casilla. */
export const GRASS_VARIANTS = 4;
export const FLOWER_VARIANTS = 2;
export const TALL_GRASS_VARIANTS = 2;

/** Máscaras de vecinas posibles (modo 8) y su posición dentro del grupo de agua o camino. */
const MASKS = validMasks(8);

/** Casillas con un dibujo fijo, en el orden en que van en el tileset. */
type PlainSlot = 'grass' | 'rock' | 'flowers' | 'tallGrass' | 'tree' | 'boss';

const PLAIN_ORDER: readonly { slot: PlainSlot; count: number }[] = [
  { slot: 'grass', count: GRASS_VARIANTS },
  { slot: 'rock', count: 1 },
  { slot: 'flowers', count: FLOWER_VARIANTS },
  { slot: 'tallGrass', count: TALL_GRASS_VARIANTS },
  { slot: 'tree', count: 1 },
  { slot: 'boss', count: 1 },
];

const FIRST = new Map<PlainSlot, number>();
let next = 0;
for (const { slot, count } of PLAIN_ORDER) {
  FIRST.set(slot, next);
  next += count;
}
const WATER_FIRST = next;
const PATH_FIRST = WATER_FIRST + MASKS.length;

/** Cuántos fotogramas tiene el tileset. */
export const TILESET_SIZE = PATH_FIRST + MASKS.length;

/**
 * Dibuja el tileset: primero las casillas de un dibujo, luego una de agua
 * por cada máscara de vecinas y luego una de camino por máscara. `waterFrame`
 * (0–2) es el fotograma de la animación del agua. Las casas y la tienda no
 * están aquí: se dibujan enteras con `drawBuilding` sobre una hierba.
 */
export function tilesetGrids(waterFrame: number): Grid[] {
  const grids: Grid[] = [];
  for (let i = 0; i < GRASS_VARIANTS; i++) grids.push(drawGrass(100 + i));
  grids.push(drawRock(110));
  for (let i = 0; i < FLOWER_VARIANTS; i++) grids.push(drawFlowers(120 + i));
  for (let i = 0; i < TALL_GRASS_VARIANTS; i++) grids.push(drawTallGrass(130 + i));
  grids.push(drawTree(140));
  grids.push(drawBossMark(150));
  for (const mask of MASKS) grids.push(drawWater(mask, waterFrame % WATER_FRAMES));
  for (const mask of MASKS) grids.push(drawPath(mask));
  return grids;
}

/** Fotograma de una hierba lisa (0 … GRASS_VARIANTS − 1). */
export function grassFrame(variant: number): number {
  return (FIRST.get('grass') ?? 0) + (variant % GRASS_VARIANTS);
}

/** Fotograma de unas flores (0 … FLOWER_VARIANTS − 1). */
export function flowerFrame(variant: number): number {
  return (FIRST.get('flowers') ?? 0) + (variant % FLOWER_VARIANTS);
}

/**
 * Fotograma del tileset para cada casilla del mapa, por filas. El agua y el
 * camino eligen su dibujo según sus vecinas (`autotile`); la hierba, las
 * flores y la hierba alta eligen variante según la casilla y la semilla, y
 * de vez en cuando sale una piedra. Con la misma semilla sale siempre lo mismo.
 */
export function tilemapData(map: WorldMap, seed: number): number[][] {
  const water = autotile(map, WATER_TILES_8);
  const path = autotile(map, PATH_TILES_8);
  const first = (slot: PlainSlot): number => FIRST.get(slot) ?? 0;

  const frameAt = (x: number, y: number): number => {
    const i = y * map.width + x;
    const kind: TileKind = map.tiles[i] ?? 'grass';
    if (kind === 'water') return WATER_FIRST + Math.max(0, water[i] ?? 0);
    if (kind === 'path') return PATH_FIRST + Math.max(0, path[i] ?? 0);
    const rng = createRng(Math.imul(seed ^ 0x9e3779b9, 31) + y * 7919 + x * 104729);
    switch (kind) {
      case 'tree':
        return first('tree');
      case 'boss':
        return first('boss');
      case 'flowers':
        return first('flowers') + rng.int(0, FLOWER_VARIANTS - 1);
      case 'tallGrass':
        return first('tallGrass') + rng.int(0, TALL_GRASS_VARIANTS - 1);
      default:
        // Hierba, y debajo de casas y tienda. Alguna piedra suelta, solo donde se anda.
        return kind === 'grass' && rng.chance(0.04) ? first('rock') : first('grass') + rng.int(0, GRASS_VARIANTS - 1);
    }
  };
  return Array.from({ length: map.height }, (_, y) => Array.from({ length: map.width }, (_, x) => frameAt(x, y)));
}
