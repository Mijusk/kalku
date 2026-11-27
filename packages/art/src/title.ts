import { createRng, type Rng } from '@kalku/exercises';
import { hex, newGrid, setPx, shape, tone, type Grid, type Ramp } from './grid.js';
import { MATERIAL, OUTLINE } from './palette.js';

/**
 * Paisaje de la pantalla de inicio: un atardecer sobre Pradera Uno, dibujado
 * por código para cualquier tamaño (se adapta a móvil en vertical y a
 * pantallas anchas). Lo fijo sale de aquí; lo que se mueve (nubes, estrellas,
 * criaturas, números que suben) lo anima el juego encima.
 */

const ramp = (...colors: string[]): Ramp => colors.map(hex);

/** Cielo de arriba (noche) a abajo (horizonte dorado). */
export const TITLE_SKY = ramp(
  '#1d1a4a', '#262059', '#30276a', '#3d2f7a', '#4f3887', '#664190', '#844a95',
  '#a25495', '#c26190', '#dd7186', '#ef857c', '#f8a074', '#fdbd74', '#ffd98a',
);

const SUN = ramp('#fffbe6', '#fff0b0', '#ffd978', '#f6b45c');
/** Montañas lejanas: luz, cuerpo, sombra, nieve con luz, nieve en sombra, niebla. */
const FAR = ramp('#9a7ac6', '#7a5aa8', '#664a94', '#f6eeff', '#cdbbe8', '#c27a9e');
const NEAR = ramp('#5a5ea6', '#44468a', '#363774', '#e4def8', '#b4aada', '#7a5f9e');
const LAKE = ramp('#ffe2a8', '#f6a87c', '#e48c84', '#c8708c', '#a85e8c');
const HILL_BACK = ramp('#7cbf7e', '#4a8c66', '#3c7a5e', '#2c6352');
const TREE_BACK = ramp('#5aa66a', '#2f6e52', '#1b4438');
const GRASS = MATERIAL.hierba;

/** Umbrales de un tramado ordenado 4×4 (Bayer), de 0 a 1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Mezcla dos colores con tramado: `t` (0–1) es cuánto del segundo. */
function dither(a: number, b: number, t: number, x: number, y: number): number {
  return t > (BAYER[(y % 4) * 4 + (x % 4)] ?? 0.5) ? b : a;
}

export interface TitleLayout {
  width: number;
  height: number;
  /** Fila donde acaban las montañas y empieza el lago. */
  horizon: number;
  lakeBottom: number;
  /** Fila donde empieza el suelo de casillas (el juego pone ahí la hierba y las criaturas). */
  groundTop: number;
  sun: { x: number; y: number; r: number };
}

/** Dónde va cada franja para un lienzo de `width × height` píxeles. */
export function titleLayout(width: number, height: number): TitleLayout {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 96) {
    throw new RangeError(`Tamaño de portada no válido: ${width}×${height}`);
  }
  const groundTop = height - Math.max(34, Math.round(height * 0.2));
  const horizon = groundTop - Math.max(20, Math.round(height * 0.16));
  const lakeBottom = horizon + Math.max(6, Math.round(height * 0.05));
  const r = Math.max(9, Math.round(Math.min(width, height) * 0.1));
  return { width, height, horizon, lakeBottom, groundTop, sun: { x: Math.round(width * 0.74), y: horizon - Math.max(r + 4, Math.round(horizon * 0.2)), r } };
}

/** Cordillera: altura de cada columna y de qué pico es (para saber qué ladera da a la luz). */
function ridge(rng: Rng, width: number, minH: number, maxH: number, count: number): { h: number[]; peakX: number[] } {
  const peaks = Array.from({ length: count }, (_, i) => ({
    x: Math.round(((i + 0.2 + rng.next() * 0.6) / count) * width),
    h: minH + rng.next() * (maxH - minH),
    slope: 0.55 + rng.next() * 0.5,
  }));
  const h: number[] = [];
  const peakX: number[] = [];
  for (let x = 0; x < width; x++) {
    let best = 0;
    let bx = 0;
    for (const p of peaks) {
      const v = p.h - Math.abs(x - p.x) * p.slope;
      if (v > best) {
        best = v;
        bx = p.x;
      }
    }
    // Pequeñas rocas en la ladera para que no quede una línea recta.
    h.push(Math.max(0, Math.round(best + (rng.next() < 0.3 ? 1 : 0))));
    peakX.push(bx);
  }
  return { h, peakX };
}

