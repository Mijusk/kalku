import { createRng } from '@kalku/exercises';
import { valueNoise } from './noise.js';
import type { FeatureKind, RegionSpec, TileKind, WorldMap } from './types.js';

interface Layer {
  readonly kind: FeatureKind;
  /** Tamaño aproximado de las manchas, en casillas. */
  readonly cellSize: number;
  readonly octaves: number;
  /** true si no puede haber casillas sueltas de este tipo. */
  readonly clustered: boolean;
}

/**
 * Orden en que se reparten las casillas: cada capa elige entre las que
 * siguen libres (hierba). El agua va primero para que los lagos sean
 * grandes; las flores al final, en lo que queda.
 */
const LAYERS: readonly Layer[] = [
  { kind: 'water', cellSize: 10, octaves: 3, clustered: true },
  { kind: 'tree', cellSize: 6, octaves: 3, clustered: true },
  { kind: 'tallGrass', cellSize: 5, octaves: 2, clustered: false },
  { kind: 'flowers', cellSize: 3, octaves: 2, clustered: false },
];

/**
 * Genera el terreno de una región. Con la misma semilla y región sale
 * siempre el mismo mapa. Cada tipo ocupa su proporción redondeada a
 * casillas, salvo que la regla de agrupación obligue a quitar alguna
 * casilla suelta que no se pueda recolocar.
 */
export function generateTerrain(region: RegionSpec, seed: number): WorldMap {
  validateRegion(region);
  const { width, height } = region;
  const total = width * height;
  const tiles = new Array<TileKind>(total).fill('grass');

  const targets = layerTargets(region, total);
  const seeds = createRng(seed);
  for (const [index, layer] of LAYERS.entries()) {
    // Cada capa tiene su propia semilla: así sus manchas no coinciden con las de otra.
    const noise = valueNoise(width, height, layer.cellSize, layer.octaves, createRng(seeds.int(0, 0xffffffff)));
    let target = targets[index] ?? 0;
    // Un grupo necesita al menos 2 casillas.
    if (layer.clustered && target < 2) target = 0;

    const free = byNoiseDesc(noise).filter((i) => tiles[i] === 'grass');
    for (const i of free.slice(0, target)) tiles[i] = layer.kind;

    if (layer.clustered) {
      enforceClusters(tiles, width, height, layer.kind, Math.min(target, free.length), noise);
    }
  }

  return { width, height, tiles };
}

/** Casilla en (x, y), o undefined si está fuera del mapa. */
export function tileAt(map: WorldMap, x: number, y: number): TileKind | undefined {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.tiles[y * map.width + x];
}

/** Índices de las casillas vecinas (arriba, abajo, izquierda, derecha). */
export function neighbors(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  if (y > 0) result.push(index - width);
  if (y < height - 1) result.push(index + width);
  if (x > 0) result.push(index - 1);
  if (x < width - 1) result.push(index + 1);
  return result;
}

function validateRegion(region: RegionSpec): void {
  const { width, height, proportions } = region;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError(`Tamaño de región no válido: ${width}×${height}`);
  }
  let sum = 0;
  for (const layer of LAYERS) {
    const p = proportions[layer.kind];
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new RangeError(`Proporción no válida para ${layer.kind}: ${p}`);
    }
    sum += p;
  }
  if (sum > 1 + 1e-9) throw new RangeError(`Las proporciones suman más de 1: ${sum}`);
}

/**
 * Casillas de cada capa, calculadas juntas: se redondea hacia abajo y los
 * restos se dan a las capas con más decimales (en empate, la que va
 * antes). Así la suma nunca pasa del total redondeado de lo pedido.
 */
function layerTargets(region: RegionSpec, total: number): number[] {
  const exact = LAYERS.map((layer) => region.proportions[layer.kind] * total);
  const targets = exact.map((x) => Math.floor(x));
  const wanted = Math.min(total, Math.round(exact.reduce((a, b) => a + b, 0)));
  let missing = wanted - targets.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of byRemainder) {
    if (missing <= 0) break;
    targets[i] = (targets[i] ?? 0) + 1;
    missing--;
  }
  return targets;
}

/** Índices ordenados de mayor a menor ruido; en empate, el índice menor primero. */
function byNoiseDesc(noise: Float64Array): number[] {
  return Array.from(noise.keys()).sort((a, b) => (noise[b] ?? 0) - (noise[a] ?? 0) || a - b);
}

/**
 * Regla de agrupación: ninguna casilla de `kind` puede quedar sin otra
 * igual al lado. Las sueltas vuelven a hierba y se recolocan tantas
 * como falten pegadas a grupos existentes, por orden de ruido.
 */
function enforceClusters(
  tiles: TileKind[],
  width: number,
  height: number,
  kind: TileKind,
  target: number,
  noise: Float64Array,
): void {
  const hasSameNeighbor = (i: number): boolean => neighbors(i, width, height).some((n) => tiles[n] === kind);
  const removeIsolated = (): void => {
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === kind && !hasSameNeighbor(i)) tiles[i] = 'grass';
    }
  };

  removeIsolated();
  let count = tiles.filter((t) => t === kind).length;

  const higher = (i: number, best: number): boolean => best === -1 || (noise[i] ?? 0) > (noise[best] ?? 0);

  // Sin grupos todavía, se empieza con una pareja: la casilla libre de más
  // ruido que tenga otra libre al lado, y la mejor de sus vecinas libres.
  if (count === 0 && target >= 2) {
    let first = -1;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] !== 'grass' || !neighbors(i, width, height).some((n) => tiles[n] === 'grass')) continue;
      if (higher(i, first)) first = i;
    }
    if (first !== -1) {
      let second = -1;
      for (const n of neighbors(first, width, height)) {
        if (tiles[n] === 'grass' && higher(n, second)) second = n;
      }
      tiles[first] = kind;
      tiles[second] = kind;
      count = 2;
    }
  }

  while (count > 0 && count < target) {
    let best = -1;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] !== 'grass' || !hasSameNeighbor(i)) continue;
      if (higher(i, best)) best = i;
    }
    if (best === -1) break;
    tiles[best] = kind;
    count++;
  }

  // Por si no quedaba sitio para completar algún grupo.
  removeIsolated();
}
