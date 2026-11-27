import { newGrid, setPx, shape, tone, light, type Grid, type Ramp } from './grid.js';
import { GOLD, MATERIAL, OUTLINE } from './palette.js';

/** Lado de la puerta y del cofre, en píxeles (una casilla). */
export const OBJECT_PX = 16;

/**
 * Puerta de piedra de una zona cerrada: un muro de bloques con una runa
 * encendida. Va dibujada encima del suelo (el resto de la casilla es
 * transparente). Luz desde arriba a la izquierda y contorno oscuro.
 */
export function drawGate(): Grid {
  const g = newGrid(OBJECT_PX, OBJECT_PX);
  shape(
    g, 0, 1, OBJECT_PX, OBJECT_PX - 1,
    (x, y) => x >= 0.5 && x <= 15.5 && y >= 1 && y <= 15.5,
    (x, y, px, py) => tone(MATERIAL.piedra, light((x - 8) / 9, (y - 8) / 9, px, py)),
    OUTLINE,
  );
  // Juntas de los bloques.
  const joint = tone(MATERIAL.piedra, 3);
  for (let x = 1; x < OBJECT_PX - 1; x++) {
    setPx(g, x, 6, joint);
    setPx(g, x, 11, joint);
  }
  for (const [x, y0, y1] of [[8, 2, 5], [4, 7, 10], [12, 7, 10], [8, 12, 14]] as const) {
    for (let y = y0; y <= y1; y++) setPx(g, x, y, joint);
  }
  // Runa de cuatro puntas en el centro.
  const runa = MATERIAL.runa;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 1], [0, -1], [1, 2]] as const) {
    setPx(g, 7 + dx, 7 + dy, tone(runa, dx === 0 && dy === 0 ? 0 : 2));
  }
  return g;
}

/**
 * Cofre de madera con herrajes dorados, cerrado o abierto (con el brillo del tesoro).
 * `wood` cambia el material: el cofre sorpresa del día es morado (`MATERIAL.runa`).
 */
export function drawChest(open: boolean, wood: Ramp = MATERIAL.tierra): Grid {
  const g = newGrid(OBJECT_PX, OBJECT_PX);
  shape(
    g, 0, 0, OBJECT_PX, OBJECT_PX,
    (x, y) => x >= 2 && x <= 14 && y >= (open ? 9 : 6) && y <= 14,
    (x, y, px, py) => tone(wood, light((x - 8) / 7, (y - 10) / 5, px, py)),
    OUTLINE,
  );
  if (open) {
    // Tapa levantada detrás y destello dorado dentro.
    shape(
      g, 0, 0, OBJECT_PX, OBJECT_PX,
      (x, y) => x >= 2 && x <= 14 && y >= 3 && y <= 7,
      (x, y, px, py) => tone(wood, light((x - 8) / 7, (y - 5) / 3, px, py) === 0 ? 1 : 2),
      OUTLINE,
    );
    for (let x = 4; x <= 12; x++) setPx(g, x, 9, GOLD);
    setPx(g, 8, 8, GOLD);
    setPx(g, 6, 7, GOLD);
    setPx(g, 10, 7, GOLD);
  } else {
    // Tapa: una franja más clara arriba y la cerradura dorada.
    for (let x = 3; x <= 13; x++) setPx(g, x, 7, tone(wood, 0));
    for (let x = 3; x <= 13; x++) setPx(g, x, 10, tone(wood, 3));
    setPx(g, 7, 9, GOLD);
    setPx(g, 8, 9, GOLD);
    setPx(g, 7, 10, GOLD);
    setPx(g, 8, 10, GOLD);
  }
  return g;
}

/** Corazón pequeño encima de la casa del niño, para que sepa cuál es la suya (11×10 px). */
export function drawHomeMark(): Grid {
  const g = newGrid(11, 10);
  const red = [0xff9ed2, 0xf07ea6, 0xc4517e] as const;
  shape(
    g, 0, 0, 11, 10,
    // Dos lóbulos redondos arriba y la punta abajo.
    (x, y) => (x - 3) ** 2 + (y - 3.2) ** 2 <= 7.3 || (x - 8) ** 2 + (y - 3.2) ** 2 <= 7.3 || (y >= 3.2 && Math.abs(x - 5.5) <= (9.6 - y) * 0.85),
    (x, y, px, py) => tone(red, Math.min(2, light((x - 5.5) / 5, (y - 4) / 5, px, py))),
    OUTLINE,
  );
  return g;
}
