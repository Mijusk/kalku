import { isWalkable } from './pieces.js';
import { neighbors } from './terrain.js';
import type { Point, WorldMap } from './types.js';

/** Las cuatro direcciones en las que se anda, casilla a casilla. */
export type Direction = 'up' | 'down' | 'left' | 'right';

const DELTA: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** true si (x, y) está dentro del mapa y se puede pisar (no es árbol, agua, casa ni tienda). */
export function canWalk(map: WorldMap, p: Point): boolean {
  if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) return false;
  if (p.x < 0 || p.y < 0 || p.x >= map.width || p.y >= map.height) return false;
  return isWalkable(map.tiles[p.y * map.width + p.x]);
}

/**
 * Un paso desde `from` en la dirección dada. Devuelve la casilla nueva, o
 * `from` tal cual si delante hay algo que no se puede pisar o el borde.
 */
export function step(map: WorldMap, from: Point, direction: Direction): Point {
  const d = DELTA[direction];
  const to = { x: from.x + d.x, y: from.y + d.y };
  return canWalk(map, to) ? to : from;
}

/**
 * Casillas por las que ir andando de `from` hacia `target` (sin incluir
 * `from`), por el camino más corto en cruz. Si no se puede llegar a
 * `target` (es un árbol, agua, una casa o está cerrado), va a la casilla
 * alcanzable más cercana a él. Devuelve [] si ya está ahí o no hay a dónde ir.
 */
export function pathTo(map: WorldMap, from: Point, target: Point): Point[] {
  if (!canWalk(map, from)) return [];
  const { width, height } = map;
  const start = from.y * width + from.x;
  const tx = Math.min(width - 1, Math.max(0, Math.round(target.x)));
  const ty = Math.min(height - 1, Math.max(0, Math.round(target.y)));
  const distance = (i: number): number => Math.abs((i % width) - tx) + Math.abs(Math.floor(i / width) - ty);

  // Búsqueda en anchura: la primera vez que se llega a una casilla es por el camino más corto.
  const previous = new Int32Array(width * height).fill(-1);
  previous[start] = start;
  const queue = [start];
  let best = start;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as number;
    if (distance(current) < distance(best)) best = current;
    if (distance(best) === 0) break;
    for (const n of neighbors(current, width, height)) {
      if (previous[n] !== -1 || !isWalkable(map.tiles[n])) continue;
      previous[n] = current;
      queue.push(n);
    }
  }

  const route: Point[] = [];
  for (let i = best; i !== start; i = previous[i] ?? start) {
    route.push({ x: i % width, y: Math.floor(i / width) });
  }
  return route.reverse();
}