function paintRange(g: Grid, rng: Rng, l: TitleLayout, colors: Ramp, minH: number, maxH: number, count: number, snowFrom: number): void {
  const { h, peakX } = ridge(rng, l.width, minH, maxH, count);
  for (let x = 0; x < l.width; x++) {
    const height = h[x] ?? 0;
    const top = l.horizon - height;
    const lit = x < (peakX[x] ?? 0);
    for (let y = Math.max(0, top); y < l.horizon; y++) {
      const depth = y - top;
      let c = depth === 0 && lit ? tone(colors, 0) : lit ? tone(colors, 1) : tone(colors, 2);
      // Nieve en las cumbres altas, con la punta irregular.
      if (height > snowFrom && depth < Math.max(2, Math.round((height - snowFrom) * 0.6)) + ((x * 7) % 3)) c = lit ? tone(colors, 3) : tone(colors, 4);
      // Niebla al pie: el monte se funde con el horizonte.
      const fog = 1 - (l.horizon - y) / Math.max(6, height * 0.55);
      if (fog > 0) c = dither(c, tone(colors, 5), fog, x, y);
      setPx(g, x, y, c);
    }
  }
}

/**
 * El paisaje fijo de la portada: cielo con el sol, dos cordilleras, el lago,
 * las colinas con árboles y una casita con la luz encendida. De `groundTop`
 * hacia abajo queda transparente (allí va la hierba de casillas del juego).
 */
