import { createRng, type Rng } from '@kalku/exercises';
import { MASK } from '@kalku/world';
import { light, newGrid, setPx, shape, tone, type Grid } from './grid.js';
import { FOAM, GOLD, MATERIAL, OUTLINE, WHITE } from './palette.js';

/** Lado de una casilla, en píxeles. */
export const TILE_PX = 16;

const G = MATERIAL.hierba;
const LAST = TILE_PX - 1;

/** Hierba con pequeñas variaciones: motas claras y oscuras y unas matas. */
export function drawGrass(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  paintGrass(g, createRng(seed));
  return g;
}

function paintGrass(g: Grid, rng: Rng): void {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const v = rng.next();
      setPx(g, x, y, v < 0.07 ? tone(G, 0) : v < 0.2 ? tone(G, 2) : tone(G, 1));
    }
  }
  for (let i = 0; i < 2; i++) {
    const tx = rng.int(2, 13);
    const ty = rng.int(3, 13);
    setPx(g, tx, ty, tone(G, 3));
    setPx(g, tx - 1, ty - 1, tone(G, 2));
    setPx(g, tx + 1, ty - 1, tone(G, 2));
    setPx(g, tx, ty - 1, tone(G, 0));
  }
}

/** Hierba alta: dos filas de briznas inclinadas. */
export function drawTallGrass(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  const rng = createRng(seed);
  paintGrass(g, rng);
  for (const base of [8, 15]) {
    for (let bx = base === 8 ? 1 : 0; bx < TILE_PX; bx += 2) {
      const h = rng.int(3, 5);
      const lean = rng.chance(0.5) ? 0 : 1;
      for (let i = 0; i < h; i++) {
        const color = i === 0 ? tone(G, 3) : i === h - 1 ? tone(G, 0) : tone(G, 2);
        setPx(g, bx + (i > h / 2 ? lean : 0), base - i, color);
      }
    }
  }
  return g;
}

/** Hierba con flores de colores. */
export function drawFlowers(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  const rng = createRng(seed);
  paintGrass(g, rng);
  const petals = [0xff9ed2, WHITE, GOLD];
  for (let i = 0; i < 3; i++) {
    const fx = rng.int(3, 12);
    const fy = rng.int(3, 12);
    const petal = rng.pick(petals);
    setPx(g, fx, fy + 1, tone(G, 3));
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) setPx(g, fx + dx, fy + dy, petal);
    setPx(g, fx, fy, petal === GOLD ? 0xf08f2e : GOLD);
  }
  return g;
}

/** Hierba con una piedrecita (no estorba: se puede pisar). */
export function drawRock(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  paintGrass(g, createRng(seed));
  shape(
    g, 0, 0, TILE_PX, TILE_PX,
    (x, y) => ((x - 8) / 3.4) ** 2 + ((y - 11) / 2.4) ** 2 <= 1,
    (x, y, px, py) => tone(MATERIAL.piedra, light((x - 8) / 3.4, (y - 11) / 2.4, px, py)),
    OUTLINE,
  );
  return g;
}

/** Árbol con sombra en el suelo, tronco y copa redondeada con luz. */
export function drawTree(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  paintGrass(g, createRng(seed));
  for (let py = 12; py < 16; py++) {
    for (let px = 1; px < 16; px++) {
      const u = (px + 0.5 - 8.5) / 6.5;
      const v = (py + 0.5 - 14) / 2;
      if (u * u + v * v <= 1) setPx(g, px, py, tone(G, 3));
    }
  }
  const bark = MATERIAL.corteza;
  shape(g, 0, 0, TILE_PX, TILE_PX, (x, y) => x >= 6.5 && x <= 9.5 && y >= 10 && y <= 15, (x) => (x < 8 ? tone(bark, 0) : tone(bark, 1)), OUTLINE);
  const blobs = [[8, 5.5, 5.6], [4.8, 8, 3.6], [11.2, 8, 3.6], [8, 9, 4]] as const;
  shape(
    g, 0, 0, TILE_PX, TILE_PX,
    (x, y) => blobs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r),
    (x, y, px, py) => tone(MATERIAL.hoja, light((x - 8) / 7.2, (y - 7.4) / 6.4, px, py)),
    OUTLINE,
  );
  return g;
}

/** La casilla del jefe: hierba con un círculo de runas en el suelo. */
export function drawBossMark(seed: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  paintGrass(g, createRng(seed));
  const runa = MATERIAL.runa;
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (d > 6.2 && d <= 7.2) setPx(g, x, y, tone(runa, 2));
      else if (d > 7.2 && d <= 7.9) setPx(g, x, y, tone(runa, 3));
    }
  }
  // Estrella de cuatro puntas en el centro: más clara cuanto más cerca del centro.
  for (let i = 0; i < 8; i++) {
    const color = tone(runa, Math.abs(i - 3.5) > 2 ? 1 : 0);
    for (const k of [7, 8]) {
      setPx(g, k, 4 + i, color);
      setPx(g, 4 + i, k, color);
    }
  }
  return g;
}

