import { newGrid, setPx, shape, tone, light, type Grid, type Ramp } from './grid.js';
import { CREATURE_RAMPS, GOLD, MATERIAL, OUTLINE, WHITE, type RampName } from './palette.js';
import { TILE_PX } from './tiles.js';

/**
 * Muebles de la casa del niño, dibujados por código con las mismas reglas que
 * el resto (luz desde arriba a la izquierda, contorno oscuro, escalas de
 * tonos). Cada mueble ocupa una o dos casillas de ancho y una de fondo; se ve
 * en vista de frente, como los edificios del mapa.
 */
export type FurnitureArt =
  | 'bed'
  | 'table'
  | 'chair'
  | 'plant'
  | 'lamp'
  | 'rug'
  | 'bookcase'
  | 'sofa'
  | 'cushion'
  | 'toybox'
  | 'easel'
  | 'aquarium'
  | 'trophy'
  | 'telescope';

export const FURNITURE_ARTS: readonly FurnitureArt[] = [
  'bed', 'table', 'chair', 'plant', 'lamp', 'rug', 'bookcase', 'sofa', 'cushion', 'toybox', 'easel', 'aquarium', 'trophy', 'telescope',
];

/** Alto del dibujo de un mueble: una casilla y media, para que lo alto (estantería, lámpara) asome por encima. */
export const FURNITURE_PX_H = 24;

const WOOD = MATERIAL.corteza;
const fabric = (color: RampName): Ramp => CREATURE_RAMPS[color].slice(0, 4);

/** Caja con luz: rectángulo redondeado relleno con tonos según la luz. */
function box(g: Grid, x0: number, y0: number, w: number, h: number, ramp: Ramp, round = 0): void {
  shape(
    g, x0, y0, w, h,
    (x, y) => {
      if (round <= 0) return true;
      const dx = Math.max(0, round - x, x - (w - round));
      const dy = Math.max(0, round - y, y - (h - round));
      return dx * dx + dy * dy <= round * round;
    },
    (x, y, px, py) => tone(ramp, light((x - w / 2) / (w / 2 + 1), (y - h / 2) / (h / 2 + 1), px, py)),
    OUTLINE,
  );
}

function hline(g: Grid, x0: number, x1: number, y: number, color: number): void {
  for (let x = x0; x <= x1; x++) setPx(g, x, y, color);
}

/** Sombra suave en el suelo, debajo del mueble. */
function floorShadow(g: Grid, x0: number, x1: number, y: number): void {
  hline(g, x0, x1, y, tone(MATERIAL.tierra, 3));
}

