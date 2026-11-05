import type { Rng } from '@kalku/exercises';
import type { Point, WildlifeSpec, WorldMap } from './types.js';

/**
 * Criaturas visibles en la hierba alta. Es lógica pura: el estado es un
 * dato que cada función devuelve nuevo, sin mutar el que recibe. Lo que
 * lleva cada criatura (`data`: su habilidad y su especie, por ejemplo) lo
 * decide quien llama con `assign`, para que este paquete no sepa de combates.
 */
export interface Wanderer<T> {
  readonly id: number;
  readonly tile: Point;
  /** Milisegundos que faltan para su próximo paso. */
  readonly moveIn: number;
  readonly data: T;
}

export interface WildlifeState<T> {
  readonly wanderers: readonly Wanderer<T>[];
  /** Una cuenta atrás (ms) por cada criatura que falta por salir. */
  readonly respawns: readonly number[];
  /** Margen que queda sin combates (ms). */
  readonly grace: number;
  readonly nextId: number;
}

const STEPS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

function isTall(map: WorldMap, p: Point): boolean {
  if (p.x < 0 || p.y < 0 || p.x >= map.width || p.y >= map.height) return false;
  return map.tiles[p.y * map.width + p.x] === 'tallGrass';
}

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Todas las casillas de hierba alta, por filas. */
export function tallGrassTiles(map: WorldMap): Point[] {
  const tiles: Point[] = [];
  map.tiles.forEach((kind, i) => {
    if (kind === 'tallGrass') tiles.push({ x: i % map.width, y: Math.floor(i / map.width) });
  });
  return tiles;
}

/**
 * Sitio donde puede salir una criatura: hierba alta, libre y a
 * `minSpawnDistance` o más del personaje. Si no hay ninguno, undefined.
 */
function spawnTile(
  map: WorldMap,
  spec: WildlifeSpec,
  taken: readonly Point[],
  hero: Point,
  rng: Rng,
): Point | undefined {
  const free = tallGrassTiles(map).filter(
    (t) => distance(t, hero) >= spec.minSpawnDistance && !taken.some((o) => same(o, t)),
  );
  return free.length > 0 ? rng.pick(free) : undefined;
}

function spawn<T>(
  map: WorldMap,
  spec: WildlifeSpec,
  state: WildlifeState<T>,
  hero: Point,
  rng: Rng,
  assign: (rng: Rng) => T,
): WildlifeState<T> | undefined {
  const tile = spawnTile(map, spec, state.wanderers.map((w) => w.tile), hero, rng);
  if (!tile) return undefined;
  const wanderer: Wanderer<T> = { id: state.nextId, tile, moveIn: rng.int(0, spec.moveEveryMs), data: assign(rng) };
  return { ...state, wanderers: [...state.wanderers, wanderer], nextId: state.nextId + 1 };
}

/** Estado de partida: tantas criaturas como `max` (si caben), lejos del personaje. */
export function createWildlife<T>(
  map: WorldMap,
  spec: WildlifeSpec,
  hero: Point,
  rng: Rng,
  assign: (rng: Rng) => T,
): WildlifeState<T> {
  let state: WildlifeState<T> = { wanderers: [], respawns: [], grace: 0, nextId: 1 };
  for (let i = 0; i < spec.max; i++) {
    state = spawn(map, spec, state, hero, rng, assign) ?? state;
  }
  return state;
}

/**
 * Hace pasar `dtMs`: las criaturas dan pasos despacio sin salir de la
 * hierba alta, y las que faltan salen cuando acaba su cuenta atrás.
 */
export function tickWildlife<T>(
  map: WorldMap,
  spec: WildlifeSpec,
  state: WildlifeState<T>,
  dtMs: number,
  hero: Point,
  rng: Rng,
  assign: (rng: Rng) => T,
): WildlifeState<T> {
  const moved: Wanderer<T>[] = [];
  for (const w of state.wanderers) {
    let current: Wanderer<T> = { ...w, moveIn: w.moveIn - dtMs };
    if (current.moveIn <= 0) {
      const occupied = [...moved, ...state.wanderers.filter((o) => o.id > w.id)].map((o) => o.tile);
      const options = STEPS.map((d) => ({ x: w.tile.x + d.x, y: w.tile.y + d.y })).filter(
        (t) => isTall(map, t) && !occupied.some((o) => same(o, t)),
      );
      const tile = options.length > 0 ? rng.pick(options) : w.tile;
      current = { ...current, tile, moveIn: current.moveIn + spec.moveEveryMs };
    }
    moved.push(current);
  }

  let next: WildlifeState<T> = {
    ...state,
    wanderers: moved,
    respawns: state.respawns.map((t) => Math.max(0, t - dtMs)),
    grace: Math.max(0, state.grace - dtMs),
  };

  // Las cuentas atrás que han llegado a 0 sacan una criatura. Si ahora no hay
  // sitio libre y lejos, se queda en 0 y se reintenta en el siguiente tick.
  const waiting: number[] = [];
  for (const t of next.respawns) {
    const spawned = t === 0 ? spawn(map, spec, next, hero, rng, assign) : undefined;
    if (spawned) next = spawned;
    else waiting.push(t);
  }
  return { ...next, respawns: waiting };
}

/** La criatura que está en la misma casilla que el personaje, salvo durante el margen. */
export function findCollision<T>(state: WildlifeState<T>, hero: Point): Wanderer<T> | undefined {
  if (state.grace > 0) return undefined;
  return state.wanderers.find((w) => same(w.tile, hero));
}

/**
 * Quita la criatura con la que se ha combatido, programa que salga otra
 * al cabo de `respawnMs` y arranca el margen sin combates.
 */
export function endEncounter<T>(spec: WildlifeSpec, state: WildlifeState<T>, id: number): WildlifeState<T> {
  return {
    ...state,
    wanderers: state.wanderers.filter((w) => w.id !== id),
    respawns: [...state.respawns, spec.respawnMs],
    grace: spec.graceMs,
  };
}
