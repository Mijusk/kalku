import { isWalkable } from './pieces.js';
import { neighbors } from './terrain.js';
import type { PlacedPiece, Point, WorldMap } from './types.js';

/** true si en (x, y) hay una puerta cerrada. */
export function isGateClosed(map: WorldMap, p: Point): boolean {
  return map.tiles[p.y * map.width + p.x] === 'gate';
}

/**
 * Mapa nuevo con la puerta abierta: la casilla pasa a hierba y ya se puede
 * pisar. No muta el mapa que recibe; si ahí no hay una puerta, lo devuelve igual.
 */
export function openGate<T extends WorldMap>(map: T, gate: Point): T {
  if (!isGateClosed(map, gate)) return map;
  const tiles = map.tiles.slice();
  tiles[gate.y * map.width + gate.x] = 'grass';
  return { ...map, tiles };
}

/**
 * Casillas del interior de una zona: las que se alcanzan andando desde el
 * cofre sin salir de la pieza ni cruzar la puerta. Vacío si la pieza no
 * tiene cofre. Hay que llamarlo con la puerta cerrada (como sale de `generateRegion`).
 */
export function zoneInterior(map: WorldMap, place: PlacedPiece): Point[] {
  const { chest } = place;
  if (chest === undefined) return [];
  const inside = (i: number): boolean => {
    const x = i % map.width;
    const y = Math.floor(i / map.width);
    return x >= place.x && y >= place.y && x < place.x + place.width && y < place.y + place.height;
  };
  const start = chest.y * map.width + chest.x;
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const n of neighbors(queue[head] as number, map.width, map.height)) {
      if (seen.has(n) || !inside(n) || !isWalkable(map.tiles[n])) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return queue.map((i) => ({ x: i % map.width, y: Math.floor(i / map.width) }));
}