/**
 * Distancia (en píxeles) de un punto de la casilla a la orilla, según la
 * máscara de vecinas de `@kalku/world` en modo 8. Un lado sin unir cuenta
 * como orilla; una esquina sin unir (con sus dos lados unidos) da una
 * esquina hacia dentro. Las esquinas hacia fuera se redondean.
 */
export function edgeDistance(mask: number, px: number, py: number): number {
  const has = (bit: number): boolean => (mask & bit) !== 0;
  const n = !has(MASK.N);
  const e = !has(MASK.E);
  const s = !has(MASK.S);
  const w = !has(MASK.W);
  let d = 99;
  if (n) d = Math.min(d, py);
  if (s) d = Math.min(d, LAST - py);
  if (w) d = Math.min(d, px);
  if (e) d = Math.min(d, LAST - px);
  if (!n && !e && !has(MASK.NE)) d = Math.min(d, Math.max(LAST - px, py));
  if (!n && !w && !has(MASK.NW)) d = Math.min(d, Math.max(px, py));
  if (!s && !e && !has(MASK.SE)) d = Math.min(d, Math.max(LAST - px, LAST - py));
  if (!s && !w && !has(MASK.SW)) d = Math.min(d, Math.max(px, LAST - py));
  const R = 5;
  const round = (cx: number, cy: number): number => R - Math.hypot(cx, cy);
  if (n && w && px < R && py < R) d = Math.min(d, round(R - px, R - py));
  if (n && e && px > LAST - R && py < R) d = Math.min(d, round(px - (LAST - R), R - py));
  if (s && w && px < R && py > LAST - R) d = Math.min(d, round(R - px, py - (LAST - R)));
  if (s && e && px > LAST - R && py > LAST - R) d = Math.min(d, round(px - (LAST - R), py - (LAST - R)));
  return d;
}

/** Fotogramas de la animación del agua. */
export const WATER_FRAMES = 3;

/**
 * Agua con orilla de arena y espuma. `mask` es la máscara de vecinas (modo 8);
 * `frame` (0–2) mueve las olas y la espuma.
 */
export function drawWater(mask: number, frame: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  const agua = MATERIAL.agua;
  const arena = MATERIAL.arena;
  const hsh = mask % 7;
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const d = edgeDistance(mask, px, py);
      let color: number;
      if (d < 1) color = tone(arena, 1);
      else if (d < 2) color = tone(arena, 0);
      else if (d < 3) color = (px + py + frame) % 3 === 0 ? tone(agua, 1) : FOAM;
      else if (d < 4) color = tone(agua, 1);
      else {
        color = tone(agua, 2);
        if ((py + hsh) % 6 === 2 && (px + frame * 2 + hsh * 3) % 11 < 3) color = tone(agua, 1);
        if ((py + hsh) % 6 === 3 && (px + frame * 2 + hsh * 3) % 11 === 1) color = tone(agua, 0);
        if (py > 11 && d > 5 && (px + py) % 4 === 0) color = tone(agua, 3);
      }
      setPx(g, px, py, color);
    }
  }
  return g;
}

/** Camino de tierra con borde irregular de hierba y alguna piedrecita. */
export function drawPath(mask: number): Grid {
  const g = newGrid(TILE_PX, TILE_PX);
  const rng = createRng(9000 + mask);
  const tierra = MATERIAL.tierra;
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const d = edgeDistance(mask, px, py);
      const v = rng.next();
      const width = 1 + ((px * 7 + py * 3 + mask) % 5 < 2 ? 1 : 0);
      let color: number;
      if (d < width) color = v < 0.5 ? tone(G, 1) : tone(G, 2);
      else if (d < width + 1) color = tone(tierra, 2);
      else color = v < 0.1 ? tone(tierra, 0) : v < 0.22 ? tone(tierra, 2) : tone(tierra, 1);
      setPx(g, px, py, color);
    }
  }
  for (let i = 0; i < 2; i++) {
    const px = rng.int(4, 11);
    const py = rng.int(4, 11);
    if (edgeDistance(mask, px, py) < 4) continue;
    setPx(g, px, py, tone(MATERIAL.piedra, 1));
    setPx(g, px + 1, py, tone(MATERIAL.piedra, 2));
    setPx(g, px, py + 1, tone(tierra, 3));
    setPx(g, px + 1, py + 1, tone(tierra, 3));
  }
  return g;
}
