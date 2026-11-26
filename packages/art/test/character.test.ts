import { describe, expect, it } from 'vitest';
import { CHARACTER_FRAMES, CHARACTER_PX, drawCharacter, getPx, validatePiece, type PieceArt } from '../src/index.js';

const row = (s: string): string => s.padEnd(CHARACTER_PX, '.');
const bottom: PieceArt = { rows: [row('aaaa'), row('aaaa')], colors: { a: 0x111111 } };
const top: PieceArt = { rows: [row('.bb')], colors: { b: 0x222222 } };
const legs: PieceArt = { rows: [...Array<string>(12).fill(row('')), row('..cc')], colors: { c: 0x333333 } };

describe('drawCharacter', () => {
  it('mide 16×16 en todos los fotogramas', () => {
    for (let f = 0; f < CHARACTER_FRAMES; f++) {
      const g = drawCharacter([bottom], f);
      expect([g.width, g.height]).toEqual([CHARACTER_PX, CHARACTER_PX]);
    }
  });

  it('la capa de arriba tapa a la de abajo, y lo transparente no tapa', () => {
    const g = drawCharacter([bottom, top], 0);
    expect(getPx(g, 0, 0)).toBe(0x111111);
    expect(getPx(g, 1, 0)).toBe(0x222222);
    expect(getPx(g, 2, 0)).toBe(0x222222);
    expect(getPx(g, 3, 0)).toBe(0x111111);
    // Al revés, manda la otra.
    expect(getPx(drawCharacter([top, bottom], 0), 1, 0)).toBe(0x111111);
  });

  it('cambiar una pieza cambia solo los píxeles de esa pieza', () => {
    const other: PieceArt = { rows: top.rows, colors: { b: 0x999999 } };
    const a = drawCharacter([bottom, top], 0);
    const b = drawCharacter([bottom, other], 0);
    const diff: number[] = [];
    a.px.forEach((c, i) => c !== b.px[i] && diff.push(i));
    expect(diff).toEqual([1, 2]);
  });

  it('mismo atuendo y fotograma → mismo dibujo', () => {
    expect(drawCharacter([bottom, top, legs], 1).px).toEqual(drawCharacter([bottom, top, legs], 1).px);
  });

  it('parado se repite en los fotogramas 0 y 2; los pasos mueven las piernas y no la cabeza', () => {
    const p = [bottom, legs];
    expect(drawCharacter(p, 0).px).toEqual(drawCharacter(p, 2).px);
    expect(getPx(drawCharacter(p, 0), 2, 12)).toBe(0x333333);
    expect(getPx(drawCharacter(p, 1), 1, 12)).toBe(0x333333);
    expect(getPx(drawCharacter(p, 3), 3, 12)).toBe(0x333333);
    expect(getPx(drawCharacter(p, 1), 0, 0)).toBe(0x111111);
  });

  it('el fotograma da la vuelta', () => {
    expect(drawCharacter([legs], 5).px).toEqual(drawCharacter([legs], 1).px);
  });
});

describe('validatePiece', () => {
  it('acepta una pieza bien hecha', () => expect(validatePiece(bottom)).toEqual([]));
  it('avisa de letras sin color y de filas largas', () => {
    expect(validatePiece({ rows: ['z'], colors: {} })).toHaveLength(1);
    expect(validatePiece({ rows: ['.'.repeat(17)], colors: {} })).toHaveLength(1);
    expect(validatePiece({ rows: Array<string>(17).fill(''), colors: {} })).toHaveLength(1);
  });
  it('avisa de píxeles de las piernas en los bordes', () => {
    const rows = Array<string>(16).fill('');
    rows[13] = 'x' + '.'.repeat(15);
    expect(validatePiece({ rows, colors: { x: 1 } })).toHaveLength(1);
  });
});
