/**
 * Rejilla de píxeles: un color 0xRRGGBB por casilla, o `EMPTY` si es
 * transparente. Todos los dibujos del juego se pintan aquí, sin canvas ni
 * Phaser, para que se puedan probar.
 */
export interface Grid {
  readonly width: number;
  readonly height: number;
  /** Colores por filas (y * width + x). */
  readonly px: Int32Array;
}

export const EMPTY = -1;

export function newGrid(width: number, height: number): Grid {
  return { width, height, px: new Int32Array(width * height).fill(EMPTY) };
}

/** Pinta un píxel (coordenadas enteras; fuera de la rejilla no hace nada). */
export function setPx(g: Grid, x: number, y: number, color: number): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= g.width || iy >= g.height) return;
  g.px[iy * g.width + ix] = color;
}

export function getPx(g: Grid, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= g.width || y >= g.height) return EMPTY;
  return g.px[y * g.width + x] ?? EMPTY;
}

/** Copia `src` sobre `dst` en (ox, oy), sin pisar con los píxeles transparentes. */
export function blit(dst: Grid, src: Grid, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const color = getPx(src, x, y);
      if (color !== EMPTY) setPx(dst, ox + x, oy + y, color);
    }
  }
}

/** Escala de tonos de un material: del más claro (luz) al más oscuro. */
export type Ramp = readonly number[];

/** Tono `i` de la escala; si se pasa, el último. */
export function tone(ramp: Ramp, i: number): number {
  const last = ramp.length - 1;
  return ramp[Math.min(Math.max(0, i), last)] ?? 0;
}

/**
 * Pinta una forma con contorno: `inside` dice qué puntos (en coordenadas de
 * la caja w×h) son de la forma; los de dentro se pintan con `colorAt` y los
 * del borde con `outline` (si hay).
 */
export function shape(
  g: Grid,
  ox: number,
  oy: number,
  w: number,
  h: number,
  inside: (x: number, y: number) => boolean,
  colorAt: (x: number, y: number, px: number, py: number) => number,
  outline: number | null,
): void {
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = inside(x + 0.5, y + 0.5) ? 1 : 0;
  const isIn = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isIn(x, y)) continue;
      const edge = !isIn(x - 1, y) || !isIn(x + 1, y) || !isIn(x, y - 1) || !isIn(x, y + 1);
      setPx(g, ox + x, oy + y, edge && outline !== null ? outline : colorAt(x + 0.5, y + 0.5, x, y));
    }
  }
}

/**
 * Luz fija desde arriba a la izquierda. `u` y `v` (−1…1) son la posición en
 * una forma redonda; devuelve el tono: 0 (luz) … 3 (sombra). Un pequeño
 * tramado según el píxel evita bandas lisas.
 */
export function light(u: number, v: number, px: number, py: number): 0 | 1 | 2 | 3 {
  const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
  let d = -0.45 * u - 0.55 * v + 0.7 * nz;
  d += (px + py) % 2 !== 0 ? 0.02 : -0.02;
  return d > 0.82 ? 0 : d > 0.42 ? 1 : d > 0.08 ? 2 : 3;
}

/** Cuántos bytes de RGBA ocupa una rejilla. */
export function gridToRgba(g: Grid): Uint8ClampedArray {
  return writeRgba(new Uint8ClampedArray(g.width * g.height * 4), g.width, g, 0);
}

function writeRgba(data: Uint8ClampedArray, stride: number, g: Grid, ox: number): Uint8ClampedArray {
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const color = getPx(g, x, y);
      if (color === EMPTY) continue;
      const i = (y * stride + ox + x) * 4;
      data[i] = (color >> 16) & 255;
      data[i + 1] = (color >> 8) & 255;
      data[i + 2] = color & 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Varias rejillas del mismo tamaño en una tira horizontal, lista para una textura. */
export interface Sheet {
  readonly width: number;
  readonly height: number;
  /** Ancho de cada fotograma (todos miden lo mismo; el alto es `height`). */
  readonly cell: number;
  readonly rgba: Uint8ClampedArray;
}

export function toSheet(grids: readonly Grid[]): Sheet {
  const first = grids[0];
  if (first === undefined) throw new RangeError('Una tira necesita al menos un dibujo');
  const cell = first.width;
  const height = first.height;
  const width = cell * grids.length;
  const rgba = new Uint8ClampedArray(width * height * 4);
  grids.forEach((g, i) => {
    if (g.width !== cell || g.height !== height) throw new RangeError(`El dibujo ${i} no mide ${cell}×${height}`);
    writeRgba(rgba, width, g, i * cell);
  });
  return { width, height, cell, rgba };
}

/** Convierte '#rrggbb' en número 0xRRGGBB. */
export function hex(color: string): number {
  return Number.parseInt(color.slice(1), 16);
}
