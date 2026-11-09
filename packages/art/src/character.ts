import { EMPTY, newGrid, setPx, type Grid } from './grid.js';

/** Tamaño del personaje, en píxeles (una casilla). */
export const CHARACTER_PX = 16;

/** Fotogramas: parado, paso izquierdo, parado, paso derecho. */
export const CHARACTER_FRAMES = 4;

/** Capas del personaje, de la de abajo a la de arriba. */
export const CHARACTER_LAYERS = ['body', 'hair', 'clothes', 'accessory'] as const;
export type CharacterLayer = (typeof CHARACTER_LAYERS)[number];

/**
 * El dibujo de una pieza, como texto: cada carácter es un píxel, '.' es
 * transparente y `colors` dice el color de cada letra. Las filas miden como
 * mucho 16 y son como mucho 16.
 */
export interface PieceArt {
  readonly rows: readonly string[];
  readonly colors: Readonly<Record<string, number>>;
}

/** Filas desde las que se mueven las piernas al dar un paso. */
const LEGS_FROM = 12;

/** Pinta una pieza sobre la rejilla (lo transparente no tapa lo de debajo). */
function paint(g: Grid, piece: PieceArt): void {
  piece.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = piece.colors[ch];
      if (color !== undefined) setPx(g, x, y, color);
    });
  });
}

/** Comprueba que el dibujo cabe y que cada letra tiene color (por si viene de datos externos). */
export function validatePiece(piece: PieceArt): string[] {
  const errors: string[] = [];
  if (piece.rows.length > CHARACTER_PX) errors.push(`tiene ${piece.rows.length} filas (máximo ${CHARACTER_PX})`);
  piece.rows.forEach((row, y) => {
    if ([...row].length > CHARACTER_PX) errors.push(`la fila ${y} mide más de ${CHARACTER_PX}`);
    for (const ch of row) if (ch !== '.' && piece.colors[ch] === undefined) errors.push(`la letra «${ch}» no tiene color`);
  });
  return errors;
}

/**
 * Un fotograma (0–3) del personaje, de 16×16. Las piezas van en orden: la
 * última tapa a las anteriores. En los pasos, las piernas se mueven un píxel
 * a un lado y al otro. Mismas piezas y fotograma → mismo dibujo.
 */
export function drawCharacter(pieces: readonly PieceArt[], frame: number): Grid {
  const f = ((Math.floor(frame) % CHARACTER_FRAMES) + CHARACTER_FRAMES) % CHARACTER_FRAMES;
  const base = newGrid(CHARACTER_PX, CHARACTER_PX);
  for (const piece of pieces) paint(base, piece);
  const shift = f === 1 ? -1 : f === 3 ? 1 : 0;
  if (shift === 0) return base;
  const g = newGrid(CHARACTER_PX, CHARACTER_PX);
  for (let y = 0; y < CHARACTER_PX; y++) {
    for (let x = 0; x < CHARACTER_PX; x++) {
      const color = base.px[y * CHARACTER_PX + x] ?? EMPTY;
      if (color !== EMPTY) setPx(g, y >= LEGS_FROM ? x + shift : x, y, color);
    }
  }
  return g;
}