/** Dibuja un mueble. `width` en casillas (1 o 2); `color` tiñe la tela o la pieza principal. */
export function drawFurniture(art: FurnitureArt, color: RampName, width: 1 | 2): Grid {
  const W = width * TILE_PX;
  const H = FURNITURE_PX_H;
  const g = newGrid(W, H);
  const main = fabric(color);
  const bottom = H - 1;
  switch (art) {
    case 'bed': {
      floorShadow(g, 2, W - 2, bottom);
      // Cabecero de madera a la izquierda, colchón, almohada y manta.
      box(g, 1, 6, 5, 17, WOOD, 1);
      box(g, W - 4, 12, 3, 11, WOOD);
      box(g, 3, 13, W - 6, 7, MATERIAL.pared);
      box(g, 5, 11, 7, 5, [WHITE, ...MATERIAL.pared], 2);
      box(g, 11, 13, W - 14, 8, main);
      hline(g, 12, W - 5, 15, tone(main, 0));
      break;
    }
    case 'table': {
      floorShadow(g, 2, W - 3, bottom);
      box(g, 1, 10, W - 2, 4, WOOD);
      box(g, 3, 13, 3, 10, WOOD);
      box(g, W - 6, 13, 3, 10, WOOD);
      // Un jarrón con una flor del color elegido.
      box(g, W / 2 - 2, 5, 4, 6, main, 1);
      setPx(g, W / 2 - 1, 3, GOLD);
      setPx(g, W / 2, 4, tone(MATERIAL.hoja, 1));
      break;
    }
    case 'chair': {
      floorShadow(g, 3, W - 4, bottom);
      box(g, 4, 5, 8, 11, WOOD, 1);
      box(g, 5, 7, 6, 6, main);
      box(g, 3, 15, 10, 3, WOOD);
      box(g, 4, 17, 2, 6, WOOD);
      box(g, 10, 17, 2, 6, WOOD);
      break;
    }
    case 'plant': {
      floorShadow(g, 4, W - 5, bottom);
      box(g, 4, 15, 8, 8, main, 1);
      hline(g, 5, 10, 16, tone(main, 0));
      for (const [cx, cy, r] of [[8, 9, 4.5], [5, 11, 3], [11, 11, 3], [8, 4, 3]] as const) {
        shape(g, 0, 0, W, H, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
          (x, y, px, py) => tone(MATERIAL.hoja, light((x - cx) / r, (y - cy) / r, px, py)), OUTLINE);
      }
      break;
    }
    case 'lamp': {
      floorShadow(g, 4, W - 5, bottom);
      box(g, 4, 20, 8, 3, WOOD, 1);
      box(g, 7, 9, 2, 12, MATERIAL.piedra);
      // Pantalla en trapecio y luz dorada debajo.
      shape(g, 2, 1, 12, 9, (x, y) => Math.abs(x - 6) <= 3 + y * 0.35, (x, y, px, py) => tone(main, light((x - 6) / 6, (y - 4) / 5, px, py)), OUTLINE);
      hline(g, 5, 10, 10, GOLD);
      break;
    }
    case 'rug': {
      // Alfombra en el suelo: un óvalo con franjas.
      shape(g, 0, H - 9, W, 8, (x, y) => ((x - W / 2) / (W / 2)) ** 2 + ((y - 4) / 4) ** 2 <= 1,
        (x, y) => {
          const r = ((x - W / 2) / (W / 2)) ** 2 + ((y - 4) / 4) ** 2;
          return r > 0.55 ? tone(main, 2) : r > 0.25 ? tone(main, 0) : tone(main, 1);
        }, OUTLINE);
      break;
    }
    case 'bookcase': {
      floorShadow(g, 2, W - 3, bottom);
      box(g, 1, 0, W - 2, H - 1, WOOD);
      const books = [main, CREATURE_RAMPS.azul, CREATURE_RAMPS.verde, CREATURE_RAMPS.amarillo, CREATURE_RAMPS.rosa];
      for (const shelfY of [2, 9, 16]) {
        for (let x = 3; x < W - 3; x++) {
          const ramp = books[(x + shelfY) % books.length] ?? main;
          const tall = (x * 7 + shelfY) % 3 === 0 ? 0 : 1;
          for (let y = shelfY + tall; y < shelfY + 6; y++) setPx(g, x, y, tone(ramp, x % 2 === 0 ? 1 : 2));
        }
        hline(g, 2, W - 3, shelfY + 6, tone(WOOD, 2));
      }
      break;
    }
    case 'sofa': {
      floorShadow(g, 2, W - 3, bottom);
      box(g, 3, 7, W - 6, 10, main, 2);
      box(g, 1, 12, 5, 10, main, 2);
      box(g, W - 6, 12, 5, 10, main, 2);
      box(g, 5, 15, W - 10, 6, main, 1);
      hline(g, W / 2, W / 2, 16, tone(main, 2));
      box(g, 3, 21, 2, 2, WOOD);
      box(g, W - 5, 21, 2, 2, WOOD);
      break;
    }
    case 'cushion': {
      floorShadow(g, 2, W - 3, bottom);
      box(g, 1, 13, W - 2, 10, main, 4);
      setPx(g, W / 2, 18, tone(main, 3));
      setPx(g, W / 2 - 1, 17, tone(main, 0));
      break;
    }
    case 'toybox': {
      floorShadow(g, 2, W - 3, bottom);
      // Una pelota asoma por arriba.
      shape(g, 4, 5, 7, 7, (x, y) => (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 11,
        (x, y, px, py) => (Math.abs(x - y) < 1.5 ? WHITE : tone(CREATURE_RAMPS.rosa, light((x - 3.5) / 3.5, (y - 3.5) / 3.5, px, py))), OUTLINE);
      box(g, 1, 10, W - 2, 13, main, 1);
      hline(g, 2, W - 3, 13, tone(main, 3));
      box(g, W / 2 - 2, 15, 4, 3, [GOLD, GOLD], 0);
      break;
    }
    case 'easel': {
      floorShadow(g, 3, W - 4, bottom);
      box(g, 3, 6, 2, 17, WOOD);
      box(g, 11, 6, 2, 17, WOOD);
      box(g, 2, 2, 12, 12, [WHITE, ...MATERIAL.pared]);
      // Un dibujo sencillo: sol y colina.
      shape(g, 4, 3, 4, 4, (x, y) => (x - 2) ** 2 + (y - 2) ** 2 <= 3, () => GOLD, null);
      shape(g, 3, 8, 10, 5, (x, y) => (x - 5) ** 2 / 25 + (y - 5) ** 2 / 16 <= 1, () => tone(main, 1), null);
      break;
    }
    case 'aquarium': {
      floorShadow(g, 2, W - 3, bottom);
      box(g, 2, 17, W - 4, 6, WOOD);
      box(g, 1, 4, W - 2, 14, MATERIAL.agua);
      hline(g, 2, W - 3, 5, tone(MATERIAL.agua, 0));
      // Pececitos del color elegido y burbujas.
      for (const [fx, fy] of [[4, 9], [9, 13]] as const) {
        setPx(g, fx, fy, tone(main, 1));
        setPx(g, fx + 1, fy, tone(main, 1));
        setPx(g, fx + 2, fy, tone(main, 0));
        setPx(g, fx - 1, fy - 1, tone(main, 2));
        setPx(g, fx - 1, fy + 1, tone(main, 2));
      }
      setPx(g, 12, 8, WHITE);
      setPx(g, 11, 10, WHITE);
      hline(g, 2, W - 3, 16, tone(MATERIAL.arena, 1));
      break;
    }
    case 'trophy': {
      floorShadow(g, 3, W - 4, bottom);
      box(g, 3, 18, 10, 5, WOOD);
      box(g, 7, 14, 2, 5, [GOLD, GOLD]);
      shape(g, 3, 4, 10, 11, (x, y) => y < 7 ? Math.abs(x - 5) <= 5 : Math.abs(x - 5) <= 5 - (y - 7) * 0.6,
        (x, y) => (x < 4 ? WHITE : x < 7 ? GOLD : tone(CREATURE_RAMPS.amarillo, 3)), OUTLINE);
      hline(g, 5, 10, 8, tone(main, 1));
      break;
    }
    case 'telescope': {
      floorShadow(g, 2, W - 3, bottom);
      for (const [x0, x1] of [[4, 8], [11, 7], [8, 8]] as const) {
        for (let y = 12; y < 23; y++) setPx(g, Math.round(x0 + ((x1 - x0) * (y - 12)) / 11), y, OUTLINE);
      }
      // Tubo inclinado hacia arriba a la derecha.
      shape(g, 0, 0, W, H, (x, y) => {
        const u = (x - 8) * 0.8 - (y - 9) * 0.6;
        const v = (x - 8) * 0.6 + (y - 9) * 0.8;
        return Math.abs(u) <= 7 && Math.abs(v) <= 2.2;
      }, (x, y, px, py) => tone(main, light((x - 8) / 8, (y - 9) / 6, px, py)), OUTLINE);
      setPx(g, 13, 4, GOLD);
      break;
    }
  }
  return g;
}

/**
 * La habitación vacía: pared con papel a rayas y zócalo arriba, ventana con
 * el cielo, y suelo de tablones de madera. Medidas en casillas.
 */
export function drawRoom(floorW: number, floorH: number, wallRows: number): Grid {
  const W = floorW * TILE_PX;
  const H = (floorH + wallRows) * TILE_PX;
  const wallH = wallRows * TILE_PX;
  const g = newGrid(W, H);
  const paper = MATERIAL.pared;
  for (let y = 0; y < wallH; y++) {
    for (let x = 0; x < W; x++) setPx(g, x, y, Math.floor(x / 4) % 2 === 0 ? tone(paper, 0) : tone(paper, 1));
  }
  hline(g, 0, W - 1, wallH - 3, tone(WOOD, 0));
  hline(g, 0, W - 1, wallH - 2, tone(WOOD, 1));
  hline(g, 0, W - 1, wallH - 1, tone(WOOD, 2));
  // Ventana en el centro de la pared.
  const wx = Math.round(W / 2) - 10;
  shape(g, wx, 4, 20, 16, () => true,
    (_x, y, px, py) => (px === 9 || px === 10 || py === 7 ? OUTLINE : y < 8 ? tone(MATERIAL.agua, 0) : tone(MATERIAL.agua, 1)), OUTLINE);
  hline(g, wx - 1, wx + 20, 20, tone(WOOD, 1));
  // Suelo de tablones: juntas cada 4 píxeles y cortes alternos.
  for (let y = wallH; y < H; y++) {
    const row = Math.floor((y - wallH) / 4);
    for (let x = 0; x < W; x++) {
      const joint = (y - wallH) % 4 === 3 || (x + row * 11) % 24 === 0;
      setPx(g, x, y, joint ? tone(MATERIAL.tierra, 2) : tone(MATERIAL.tierra, (x + row) % 7 === 0 ? 0 : 1));
    }
  }
  return g;
}
