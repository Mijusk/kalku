import { CHARACTER_LAYERS, hex, validatePiece, type CharacterLayer, type PieceArt } from '@kalku/art';

/** Las capas del personaje, de abajo a arriba. */
export const OUTFIT_LAYERS = CHARACTER_LAYERS;
export type OutfitLayer = CharacterLayer;

/**
 * Una pieza del personaje, como datos: su capa, su nombre en los dos idiomas
 * y su dibujo como texto. Añadir una pieza es añadir una entrada a `PIECES`;
 * no toca lógica.
 */
export interface OutfitPiece {
  readonly id: string;
  readonly layer: OutfitLayer;
  readonly name: { readonly es: string; readonly ca: string };
  readonly art: PieceArt;
}

/** Qué pieza lleva el personaje en cada capa (por id). */
export type Outfit = Readonly<Record<OutfitLayer, string>>;

const OUTLINE = hex('#1c2430');

/** Cuerpo: cabeza, cara, brazos y piernas. Solo cambia el tono de piel. */
const BODY_ROWS = [
  '................',
  '....kkkkkkkk....',
  '...kssssssssk...',
  '...kssssssssk...',
  '...ksessssesk...',
  '...kssssssssk...',
  '....kssssssk....',
  '.....kkkkkk.....',
  '...kssssssssk...',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '..kssssssssssk..',
  '....kssk.kssk...',
  '....kssk.kssk...',
  '....kssk.kssk...',
  '....kkkk.kkkk...',
];

const skin = (id: string, es: string, ca: string, color: string): OutfitPiece => ({
  id,
  layer: 'body',
  name: { es, ca },
  art: { rows: BODY_ROWS, colors: { k: OUTLINE, e: OUTLINE, s: hex(color) } },
});

const HAIR_TOP = ['....kkkkkkkk....', '...khhhhhhhhk...', '...khhhhhhhhk...', '....hhhhhhhh....'];

const hair = (id: string, es: string, ca: string, color: string, rows: readonly string[]): OutfitPiece => ({
  id,
  layer: 'hair',
  name: { es, ca },
  art: { rows, colors: { k: OUTLINE, h: hex(color) } },
});

const BLANK = '................';

const PIECES: readonly OutfitPiece[] = [
  skin('piel-1', 'Piel clara', 'Pell clara', '#f8d9bd'),
  skin('piel-2', 'Piel media', 'Pell mitjana', '#e8b48a'),
  skin('piel-3', 'Piel morena', 'Pell morena', '#b9825a'),
  skin('piel-4', 'Piel oscura', 'Pell fosca', '#7a4b30'),

  hair('pelo-corto', 'Pelo corto', 'Cabell curt', '#6b3e26', HAIR_TOP),
  hair('pelo-largo', 'Pelo largo', 'Cabell llarg', '#2b2220', [
    ...HAIR_TOP,
    '...h........h...',
    '...h........h...',
    '...h........h...',
  ]),
  hair('pelo-pinchos', 'Pelo de punta', 'Cabell de punta', '#d99a2b', [
    '..k..k.kk.k..k..',
    '..khhhhhhhhhhk..',
    '...khhhhhhhhk...',
    '....hhhhhhhh....',
  ]),

  {
    id: 'ropa-roja',
    layer: 'clothes',
    name: { es: 'Camiseta roja', ca: 'Samarreta vermella' },
    art: {
      rows: [
        ...Array<string>(8).fill(BLANK),
        '....rrrrrrrr....',
        '...rrrrrrrrrr...',
        '....rrrrrrrr....',
        '....yyyyyyyy....',
        '.....bb...bb....',
        '.....bb...bb....',
        '.....bb...bb....',
      ],
      colors: { r: hex('#d9534f'), y: hex('#f2c14e'), b: hex('#3b6fb6') },
    },
  },
  {
    id: 'ropa-verde',
    layer: 'clothes',
    name: { es: 'Túnica verde', ca: 'Túnica verda' },
    art: {
      rows: [
        ...Array<string>(8).fill(BLANK),
        '....gggggggg....',
        '...gggggggggg...',
        '....gggggggg....',
        '....dddddddd....',
        '....gggg.ggg....',
        BLANK,
        BLANK,
      ],
      colors: { g: hex('#4f9d3e'), d: hex('#2f6b2a') },
    },
  },

  {
    id: 'nada',
    layer: 'accessory',
    name: { es: 'Nada', ca: 'Res' },
    art: { rows: [], colors: {} },
  },
  {
    id: 'gafas',
    layer: 'accessory',
    name: { es: 'Gafas', ca: 'Ulleres' },
    art: {
      rows: [...Array<string>(4).fill(BLANK), '....geggggeg....'],
      colors: { g: hex('#3b4250'), e: OUTLINE },
    },
  },
];

export const OUTFIT_PIECES: readonly OutfitPiece[] = PIECES;

/** Atuendo con el que empieza cualquier niño: una pieza por capa. */
export const DEFAULT_OUTFIT: Outfit = {
  body: 'piel-2',
  hair: 'pelo-corto',
  clothes: 'ropa-roja',
  accessory: 'nada',
};

export function getPiece(id: string): OutfitPiece | undefined {
  return OUTFIT_PIECES.find((p) => p.id === id);
}

export function piecesForLayer(layer: OutfitLayer): OutfitPiece[] {
  return OUTFIT_PIECES.filter((p) => p.layer === layer);
}

/** Las piezas que lleva el atuendo, en orden de capas (la de arriba tapa a la de abajo). */
export function outfitPieces(outfit: Outfit): OutfitPiece[] {
  return OUTFIT_LAYERS.map((layer) => {
    const piece = getPiece(outfit[layer]);
    if (piece?.layer !== layer) throw new RangeError(`La pieza «${outfit[layer]}» no es de la capa ${layer}`);
    return piece;
  });
}

/** Un atuendo nuevo con otra pieza en su capa. No muta el que recibe; rechaza piezas de otra capa o que no existen. */
export function setPiece(outfit: Outfit, layer: OutfitLayer, id: string): Outfit {
  const piece = getPiece(id);
  if (piece?.layer !== layer) throw new RangeError(`La pieza «${id}» no es de la capa ${layer}`);
  return { ...outfit, [layer]: id };
}

/** Lee un atuendo guardado: lo desconocido, de otra capa o corrupto se sustituye por la pieza por defecto. */
export function parseOutfit(raw: unknown): Outfit {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const pick = (layer: OutfitLayer): string => {
    const id = r[layer];
    return typeof id === 'string' && getPiece(id)?.layer === layer ? id : DEFAULT_OUTFIT[layer];
  };
  return { body: pick('body'), hair: pick('hair'), clothes: pick('clothes'), accessory: pick('accessory') };
}

/** Comprueba las piezas: ids únicos y dibujos válidos. Devuelve los errores (vacío si todo bien). */
export function validateOutfitPieces(pieces: readonly OutfitPiece[] = OUTFIT_PIECES): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const p of pieces) {
    if (seen.has(p.id)) errors.push(`el id «${p.id}» está repetido`);
    seen.add(p.id);
    if (!OUTFIT_LAYERS.includes(p.layer)) errors.push(`${p.id}: la capa «${p.layer}» no existe`);
    if (p.name.es.trim() === '' || p.name.ca.trim() === '') errors.push(`${p.id}: falta el nombre en es o ca`);
    for (const e of validatePiece(p.art)) errors.push(`${p.id}: ${e}`);
  }
  return errors;
}