export function drawTitleLandscape(width: number, height: number, seed: number): Grid {
  const l = titleLayout(width, height);
  const g = newGrid(width, height);
  const rng = createRng(seed);
  const last = TITLE_SKY.length - 1;

  // Cielo con tramado y el halo del sol.
  for (let y = 0; y < l.lakeBottom; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - l.sun.x, (y - l.sun.y) * 1.15) / l.sun.r;
      const glow = d < 2.6 ? ((2.6 - d) / 1.6) * 3 : 0;
      const t = Math.min(last, (y / l.horizon) * last + glow);
      const i = Math.floor(t);
      setPx(g, x, y, dither(tone(TITLE_SKY, i), tone(TITLE_SKY, i + 1), t - i, x, y));
    }
  }
  // Sol: claro arriba a la izquierda, con borde cálido.
  const { sun } = l;
  shape(g, sun.x - sun.r, sun.y - sun.r, sun.r * 2, sun.r * 2,
    (x, y) => Math.hypot(x - sun.r, y - sun.r) <= sun.r,
    (x, y, px, py) => {
      const u = (x - sun.r) / sun.r;
      const v = (y - sun.r) / sun.r;
      const t = (u + v + 2) / 4;
      if (t < 0.38) return dither(tone(SUN, 0), tone(SUN, 1), t / 0.38, px, py);
      if (t < 0.7) return tone(SUN, 1);
      return dither(tone(SUN, 1), tone(SUN, 2), (t - 0.7) / 0.3, px, py);
    },
    tone(SUN, 3));

  const scale = l.horizon / 140;
  paintRange(g, rng, l, FAR, 22 * scale, 52 * scale, Math.max(3, Math.round(width / 70)), 36 * scale);
  paintRange(g, rng, l, NEAR, 10 * scale, 30 * scale, Math.max(3, Math.round(width / 50)), 26 * scale);

  // Lago: refleja el cielo del horizonte y el sol (rayas que brillan).
  for (let y = l.horizon; y < l.lakeBottom; y++) {
    const t = ((y - l.horizon) / Math.max(1, l.lakeBottom - l.horizon)) * 3;
    for (let x = 0; x < width; x++) {
      const i = 1 + Math.floor(t);
      let c = dither(tone(LAKE, i), tone(LAKE, i + 1), t % 1, x, y);
      const spread = sun.r * (0.9 - (y - l.horizon) * 0.05);
      if (Math.abs(x - sun.x) < spread && (x + y * 3) % 5 < 3 && y % 2 === 0) c = tone(LAKE, 0);
      setPx(g, x, y, c);
    }
  }

  // Colinas del fondo: altas a los lados y bajas en el centro, para dejar ver el lago.
  const backTop: number[] = [];
  for (let x = 0; x < width; x++) {
    const side = Math.abs(x / width - 0.5) * 2;
    const top = Math.min(l.lakeBottom, Math.round(l.lakeBottom - 1 - side * side * (l.groundTop - l.horizon) * 0.9 - 1.5 * Math.sin(x / 6.3) - Math.sin(x / 2.7)));
    backTop.push(top);
    for (let y = top; y < l.groundTop; y++) {
      const depth = (y - top) / Math.max(1, l.groundTop - top);
      setPx(g, x, y, y === top ? tone(HILL_BACK, 0) : dither(tone(HILL_BACK, 1), tone(HILL_BACK, 3), depth * 0.9, x, y));
    }
  }
  // Arbolitos redondos en las colinas del fondo.
  for (let x = 2; x < width - 2; x += 3 + rng.int(0, 5)) {
    const top = backTop[x] ?? l.lakeBottom;
    if (top > l.lakeBottom - 3) continue;
    const r = rng.int(2, 3);
    shape(g, x - r, top - r - 1, r * 2 + 1, r * 2 + 1,
      (px, py) => Math.hypot(px - r - 0.5, py - r - 0.5) <= r + 0.3,
      (px, py) => (px + py < r * 1.4 ? tone(TREE_BACK, 0) : tone(TREE_BACK, 1)),
      tone(TREE_BACK, 2));
    setPx(g, x, top + r - 1, tone(MATERIAL.corteza, 2));
  }
  // Una casita con la ventana encendida en la colina de la izquierda.
  const hx = Math.round(width * 0.14);
  const hy = (backTop[hx] ?? l.lakeBottom) - 5;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) setPx(g, hx + x, hy + y, x === 0 || x === 6 || y === 4 ? OUTLINE : tone(MATERIAL.pared, 1));
  for (let y = 0; y < 3; y++) for (let x = -1 + y; x < 8 - y; x++) setPx(g, hx + x, hy - 3 + y, y === 0 || x === -1 + y || x === 7 - y ? OUTLINE : tone(MATERIAL.tejadoRojo, 1));
  setPx(g, hx + 2, hy + 2, hex('#ffd84d'));
  setPx(g, hx + 4, hy + 2, hex('#ffd84d'));

  // Colinas de delante, de hierba, que llegan hasta el suelo de casillas.
  for (let x = 0; x < width; x++) {
    const top = Math.round(l.groundTop - 3 - 3 * (0.5 + 0.5 * Math.sin(x / 11 + 1)) - 2 * Math.sin(x / 5.3));
    for (let y = top; y < l.groundTop; y++) {
      const depth = (y - top) / Math.max(1, l.groundTop - top);
      setPx(g, x, y, y === top ? tone(GRASS, 0) : dither(tone(GRASS, 2), tone(GRASS, 1), depth, x, y));
    }
  }
  return g;
}

/** Nube de bloques redondos con la base plana, en tonos de atardecer. */
export function drawCloud(seed: number, width: number): Grid {
  const rng = createRng(seed);
  const w = Math.max(14, Math.round(width));
  const h = Math.max(8, Math.round(w * 0.5));
  const g = newGrid(w, h);
  const base = h - 2;
  const count = 3 + rng.int(0, 1);
  // Bolas: las del centro más grandes, todas apoyadas en la misma base.
  const puffs = Array.from({ length: count }, (_, i) => {
    const middle = 1 - Math.abs((i + 0.5) / count - 0.5) * 2;
    const r = h * (0.3 + 0.32 * middle + rng.next() * 0.08);
    return { x: 2 + r * 0.8 + ((w - 4 - r * 1.6) * i) / Math.max(1, count - 1), y: base - r * 0.55, r };
  });
  const colors = ramp('#ffe6f0', '#f8bdd4', '#d993bb', '#9c6497');
  shape(g, 0, 0, w, h,
    (x, y) => y <= base && puffs.some((p) => Math.hypot(x - p.x, y - p.y) <= p.r),
    (x, y, px, py) => {
      const t = y / base;
      return t < 0.45 ? dither(tone(colors, 0), tone(colors, 1), t * 2.2, px, py) : t < 0.82 ? tone(colors, 1) : tone(colors, 2);
    },
    tone(colors, 3));
  return g;
}

