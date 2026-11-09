import { describe, expect, it } from 'vitest';
import { drawCharacter, getPx } from '@kalku/art';
import {
  DEFAULT_OUTFIT,
  OUTFIT_LAYERS,
  OUTFIT_PIECES,
  outfitPieces,
  parseOutfit,
  piecesForLayer,
  setPiece,
  validateOutfitPieces,
} from '../src/index.js';

describe('piezas', () => {
  it('son válidas: ids únicos, capa válida, nombres es/ca y dibujos que caben', () => {
    expect(validateOutfitPieces()).toEqual([]);
  });
  it('hay 4 tonos de piel distintos, 3 peinados, 2 ropas y 2 accesorios (uno es «ninguno»)', () => {
    const body = piecesForLayer('body');
    expect(body).toHaveLength(4);
    expect(new Set(body.map((p) => p.art.colors.s)).size).toBe(4);
    expect(piecesForLayer('hair')).toHaveLength(3);
    expect(piecesForLayer('clothes')).toHaveLength(2);
    expect(piecesForLayer('accessory')).toHaveLength(2);
    expect(piecesForLayer('accessory').some((p) => p.id === 'nada' && p.art.rows.length === 0)).toBe(true);
  });
  it('validateOutfitPieces avisa de ids repetidos', () => {
    const first = OUTFIT_PIECES[0];
    if (!first) throw new Error('sin piezas');
    expect(validateOutfitPieces([first, first]).length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_OUTFIT', () => {
  it('tiene una pieza por capa, de esa capa, y el cuerpo es uno de los tonos', () => {
    const pieces = outfitPieces(DEFAULT_OUTFIT);
    expect(pieces.map((p) => p.layer)).toEqual([...OUTFIT_LAYERS]);
    expect(piecesForLayer('body').map((p) => p.id)).toContain(DEFAULT_OUTFIT.body);
  });
  it('se puede dibujar', () => {
    const g = drawCharacter(pieces(DEFAULT_OUTFIT), 0);
    expect(g.px.some((c) => c !== -1)).toBe(true);
  });
});

function pieces(o: typeof DEFAULT_OUTFIT) {
  return outfitPieces(o).map((p) => p.art);
}

describe('cambiar una pieza cambia el personaje', () => {
  it('otro tono de piel pinta la cara de otro color y deja la ropa igual', () => {
    const dark = setPiece(DEFAULT_OUTFIT, 'body', 'piel-4');
    const a = drawCharacter(pieces(DEFAULT_OUTFIT), 0);
    const b = drawCharacter(pieces(dark), 0);
    expect(getPx(a, 5, 5)).not.toBe(getPx(b, 5, 5));
    expect(getPx(a, 6, 9)).toBe(getPx(b, 6, 9)); // camiseta
  });
  it('las gafas añaden píxeles', () => {
    const a = drawCharacter(pieces(DEFAULT_OUTFIT), 0);
    const b = drawCharacter(pieces(setPiece(DEFAULT_OUTFIT, 'accessory', 'gafas')), 0);
    expect(b.px).not.toEqual(a.px);
  });
});

describe('setPiece', () => {
  it('no muta el atuendo que recibe', () => {
    const before = { ...DEFAULT_OUTFIT };
    const next = setPiece(DEFAULT_OUTFIT, 'hair', 'pelo-largo');
    expect(DEFAULT_OUTFIT).toEqual(before);
    expect(next.hair).toBe('pelo-largo');
  });
  it('rechaza una pieza de otra capa o que no existe', () => {
    expect(() => setPiece(DEFAULT_OUTFIT, 'hair', 'gafas')).toThrow(RangeError);
    expect(() => setPiece(DEFAULT_OUTFIT, 'hair', 'inventada')).toThrow(RangeError);
  });
});

describe('parseOutfit', () => {
  it('acepta un atuendo válido', () => {
    const o = setPiece(setPiece(DEFAULT_OUTFIT, 'hair', 'pelo-pinchos'), 'accessory', 'gafas');
    expect(parseOutfit(JSON.parse(JSON.stringify(o)))).toEqual(o);
  });
  it('sustituye ids inventados y piezas de otra capa por la pieza por defecto', () => {
    expect(parseOutfit({ ...DEFAULT_OUTFIT, hair: 'inventado', clothes: 'gafas' })).toEqual(DEFAULT_OUTFIT);
  });
  it('datos corruptos dan el atuendo por defecto', () => {
    for (const raw of [undefined, null, 5, 'x', [], { body: 3, hair: null }]) expect(parseOutfit(raw)).toEqual(DEFAULT_OUTFIT);
  });
});
