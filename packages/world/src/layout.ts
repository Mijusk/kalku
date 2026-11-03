import { isWalkable, parsePiece, pieceSize } from './pieces.js';
import { generateTerrain, neighbors } from './terrain.js';
import type { PlacedPiece, Point, RegionMap, RegionSpec, TileKind, WorldMap } from './types.js';

/**
 * Coste de que el camino pase por cada casilla. El camino prefiere ir por
 * hierba (y reaprovechar camino ya hecho), abre paso entre árboles si
 * hace falta y solo cruza agua, como puente, si no queda otra.
 */
const STEP_COST: Readonly<Record<TileKind, number>> = {
  path: 1,
  grass: 2,
  tallGrass: 2,
  flowers: 2,
  boss: 2,
  tree: 8,
  // Mucho más caro que cualquier rodeo por tierra: solo se cruza si no hay otra forma de llegar.
  water: 1_000_000,
  house: Number.POSITIVE_INFINITY,
  shop: Number.POSITIVE_INFINITY,
};

/** Radio (en pasos en cruz) del claro que se deja alrededor de la entrada y de los enlaces. */
export const CLEARING_RADIUS = 3;

/**
 * Genera el mapa completo de una región: terreno con semilla, lugares
 * hechos a mano en su sitio y un camino de la entrada a cada lugar en
 * orden. Las piezas quedan exactamente como están escritas.
 */
export function generateRegion(region: RegionSpec, seed: number): RegionMap {
  const terrain = generateTerrain(region, seed);
  const { width, height } = terrain;
  const tiles: TileKind[] = [...terrain.tiles];
  const locked = new Uint8Array(width * height);
  const index = (p: Point): number => p.y * width + p.x;

  const { entrance } = region;
  if (!insideMap(entrance, width, height) || !onMapBorder(entrance, width, height)) {
    throw new RangeError(`La entrada (${entrance.x}, ${entrance.y}) tiene que estar en el borde del mapa`);
  }

  const places: PlacedPiece[] = region.places.map((place) => {
    const grid = parsePiece(place.piece);
    const size = pieceSize(place.piece);
    const id = place.piece.id;
    if (!Number.isInteger(place.x) || !Number.isInteger(place.y)) {
      throw new RangeError(`La posición de ${id} tiene que ser entera`);
    }
    if (place.x < 0 || place.y < 0 || place.x + size.width > width || place.y + size.height > height) {
      throw new RangeError(`La pieza ${id} se sale del mapa`);
    }
    for (let dy = 0; dy < size.height; dy++) {
      for (let dx = 0; dx < size.width; dx++) {
        const i = index({ x: place.x + dx, y: place.y + dy });
        if (locked[i]) throw new RangeError(`La pieza ${id} se pisa con otra pieza`);
        if (i === index(entrance)) throw new RangeError(`La pieza ${id} tapa la entrada`);
        locked[i] = 1;
        tiles[i] = grid[dy]?.[dx] ?? 'grass';
      }
    }
    const link = { x: place.x + place.piece.link.x, y: place.y + place.piece.link.y };
    return { id, x: place.x, y: place.y, width: size.width, height: size.height, link };
  });

  // Claro de hierba alrededor de la entrada y de cada enlace, para que el
  // camino no empiece ni acabe contra el agua o el bosque.
  const stops = [entrance, ...places.map((p) => p.link)];
  for (const stop of stops) {
    for (let dy = -CLEARING_RADIUS; dy <= CLEARING_RADIUS; dy++) {
      for (let dx = -CLEARING_RADIUS; dx <= CLEARING_RADIUS; dx++) {
        const p = { x: stop.x + dx, y: stop.y + dy };
        if (Math.abs(dx) + Math.abs(dy) > CLEARING_RADIUS || !insideMap(p, width, height)) continue;
        const i = index(p);
        if (!locked[i] && (tiles[i] === 'water' || tiles[i] === 'tree')) tiles[i] = 'grass';
      }
    }
  }

  tiles[index(entrance)] = 'path';
  for (let s = 1; s < stops.length; s++) {
    const from = stops[s - 1] as Point;
    const to = stops[s] as Point;
    const route = cheapestRoute(tiles, locked, width, height, index(from), index(to));
    if (route === null) {
      throw new RangeError(`No hay forma de llegar de (${from.x}, ${from.y}) a (${to.x}, ${to.y}): revisa las piezas`);
    }
    for (const i of route) if (!locked[i]) tiles[i] = 'path';
  }

  // Abrir camino puede dejar árboles o agua sueltos: vuelven a hierba (fuera de las piezas).
  for (const kind of ['tree', 'water'] as const) {
    for (let i = 0; i < tiles.length; i++) {
      if (locked[i] || tiles[i] !== kind) continue;
      if (!neighbors(i, width, height).some((n) => tiles[n] === kind)) tiles[i] = 'grass';
    }
  }

  return { width, height, tiles, entrance, places };
}