/** Ancho y alto de la isla flotante. */
export const ISLAND_W = 44;
export const ISLAND_H = 40;

/** Isla que flota en el cielo: hierba, roca que se estrecha hacia abajo, un árbol y una cascada. */
export function drawFloatingIsland(seed: number): Grid {
  const rng = createRng(seed);
  const g = newGrid(ISLAND_W, ISLAND_H);
  const top = 14;
  const cx = ISLAND_W / 2;
  const rock = MATERIAL.tierra;
  const jag = Array.from({ length: ISLAND_W }, () => rng.int(0, 2));
  // Roca: un cono invertido con el borde de abajo mellado.
  shape(g, 0, top, ISLAND_W, ISLAND_H - top,
    (x, y) => {
      const half = (ISLAND_W / 2 - 2) * (1 - y / (ISLAND_H - top)) ** 0.8;
      return Math.abs(x - cx) <= half && y < ISLAND_H - top - (jag[Math.floor(x)] ?? 0);
    },
    (x, y, px, py) => {
      const lit = x < cx - 2;
      const shade = y / (ISLAND_H - top);
      return dither(tone(rock, lit ? 1 : 2), tone(rock, 3), shade * (lit ? 0.8 : 1.2), px, py);
    },
    OUTLINE);
  // Hierba de arriba.
  shape(g, 1, top - 3, ISLAND_W - 2, 7,
    (x, y) => Math.abs((x - (ISLAND_W - 2) / 2) / ((ISLAND_W - 2) / 2)) ** 2 + Math.abs((y - 3.5) / 3.5) ** 2 <= 1,
    (x, y) => (y < 3 ? (x < ISLAND_W / 2 ? tone(GRASS, 0) : tone(GRASS, 1)) : tone(GRASS, 2)),
    OUTLINE);
  // Árbol redondo.
  const leaf = MATERIAL.hoja;
  for (let y = top - 6; y < top - 2; y++) setPx(g, 13, y, tone(MATERIAL.corteza, 1));
  shape(g, 6, 0, 15, 12,
    (x, y) => Math.hypot(x - 7.5, y - 6) <= 6.2 || Math.hypot(x - 4, y - 8) <= 3.5 || Math.hypot(x - 11, y - 8) <= 3.5,
    (x, y) => {
      const d = (x - 4) * 0.5 + (y - 3) * 0.7;
      return d < 0 ? tone(leaf, 0) : d < 4 ? tone(leaf, 1) : tone(leaf, 2);
    },
    OUTLINE);
  // Cascada por el lado derecho.
  const water = MATERIAL.agua;
  for (let y = top + 1; y < ISLAND_H; y++) {
    setPx(g, 33, y, tone(water, y % 3 === 0 ? 0 : 1));
    setPx(g, 34, y, tone(water, (y + 1) % 3 === 0 ? 0 : 2));
  }
  // Una piedra brillante (un cristal de número) en la hierba.
  setPx(g, 27, top - 3, OUTLINE);
  setPx(g, 27, top - 2, hex('#ecdcff'));
  setPx(g, 28, top - 2, hex('#9a74d8'));
  setPx(g, 26, top - 2, OUTLINE);
  setPx(g, 29, top - 2, OUTLINE);
  return g;
}

/** Cifras y signos de 3×5 para los números que suben como luciérnagas (adorno, no texto). */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  '=': ['...', '###', '...', '###', '...'],
  x: ['...', '#.#', '.#.', '#.#', '...'],
};

export const GLYPH_CHARS: readonly string[] = Object.keys(GLYPHS);

/** Una cifra o signo de 5×7 con borde, en el color dado. */
export function drawGlyph(ch: string, color: number, border: number): Grid {
  const rows = GLYPHS[ch];
  if (!rows) throw new RangeError(`No hay dibujo para «${ch}»`);
  const g = newGrid(5, 7);
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '#') return;
      for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]] as const) {
        if (rows[y + dy - 1]?.[x + dx - 1] !== '#') setPx(g, x + dx, y + dy, border);
      }
    });
  });
  rows.forEach((row, y) => [...row].forEach((c, x) => c === '#' && setPx(g, x + 1, y + 1, color)));
  return g;
}
