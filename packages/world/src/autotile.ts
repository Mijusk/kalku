import type { TileKind, WorldMap } from './types.js';

/**
 * Bits de la máscara de vecinas. Un bit encendido quiere decir que la
 * casilla de ese lado es del mismo tipo (está «unida»). Las cuatro primeras
 * son los lados; las diagonales solo se usan en modo 8.
 */
export const MASK = {
  N: 1,
  E: 2,
  S: 4,
  W: 8,
  NE: 16,
  SE: 32,
  SW: 64,
  NW: 128,
} as const;

/** 4: solo lados (16 variantes). 8: lados y esquinas (47 variantes). */
export type AutotileMode = 4 | 8;

/**
 * Traduce máscaras a variantes de un pack de gráficos. Cambiar de pack es
 * escribir otra tabla: la lógica no cambia.
 */
export interface AutotileTable {
  readonly id: string;
  /** Tipo de casilla al que se aplica (agua, camino…). */
  readonly kind: TileKind;
  readonly mode: AutotileMode;
  /** Máscara → índice de variante en el pack. */
  readonly variants: Readonly<Record<number, number>>;
  /** Variante si la máscara no está en la tabla. */
  readonly fallback: number;
}

const SIDES = [
  { bit: MASK.N, dx: 0, dy: -1 },
  { bit: MASK.E, dx: 1, dy: 0 },
  { bit: MASK.S, dx: 0, dy: 1 },
  { bit: MASK.W, dx: -1, dy: 0 },
] as const;

/** Cada esquina, con los dos lados que tiene que tener unidos para contar. */
const CORNERS = [
  { bit: MASK.NE, dx: 1, dy: -1, sides: MASK.N | MASK.E },
  { bit: MASK.SE, dx: 1, dy: 1, sides: MASK.S | MASK.E },
  { bit: MASK.SW, dx: -1, dy: 1, sides: MASK.S | MASK.W },
  { bit: MASK.NW, dx: -1, dy: -1, sides: MASK.N | MASK.W },
] as const;

/**
 * Máscara de vecinas de la casilla (x, y): qué lados (y esquinas, en modo 8)
 * son del mismo tipo que ella. Fuera del mapa cuenta como unido, para que el
 * agua o el camino que tocan el borde sigan sin dibujar orilla.
 *
 * En modo 8 una esquina solo cuenta si sus dos lados están unidos: si no,
 * esa esquina ya la tapa la orilla de un lado y daría igual. Así salen 47
 * máscaras distintas en vez de 256.
 */
export function neighborMask(map: WorldMap, x: number, y: number, mode: AutotileMode): number {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) {
    throw new RangeError(`La casilla (${x}, ${y}) está fuera del mapa`);
  }
  const kind = map.tiles[y * map.width + x];
  const same = (dx: number, dy: number): boolean => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return true;
    return map.tiles[ny * map.width + nx] === kind;
  };

  let mask = 0;
  for (const side of SIDES) if (same(side.dx, side.dy)) mask |= side.bit;
  if (mode === 8) {
    for (const corner of CORNERS) {
      if ((mask & corner.sides) === corner.sides && same(corner.dx, corner.dy)) mask |= corner.bit;
    }
  }
  return mask;
}

/** Todas las máscaras que puede devolver `neighborMask` en ese modo, de menor a mayor. */
export function validMasks(mode: AutotileMode): number[] {
  const masks: number[] = [];
  const limit = mode === 4 ? 16 : 256;
  for (let mask = 0; mask < limit; mask++) {
    const valid = CORNERS.every((c) => (mask & c.bit) === 0 || (mask & c.sides) === c.sides);
    if (valid) masks.push(mask);
  }
  return masks;
}

/** Variante que toca a una máscara según la tabla (o la de reserva). */
export function variantFor(mask: number, table: AutotileTable): number {
  return table.variants[mask] ?? table.fallback;
}

/**
 * Comprueba que una tabla está bien escrita: solo máscaras posibles en su
 * modo y variantes enteras no negativas. Lanza RangeError si no.
 */
export function validateTable(table: AutotileTable): void {
  const valid = new Set(validMasks(table.mode));
  const isVariant = (v: number): boolean => Number.isInteger(v) && v >= 0;
  for (const [key, variant] of Object.entries(table.variants)) {
    const mask = Number(key);
    if (!valid.has(mask)) throw new RangeError(`La tabla ${table.id} tiene la máscara ${key}, que no existe en modo ${table.mode}`);
    if (!isVariant(variant)) throw new RangeError(`La tabla ${table.id} da una variante no válida a la máscara ${key}`);
  }
  if (!isVariant(table.fallback)) throw new RangeError(`La tabla ${table.id} tiene una variante de reserva no válida`);
}

/**
 * Variante de cada casilla del mapa para una tabla: el índice de variante en
 * las casillas de su tipo y -1 en las demás. Mismo orden que `map.tiles`.
 */
export function autotile(map: WorldMap, table: AutotileTable): Int32Array {
  validateTable(table);
  const result = new Int32Array(map.tiles.length).fill(-1);
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i] !== table.kind) continue;
    const mask = neighborMask(map, i % map.width, Math.floor(i / map.width), table.mode);
    result[i] = variantFor(mask, table);
  }
  return result;
}

/** Tabla de 16 variantes donde la variante es la propia máscara de lados (0–15). */
function basicTable(id: string, kind: TileKind): AutotileTable {
  const variants: Record<number, number> = {};
  for (const mask of validMasks(4)) variants[mask] = mask;
  return { id, kind, mode: 4, variants, fallback: 15 };
}

/**
 * Tablas de 16 variantes (solo lados): una variante por máscara de lados.
 * Las más sencillas; el juego usa las de 47 (`WATER_TILES_8`, `PATH_TILES_8`).
 */
export const WATER_TILES = basicTable('agua-basica', 'water');
export const PATH_TILES = basicTable('camino-basico', 'path');

/**
 * Tabla de 47 variantes (modo 8): la variante es el lugar de la máscara en
 * `validMasks(8)`, de menor a mayor. Cada variante lleva sus lados y sus
 * esquinas, que es lo que necesita el generador de dibujos (`@kalku/art`).
 */
function fullTable(id: string, kind: TileKind): AutotileTable {
  const masks = validMasks(8);
  const variants: Record<number, number> = {};
  masks.forEach((mask, index) => {
    variants[mask] = index;
  });
  return { id, kind, mode: 8, variants, fallback: masks.length - 1 };
}

/** Tablas de agua y camino que usa el juego con los dibujos generados. */
export const WATER_TILES_8 = fullTable('agua-47', 'water');
export const PATH_TILES_8 = fullTable('camino-47', 'path');