/**
 * true si se puede ir andando de `from` a `to` (búsqueda en anchura por
 * casillas transitables, en cruz).
 */
export function isReachable(map: WorldMap, from: Point, to: Point): boolean {
  const { width, height, tiles } = map;
  if (!insideMap(from, width, height) || !insideMap(to, width, height)) return false;
  const start = from.y * width + from.x;
  const goal = to.y * width + to.x;
  if (!isWalkable(tiles[start]) || !isWalkable(tiles[goal])) return false;

  const seen = new Uint8Array(tiles.length);
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as number;
    if (current === goal) return true;
    for (const n of neighbors(current, width, height)) {
      if (!seen[n] && isWalkable(tiles[n])) {
        seen[n] = 1;
        queue.push(n);
      }
    }
  }
  return false;
}

/**
 * Camino más barato (Dijkstra) de `start` a `goal`, sin entrar en piezas
 * salvo en la casilla de destino. Devuelve los índices del recorrido o
 * null si no se puede llegar.
 */
function cheapestRoute(
  tiles: readonly TileKind[],
  locked: Uint8Array,
  width: number,
  height: number,
  start: number,
  goal: number,
): number[] | null {
  const cost = new Float64Array(tiles.length).fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(tiles.length).fill(-1);
  const heap = new MinHeap();
  cost[start] = 0;
  heap.push(0, start);

  while (heap.size > 0) {
    const [current, currentCost] = heap.pop();
    if (current === goal) break;
    if (currentCost > (cost[current] ?? 0)) continue;
    for (const n of neighbors(current, width, height)) {
      if (locked[n] && n !== goal) continue;
      const step = STEP_COST[tiles[n] ?? 'grass'];
      const next = currentCost + step;
      if (Number.isFinite(step) && next < (cost[n] ?? Number.POSITIVE_INFINITY)) {
        cost[n] = next;
        previous[n] = current;
        heap.push(next, n);
      }
    }
  }

  if (!Number.isFinite(cost[goal] ?? Number.POSITIVE_INFINITY)) return null;
  const route: number[] = [];
  for (let i = goal; i !== -1; i = previous[i] ?? -1) route.push(i);
  return route.reverse();
}

function insideMap(p: Point, width: number, height: number): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
}

function onMapBorder(p: Point, width: number, height: number): boolean {
  return p.x === 0 || p.y === 0 || p.x === width - 1 || p.y === height - 1;
}

/** Montículo mínimo por coste; en empate sale antes el índice menor, para que sea reproducible. */
class MinHeap {
  private readonly costs: number[] = [];
  private readonly items: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(cost: number, item: number): void {
    this.costs.push(cost);
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Saca el de menor coste: [elemento, coste]. Solo se llama con size > 0. */
  pop(): [number, number] {
    const top: [number, number] = [this.items[0] ?? -1, this.costs[0] ?? 0];
    const lastItem = this.items.pop() ?? -1;
    const lastCost = this.costs.pop() ?? 0;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.costs[0] = lastCost;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.less(left, smallest)) smallest = left;
        if (right < this.items.length && this.less(right, smallest)) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private less(a: number, b: number): boolean {
    const ca = this.costs[a] ?? 0;
    const cb = this.costs[b] ?? 0;
    return ca < cb || (ca === cb && (this.items[a] ?? 0) < (this.items[b] ?? 0));
  }

  private swap(a: number, b: number): void {
    [this.costs[a], this.costs[b]] = [this.costs[b] ?? 0, this.costs[a] ?? 0];
    [this.items[a], this.items[b]] = [this.items[b] ?? 0, this.items[a] ?? 0];
  }
}
