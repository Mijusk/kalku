import type { PieceSpec, TileKind } from './types.js';

/**
 * Leyenda de las piezas: una letra por tipo de casilla.
 *
 * | Letra | Casilla      |
 * | ----- | ------------ |
 * | `.`   | hierba       |
 * | `"`   | hierba alta  |
 * | `*`   | flores       |
 * | `T`   | árbol        |
 * | `A`   | agua         |
 * | `#`   | camino       |
 * | `C`   | casa         |
 * | `S`   | tienda       |
 * | `J`   | jefe         |
 * | `G`   | puerta (cerrada, no se pisa hasta abrirla) |
 * | `K`   | cofre        |
 */
export const PIECE_LEGEND: Readonly<Record<string, TileKind>> = {
  '.': 'grass',
  '"': 'tallGrass',
  '*': 'flowers',
  T: 'tree',
  A: 'water',
  '#': 'path',
  C: 'house',
  S: 'shop',
  J: 'boss',
  G: 'gate',
  K: 'chest',
};

/** Casillas por las que se puede andar. */
const WALKABLE: ReadonlySet<TileKind> = new Set<TileKind>(['grass', 'tallGrass', 'flowers', 'path', 'boss', 'chest']);

export function isWalkable(kind: TileKind | undefined): boolean {
  return kind !== undefined && WALKABLE.has(kind);
}

/** Tamaño de una pieza: ancho = largo de las filas, alto = número de filas. */
export function pieceSize(piece: PieceSpec): { width: number; height: number } {
  return { width: piece.rows[0]?.length ?? 0, height: piece.rows.length };
}

/**
 * Convierte una pieza de texto en casillas, por filas. Comprueba que todas
 * las filas miden lo mismo, que todas las letras están en la leyenda y que
 * el enlace está en el borde y se puede pisar.
 */
export function parsePiece(piece: PieceSpec): TileKind[][] {
  const { width, height } = pieceSize(piece);
  if (width === 0 || height === 0) throw new RangeError(`La pieza ${piece.id} está vacía`);

  const grid = piece.rows.map((row, y) => {
    if (row.length !== width) {
      throw new RangeError(`La fila ${y} de la pieza ${piece.id} mide ${row.length} y debería medir ${width}`);
    }
    return Array.from(row, (char, x) => {
      const kind = PIECE_LEGEND[char];
      if (kind === undefined) throw new RangeError(`Letra desconocida «${char}» en la pieza ${piece.id} (${x}, ${y})`);
      return kind;
    });
  });

  const { x, y } = piece.link;
  const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height || !onBorder) {
    throw new RangeError(`El enlace de la pieza ${piece.id} tiene que estar en su borde`);
  }
  if (!isWalkable(grid[y]?.[x])) throw new RangeError(`El enlace de la pieza ${piece.id} no se puede pisar`);

  return grid;
}

/**
 * Pueblo de Pradera Uno (PROVISIONAL): tres casas y la tienda alrededor de
 * una plaza. El camino entra por abajo.
 */
export const PUEBLO_PRADERA: PieceSpec = {
  id: 'pueblo-pradera',
  rows: [
    '*.........*',
    '.CCC...SSS.',
    '.CCC...SSS.',
    '...#####...',
    '.CCC.#.CCC.',
    '.CCC.#.CCC.',
    '*....#....*',
  ],
  link: { x: 5, y: 6 },
};

/**
 * Arena del jefe de Pradera Uno (PROVISIONAL): un claro rodeado de árboles
 * con el jefe en el centro. El camino entra por la izquierda.
 */
export const ARENA_PRADERA: PieceSpec = {
  id: 'arena-pradera',
  rows: [
    'TTTTTTTT',
    'TT....TT',
    'T......T',
    '###.J..T',
    'T......T',
    'TT....TT',
    'TTTTTTTT',
  ],
  link: { x: 0, y: 3 },
};

/**
 * Zona cerrada (PROVISIONAL): un claro con hierba alta y un cofre, rodeado
 * de árboles, con una puerta (`G`) abajo. El camino llega al enlace, justo
 * delante de la puerta. Cada zona de Pradera Uno usa esta forma con su id.
 */
function zonePiece(id: string): PieceSpec {
  return {
    id,
    rows: [
      'TTTTTTT',
      'T"""""T',
      'T".K."T',
      'TTTGTTT',
      '...#...',
    ],
    link: { x: 3, y: 4 },
  };
}

/**
 * Zona del puente: una isla en el río. La puerta es el puente roto, que
 * Bruno arregla en el capítulo 2 (docs/HISTORIA.md).
 */
export const ZONA_PUENTE: PieceSpec = {
  id: 'zona-puente',
  rows: [
    'AAAAAAA',
    'A"""""A',
    'A".K."A',
    'AAAGAAA',
    '...#...',
  ],
  link: { x: 3, y: 4 },
};
export const ZONA_CUEVA: PieceSpec = zonePiece('zona-cueva');
export const ZONA_PUERTA: PieceSpec = zonePiece('zona-puerta');

/** Campamento de Olma en el Bosque de las Decenas: una cabaña y un claro. El camino entra por abajo. */
export const CAMPAMENTO_BOSQUE: PieceSpec = {
  id: 'campamento-bosque',
  rows: [
    '*.......*',
    '.CCC.....',
    '.CCC.....',
    '....#....',
    '*...#...*',
  ],
  link: { x: 4, y: 4 },
};

/** El corazón del bosque, donde espera el Gran Enredo. El camino entra por la izquierda. */
export const ARENA_BOSQUE: PieceSpec = {
  id: 'arena-bosque',
  rows: [
    'TTTTTTTTT',
    'TTT...TTT',
    'T.......T',
    '###..J..T',
    'T.......T',
    'TTT...TTT',
    'TTTTTTTTT',
  ],
  link: { x: 0, y: 3 },
};

export const ZONA_CLARO: PieceSpec = zonePiece('zona-claro');
export const ZONA_ARBOL: PieceSpec = zonePiece('zona-arbol');
