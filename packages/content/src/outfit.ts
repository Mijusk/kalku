import { CHARACTER_LAYERS, hex, OUTLINE, validatePiece, type CharacterLayer, type PieceArt } from '@kalku/art';
import type { SkillId } from '@kalku/exercises';

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
  /** Cómo se consigue (sin campo: se tiene desde el principio). Ver `wardrobe.ts`. */
  readonly get?: PieceSource;
}

/**
 * De dónde sale una pieza. Todas son solo estética: ninguna cambia el combate.
 * - `shop`: se compra con Cifras en la tienda del pueblo; con `minLevel` o `gem`,
 *   solo cuando se cumple (las Cifras se ganan aprendiendo, nunca con dinero).
 * - `treasure`: está en el cofre de una zona (id del tesoro de `zones.ts`).
 * - `level`: se gana al llegar a ese nivel.
 * - `gem`: se gana con la gema de dominio de esa habilidad.
 * - `gift`: sale en el cofre sorpresa del día, en el orden de la lista.
 */
export type PieceSource =
  | { readonly kind: 'shop'; readonly price: number; readonly minLevel?: number; readonly gem?: SkillId }
  | { readonly kind: 'treasure'; readonly treasure: string }
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'gem'; readonly gem: SkillId }
  | { readonly kind: 'gift' };

/** Qué pieza lleva el personaje en cada capa (por id). */
export type Outfit = Readonly<Record<OutfitLayer, string>>;


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

/** Color del contorno en hexadecimal, para las piezas que lo usan como color propio. */
const OUTLINE_HEX = '#1b1b24';

/** Convierte `{ letra: '#rrggbb' }` en colores de pieza; `k` es siempre el contorno. */
function colorsOf(colors: Readonly<Record<string, string>>): Record<string, number> {
  const out: Record<string, number> = { k: OUTLINE };
  for (const [ch, c] of Object.entries(colors)) out[ch] = c === OUTLINE_HEX ? OUTLINE : hex(c);
  return out;
}

type Colors = Readonly<Record<string, string>>;

const piece = (layer: OutfitLayer) => (id: string, es: string, ca: string, colors: Colors, rows: readonly string[], get?: PieceSource): OutfitPiece => ({
  id,
  layer,
  name: { es, ca },
  art: { rows, colors: colorsOf(colors) },
  ...(get ? { get } : {}),
});
const hat = piece('hat');
const accessory = piece('accessory');
/** Ropa: las 8 primeras filas (la cabeza) van vacías. */
const clothes = (id: string, es: string, ca: string, colors: Colors, rows: readonly string[], get?: PieceSource): OutfitPiece =>
  piece('clothes')(id, es, ca, colors, [...Array<string>(8).fill(BLANK), ...rows], get);

/**
 * Capa: va detrás del cuerpo y asoma por los hombros, los lados y entre las
 * piernas. Con `sparkle`, lleva unos puntitos de ese color.
 */
