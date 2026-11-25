import { hex, light, newGrid, setPx, shape, tone, type Grid } from './grid.js';
import { OUTLINE, WHITE } from './palette.js';

/**
 * Gemas de dominio de 16 px: una por habilidad, con el color de su operación.
 * Hay una escala por operación (datos); una operación nueva sin escala usa la
 * de reserva, así que una habilidad nueva siempre tiene gema sin tocar el dibujo.
 */
export const GEM_PX = 16;

const ramp = (...colors: string[]): readonly number[] => colors.map(hex);

export const GEM_RAMPS: Readonly<Record<string, readonly number[]>> = {
  '+': ramp('#d6f69c', '#9fdc5e', '#66b244', '#428635'),
  '-': ramp('#daf4ff', '#92d4f7', '#53a8e4', '#3274b9'),
  '×': ramp('#ffe9bc', '#ffc062', '#f29233', '#c26722'),
  '÷': ramp('#ffe2ee', '#ffb0cb', '#f07ea6', '#c4517e'),
  mixed: ramp('#ecdcff', '#c6a4f3', '#9a74d8', '#6c4caa'),
};

/** Escala de la gema apagada: gris sin color, igual para todas. */
export const GEM_OFF_RAMP: readonly number[] = ramp('#c9ced6', '#aab0ba', '#8b929e', '#6f7682');

/**
 * Dibuja una gema (rombo tallado) con luz desde arriba a la izquierda y
 * contorno oscuro. `lit` false = apagada, en gris. Determinista.
 */
export function drawGem(operator: string, lit: boolean): Grid {
  const g = newGrid(GEM_PX, GEM_PX);
  const colors = lit ? (GEM_RAMPS[operator] ?? GEM_RAMPS['mixed'] ?? GEM_OFF_RAMP) : GEM_OFF_RAMP;
  const c = GEM_PX / 2;
  shape(
    g, 0, 0, GEM_PX, GEM_PX,
    (x, y) => Math.abs(x - c) / 7.5 + Math.abs(y - c) / 7.5 <= 1,
    (x, y, px, py) => tone(colors, light((x - c) / 8, (y - c) / 8, px, py)),
    OUTLINE,
  );
  if (lit) {
    // Destello arriba a la izquierda.
    setPx(g, 6, 5, WHITE);
    setPx(g, 5, 6, WHITE);
  }
  return g;
}
