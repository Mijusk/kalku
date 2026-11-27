import { describe, expect, it } from 'vitest';
import { drawCloud, drawFloatingIsland, drawGlyph, drawTitleLandscape, EMPTY, GLYPH_CHARS, ISLAND_H, ISLAND_W, OUTLINE, titleLayout, type Grid } from '../src/index.js';

const same = (a: Grid, b: Grid): boolean => a.px.length === b.px.length && a.px.every((v, i) => v === b.px[i]);

// Tamaños reales: ordenador, tablet y móvil en vertical (píxeles del dibujo, no de la pantalla).
const SIZES: [number, number][] = [
  [320, 180],
  [300, 207],
  [130, 281],
  [64, 96],
];

describe('portada (pantalla de inicio)', () => {
  it('reparte cielo, lago y suelo en orden para cualquier tamaño', () => {
    for (const [w, h] of SIZES) {
      const l = titleLayout(w, h);
      expect(l.horizon).toBeGreaterThan(h * 0.3);
      expect(l.lakeBottom).toBeGreaterThan(l.horizon);
      expect(l.groundTop).toBeGreaterThan(l.lakeBottom);
      // Siempre caben al menos dos filas de casillas de 16 px para la hierba y las criaturas.
      expect(h - l.groundTop).toBeGreaterThanOrEqual(32);
    }
  });

  it('no acepta tamaños absurdos', () => {
    expect(() => titleLayout(10, 10)).toThrow(RangeError);
    expect(() => titleLayout(100.5, 200)).toThrow(RangeError);
  });

  it('pinta todo hasta el suelo y deja el suelo transparente', () => {
    for (const [w, h] of SIZES) {
      const g = drawTitleLandscape(w, h, 7);
      const { groundTop } = titleLayout(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = g.px[y * w + x];
          if (y < groundTop) expect(c, `${w}×${h} (${x}, ${y})`).not.toBe(EMPTY);
          else expect(c).toBe(EMPTY);
        }
      }
    }
  });

  it('con la misma semilla sale lo mismo, y con otra cambia', () => {
    expect(same(drawTitleLandscape(300, 207, 3), drawTitleLandscape(300, 207, 3))).toBe(true);
    expect(same(drawTitleLandscape(300, 207, 3), drawTitleLandscape(300, 207, 4))).toBe(false);
    expect(same(drawCloud(5, 40), drawCloud(5, 40))).toBe(true);
    expect(same(drawFloatingIsland(1), drawFloatingIsland(1))).toBe(true);
  });

  it('la isla flotante tiene contorno oscuro y su tamaño', () => {
    const g = drawFloatingIsland(1);
    expect([g.width, g.height]).toEqual([ISLAND_W, ISLAND_H]);
    expect(g.px.includes(OUTLINE)).toBe(true);
  });

  it('las nubes tienen la base plana y algo de nube', () => {
    const g = drawCloud(9, 36);
    expect(g.px.some((c) => c !== EMPTY)).toBe(true);
    const lastRow = Array.from(g.px.subarray((g.height - 1) * g.width));
    expect(lastRow.every((c) => c === EMPTY)).toBe(true);
  });

  it('hay dibujo para cada cifra y signo, con borde', () => {
    for (const ch of GLYPH_CHARS) {
      const g = drawGlyph(ch, 0xffffff, 0x000000);
      expect(g.px.includes(0xffffff), ch).toBe(true);
      expect(g.px.includes(0x000000), ch).toBe(true);
    }
    expect(() => drawGlyph('?', 1, 2)).toThrow(RangeError);
  });
});