function cape(id: string, es: string, ca: string, color: string, get: PieceSource, sparkle?: string): OutfitPiece {
  const rows = [
    ...Array<string>(6).fill(BLANK),
    '...kkkkkkkkkk...',
    '..kcccccccccck..',
    sparkle ? '.ksccccccccccck.' : '.kcccccccccccck.',
    '.kcccccccccccck.',
    '.kcccccccccccck.',
    '.kcccccccccccck.',
    sparkle ? '.kcccccccccccsk.' : '.kcccccccccccck.',
    sparkle ? '.kccccccsccccck.' : '.kcccccccccccck.',
    '.kcccccccccccck.',
    '..kkkkkkkkkkkk..',
  ];
  return piece('back')(id, es, ca, sparkle ? { c: color, s: sparkle } : { c: color }, rows, get);
}

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

  // Nada en la espalda ni en la cabeza: lo que lleva todo el mundo al empezar.
  { id: 'sin-capa', layer: 'back', name: { es: 'Nada', ca: 'Res' }, art: { rows: [], colors: {} } },
  { id: 'sin-sombrero', layer: 'hat', name: { es: 'Nada', ca: 'Res' }, art: { rows: [], colors: {} } },

  // Tienda del pueblo (Cifras). Solo estética.
  hat('gorra-azul', 'Gorra azul', 'Gorra blava', { b: '#3b6fb6', w: '#ffffff' }, ['....kkkkkkkk....', '...kbbbbbbbbk...', '...kbbwbbbbbk...', '...kkkkkkkkkbbk.'], { kind: 'shop', price: 120 }),
  clothes('ropa-impermeable', 'Chubasquero amarillo', 'Impermeable groc', { y: '#f2c14e', k: OUTLINE_HEX, b: '#3b6fb6' }, [
    '....yyyyyyyy....',
    '..yyyyyyyyyyyy..',
    '..yyyykyykyyyy..',
    '...yyyyyyyyyy...',
    '....yyyy.yyyy...',
    '.....bb...bb....',
    '.....bb...bb....',
  ], { kind: 'shop', price: 200 }),
  accessory('bufanda', 'Bufanda de rayas', 'Bufanda de ratlles', { r: '#d9534f', w: '#f6f1e3' }, [
    ...Array<string>(7).fill(BLANK),
    '....rwrwrwrw....',
    '....wrwrwrwr....',
    '..........rw....',
    '..........wr....',
  ], { kind: 'shop', price: 250 }),
  hat('sombrero-paja', 'Sombrero de paja', 'Barret de palla', { y: '#e8c66a', r: '#d9534f' }, ['....kyyyyyyk....', '....krrrrrrk....', '.kyyyyyyyyyyyyk.', '..kkkkkkkkkkkk..'], { kind: 'shop', price: 300 }),
  clothes('ropa-rayas', 'Jersey de rayas', 'Jersei de ratlles', { w: '#f6f1e3', n: '#2b4c8c', b: '#3b6fb6' }, [
    '....wwwwwwww....',
    '...nnnnnnnnnn...',
    '....wwwwwwww....',
    '....nnnnnnnn....',
    '.....bb...bb....',
    '.....bb...bb....',
    '.....bb...bb....',
  ], { kind: 'shop', price: 350 }),
  hat('gorro-lana', 'Gorro de lana', 'Barret de llana', { g: '#4f9d3e', w: '#f6f1e3' }, ['.......ww.......', '....kggggggk....', '...kggggggggk...', '...kwwwwwwwwk...'], { kind: 'shop', price: 400, minLevel: 3 }),
  cape('capa-roja', 'Capa roja', 'Capa vermella', '#c0392b', { kind: 'shop', price: 450 }),
  // Del Bosque de las Decenas (se venden en las dos tiendas).
  hat('gorro-bellota', 'Gorro de bellota', "Barret d'aglà", { b: '#9a6a3c', d: '#6e4527' }, ['.......kk.......', '....kddddddk....', '...kbdbdbdbdk...', '...kbbbbbbbbk...'], { kind: 'shop', price: 500, minLevel: 6 }),
  cape('capa-hojas', 'Capa de hojas', 'Capa de fulles', '#52b350', { kind: 'shop', price: 650, minLevel: 7 }, '#c3e66a'),
  cape('capa-estrellas', 'Capa de estrellas', "Capa d'estrelles", '#2b3a7a', { kind: 'shop', price: 800, minLevel: 6 }, '#ffd84d'),
  hat('sombrero-cifras', 'Sombrero de las cifras', 'Barret de les xifres', { p: '#6a3fa0', y: '#ffd84d' }, ['.......kk.......', '......kppk......', '.....kpyppk.....', '..kkkkkkkkkkkk..'], { kind: 'shop', price: 1000, minLevel: 8, gem: 'tens-units' }),

  // Tesoros de los cofres de las zonas: se llevan puestos.
  accessory('farol', 'Farol del puente', 'Fanal del pont', { y: '#ffd84d' }, [...Array<string>(8).fill(BLANK), '.............k..', '............kyk.', '............kyk.', '............kkk.'], { kind: 'treasure', treasure: 'tesoro-puente' }),
  accessory('colgante-cristal', 'Cristal de la cueva', 'Cristall de la cova', { c: '#8fe8ff' }, [...Array<string>(8).fill(BLANK), '.....k....k.....', '......k..k......', '.......cc.......'], { kind: 'treasure', treasure: 'tesoro-cueva' }),
  hat('corona-piedra', 'Corona de piedra', 'Corona de pedra', { p: '#a9a39a', g: '#8fe8ff' }, ['....k...k...k...', '...kpk.kpk.kpk..', '...kpppppppppk..', '...kpgpppppgpk..'], { kind: 'treasure', treasure: 'tesoro-puerta' }),
  accessory('farolillo', 'Farolillo de bolsillo', 'Fanalet de butxaca', { o: '#ff9a3c' }, [...Array<string>(8).fill(BLANK), '.k..............', 'kok.............', 'kok.............', 'kkk.............'], { kind: 'treasure', treasure: 'tesoro-farolillos' }),
  hat('sombrero-pluma', 'Sombrero con pluma de búho', 'Barret amb ploma de mussol', { b: '#6e4527', f: '#d7d0b8' }, ['..........ff....', '....kbbbbbkf....', '....kbbbbbbk....', '..kkkkkkkkkkkk..'], { kind: 'treasure', treasure: 'tesoro-arbol' }),

  // Premios por aprender: subir de nivel y ganar gemas.
  cape('capa-bosque', 'Capa del bosque', 'Capa del bosc', '#2f6b2a', { kind: 'level', level: 3 }),
  hat('diadema-estrella', 'Diadema de estrella', "Diadema d'estrella", { y: '#ffd84d' }, ['.......y........', '......yyy.......', '...kkkkykkkkk...'], { kind: 'level', level: 5 }),
  cape('capa-dorada', 'Capa dorada', 'Capa daurada', '#d9a520', { kind: 'level', level: 10 }, '#fff3b0'),
  accessory('insignia-suma', 'Insignia de sumar', 'Insígnia de sumar', { y: '#ffd84d' }, [...Array<string>(8).fill(BLANK), '.......y........', '......yyy.......', '.......y........'], { kind: 'gem', gem: 'add-within-10' }),
  accessory('insignia-resta', 'Insignia de restar', 'Insígnia de restar', { c: '#8fe8ff' }, [...Array<string>(9).fill(BLANK), '......ccc.......'], { kind: 'gem', gem: 'sub-within-10' }),

  // Cofre sorpresa del día, en este orden (siempre algo que no se tiene).
  accessory('gafas-sol', 'Gafas de sol', 'Ulleres de sol', { d: '#1b1b2a', w: '#ffffff' }, [...Array<string>(4).fill(BLANK), '....dwdddwdd....'], { kind: 'gift' }),
  hat('lazo', 'Lazo', 'Llaç', { r: '#ff6fa8' }, [BLANK, '.........rr.rr..', '.........rrkrr..', '.........rr.rr..'], { kind: 'gift' }),
  hat('gorro-fiesta', 'Gorro de fiesta', 'Barret de festa', { w: '#ffffff', y: '#ffd84d', p: '#ff6fa8' }, ['.......w........', '......kyk.......', '.....kypyk......', '....kpypypk.....'], { kind: 'gift' }),
  clothes('ropa-pijama', 'Pijama de lunares', 'Pijama de pics', { p: '#9fc7f0', w: '#ffffff' }, [
    '....pppppppp....',
    '...ppwppppwpp...',
    '....pppppwpp....',
    '....pwpppppp....',
    '.....pp...pp....',
    '.....pw...pp....',
    '.....pp...wp....',
  ], { kind: 'gift' }),
  hat('antenas', 'Antenas de bicho', "Antenes d'insecte", { y: '#ffd84d' }, ['....y......y....', '.....k....k.....', '......k..k......'], { kind: 'gift' }),
  cape('capa-morada', 'Capa morada', 'Capa morada', '#7d4bb3', { kind: 'gift' }, '#ff9ed2'),
];

export const OUTFIT_PIECES: readonly OutfitPiece[] = PIECES;

/** Atuendo con el que empieza cualquier niño: una pieza por capa. */
export const DEFAULT_OUTFIT: Outfit = {
  back: 'sin-capa',
  body: 'piel-2',
  hair: 'pelo-corto',
  clothes: 'ropa-roja',
  accessory: 'nada',
  hat: 'sin-sombrero',
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
  return Object.fromEntries(OUTFIT_LAYERS.map((layer) => [layer, pick(layer)])) as Record<OutfitLayer, string>;
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
