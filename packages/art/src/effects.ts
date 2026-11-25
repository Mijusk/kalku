import { light, newGrid, shape, tone, type Grid } from './grid.js';
import { GOLD, MATERIAL, OUTLINE } from './palette.js';

/** Lado de la estrella de subida de nivel, en píxeles del dibujo. */
export const STAR_SIZE = 16;

/** Estrella de cinco puntas con contorno oscuro y luz desde arriba a la izquierda (escala de la arena, con el dorado como luz). */
export function drawStar(): Grid {
  const g = newGrid(STAR_SIZE, STAR_SIZE);
  const cx = STAR_SIZE / 2;
  const cy = STAR_SIZE / 2 + 0.6;
  const outer = STAR_SIZE / 2 - 0.3;
  const inner = outer * 0.45;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const inside = (x: number, y: number): boolean => {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i] ?? [0, 0];
      const [xj, yj] = pts[j] ?? [0, 0];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const ramp = [GOLD, ...MATERIAL.arena, MATERIAL.tierra[1] ?? GOLD];
  shape(g, 0, 0, STAR_SIZE, STAR_SIZE, inside, (x, y, px, py) => tone(ramp, light((x - cx) / outer, (y - cy) / outer, px, py)), OUTLINE);
  return g;
}
