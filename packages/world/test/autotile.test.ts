import { describe, expect, it } from 'vitest';
import {
  autotile,
  generateTerrain,
  MASK,
  neighborMask,
  PATH_TILES,
  PRADERA_UNO,
  validateTable,
  validMasks,
  variantFor,
  WATER_TILES,
  type AutotileTable,
  type TileKind,
  type WorldMap,
} from '../src/index.js';

const KINDS: Record<string, TileKind> = { '.': 'grass', A: 'water', '#': 'path', T: 'tree' };

/** Mapa escrito a mano: '.' hierba, 'A' agua, '#' camino, 'T' árbol. */
function map(rows: string[]): WorldMap {
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tiles: rows.flatMap((r) => Array.from(r, (c) => KINDS[c] ?? 'grass')),
  };
}

const { N, E, S, W, NE, SE, SW, NW } = MASK;

describe('neighborMask en modo 4', () => {
  it('una isla de agua no tiene ningún lado unido', () => {
    expect(neighborMask(map(['...', '.A.', '...']), 1, 1, 4)).toBe(0);
  });

  it('el centro de un lago tiene los cuatro lados unidos', () => {
    expect(neighborMask(map(['AAA', 'AAA', 'AAA']), 1, 1, 4)).toBe(N | E | S | W);
  });

  it('esquinas y bordes de un lago de 3×3 rodeado de hierba', () => {
    const lake = map(['.....', '.AAA.', '.AAA.', '.AAA.', '.....']);
    expect(neighborMask(lake, 1, 1, 4)).toBe(E | S); // esquina de arriba a la izquierda
    expect(neighborMask(lake, 3, 1, 4)).toBe(S | W); // esquina de arriba a la derecha
    expect(neighborMask(lake, 1, 3, 4)).toBe(N | E); // esquina de abajo a la izquierda
    expect(neighborMask(lake, 3, 3, 4)).toBe(N | W); // esquina de abajo a la derecha
    expect(neighborMask(lake, 2, 1, 4)).toBe(E | S | W); // borde de arriba
    expect(neighborMask(lake, 1, 2, 4)).toBe(N | E | S); // borde de la izquierda
    expect(neighborMask(lake, 2, 2, 4)).toBe(N | E | S | W); // centro
  });

  it('un camino recto, una curva y un cruce', () => {
    const roads = map(['.#...', '.#...', '.####', '.#.#.', '.#.#.']);
    expect(neighborMask(roads, 1, 1, 4)).toBe(N | S); // recto vertical
    expect(neighborMask(roads, 1, 2, 4)).toBe(N | E | S); // cruce en T
    expect(neighborMask(roads, 2, 2, 4)).toBe(E | W); // recto horizontal
    expect(neighborMask(roads, 3, 2, 4)).toBe(E | S | W); // T hacia abajo
    expect(neighborMask(roads, 3, 4, 4)).toBe(N | S); // toca el borde de abajo: sigue fuera
  });

  it('solo une casillas del mismo tipo: el camino no se une al agua', () => {
    const mixed = map(['.A.', '#A#', '.A.']);
    expect(neighborMask(mixed, 0, 1, 4)).toBe(W); // solo el borde del mapa
    expect(neighborMask(mixed, 1, 1, 4)).toBe(N | S);
  });

  it('fuera del mapa cuenta como unido', () => {
    expect(neighborMask(map(['A']), 0, 0, 4)).toBe(N | E | S | W);
    expect(neighborMask(map(['A.', '..']), 0, 0, 4)).toBe(N | W);
  });

  it('rechaza casillas fuera del mapa', () => {
    const m = map(['..']);
    expect(() => neighborMask(m, 2, 0, 4)).toThrow(RangeError);
    expect(() => neighborMask(m, -1, 0, 4)).toThrow(RangeError);
    expect(() => neighborMask(m, 0.5, 0, 4)).toThrow(RangeError);
  });
});

describe('neighborMask en modo 8', () => {
  it('el centro de un lago con todo alrededor tiene las 8 unidas', () => {
    expect(neighborMask(map(['AAA', 'AAA', 'AAA']), 1, 1, 8)).toBe(255);
  });

  it('una esquina hacia dentro: lados unidos y falta una diagonal', () => {
    // La casilla (1, 1) tiene agua en los cuatro lados, pero no arriba a la derecha.
    const notch = map(['AA.', 'AAA', 'AAA']);
    expect(neighborMask(notch, 1, 1, 8)).toBe(N | E | S | W | SE | SW | NW);
  });

  it('una diagonal sola no cuenta si falta alguno de sus dos lados', () => {
    // Agua en diagonal (arriba a la derecha) pero no arriba: NE no se enciende.
    const diag = map(['..A', '.AA', '...']);
    expect(neighborMask(diag, 1, 1, 8)).toBe(E);
  });

  it('esquina de un lago de 3×3 en modo 8 añade su diagonal hacia dentro', () => {
    const lake = map(['.....', '.AAA.', '.AAA.', '.AAA.', '.....']);
    expect(neighborMask(lake, 1, 1, 8)).toBe(E | S | SE);
    expect(neighborMask(lake, 2, 1, 8)).toBe(E | S | W | SE | SW);
  });
});

describe('validMasks', () => {
  it('hay 16 máscaras en modo 4 y 47 en modo 8', () => {
    expect(validMasks(4)).toHaveLength(16);
    expect(validMasks(8)).toHaveLength(47);
  });

  it('cualquier vecindario posible da una máscara de la lista', () => {
    // Las 256 formas de rodear una casilla de agua con agua o hierba.
    const valid8 = new Set(validMasks(8));
    const offsets = [
      [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0],
    ] as const;
    for (let around = 0; around < 256; around++) {
      const tiles: TileKind[] = Array.from({ length: 9 }, () => 'grass');
      tiles[4] = 'water';
      offsets.forEach(([x, y], bit) => {
        if (around & (1 << bit)) tiles[y * 3 + x] = 'water';
      });
      const m: WorldMap = { width: 3, height: 3, tiles };
      expect(valid8.has(neighborMask(m, 1, 1, 8))).toBe(true);
      expect(neighborMask(m, 1, 1, 4)).toBeLessThan(16);
    }
  });
});

describe('tablas', () => {
  it('las tablas provisionales cubren las 16 máscaras de lados', () => {
    for (const table of [WATER_TILES, PATH_TILES]) {
      expect(() => validateTable(table)).not.toThrow();
      for (const mask of validMasks(4)) expect(variantFor(mask, table)).toBe(mask);
    }
  });

  it('rechaza tablas mal escritas', () => {
    const ok: AutotileTable = { id: 'prueba', kind: 'water', mode: 4, variants: { 0: 3 }, fallback: 0 };
    expect(() => validateTable(ok)).not.toThrow();
    expect(() => validateTable({ ...ok, variants: { 16: 1 } })).toThrow(/no existe/);
    expect(() => validateTable({ ...ok, mode: 8, variants: { [NE]: 1 } })).toThrow(/no existe/);
    expect(() => validateTable({ ...ok, variants: { 0: -1 } })).toThrow(/no válida/);
    expect(() => validateTable({ ...ok, variants: { 0: 1.5 } })).toThrow(/no válida/);
    expect(() => validateTable({ ...ok, fallback: -1 })).toThrow(/reserva/);
  });

  it('una máscara que falta en la tabla usa la variante de reserva', () => {
    const partial: AutotileTable = { id: 'parcial', kind: 'water', mode: 4, variants: { 0: 7 }, fallback: 2 };
    expect(variantFor(0, partial)).toBe(7);
    expect(variantFor(N | S, partial)).toBe(2);
  });
});

describe('autotile', () => {
  const lake = map(['.....', '.AAA.', '.AAA.', '.AAA.', '.....']);

  it('pone variante a las casillas de su tipo y -1 al resto', () => {
    const variants = autotile(lake, WATER_TILES);
    expect(variants).toHaveLength(25);
    lake.tiles.forEach((t, i) => {
      if (t === 'water') expect(variants[i]).toBeGreaterThanOrEqual(0);
      else expect(variants[i]).toBe(-1);
    });
    expect(variants[1 * 5 + 1]).toBe(E | S);
    expect(variants[2 * 5 + 2]).toBe(N | E | S | W);
  });

  it('cambiar de pack solo es cambiar la tabla: mismo mapa, otras variantes', () => {
    // Un pack imaginario de 47 casillas en modo 8, numeradas en su propio orden.
    const variants: Record<number, number> = {};
    validMasks(8).forEach((mask, k) => (variants[mask] = 46 - k));
    const pack: AutotileTable = { id: 'pack-imaginario', kind: 'water', mode: 8, variants, fallback: 0 };

    const result = autotile(lake, pack);
    const index8 = (mask: number): number => 46 - validMasks(8).indexOf(mask);
    expect(result[1 * 5 + 1]).toBe(index8(E | S | SE));
    expect(result[2 * 5 + 2]).toBe(index8(255));
    expect(result[2 * 5 + 1]).toBe(index8(N | E | S | NE | SE));
  });

  it('funciona sobre un mapa generado de Pradera Uno y no lo modifica', () => {
    const terrain = generateTerrain(PRADERA_UNO, 42);
    const before = [...terrain.tiles];
    const variants = autotile(terrain, WATER_TILES);
    expect([...terrain.tiles]).toEqual(before);
    terrain.tiles.forEach((t, i) => {
      const x = i % terrain.width;
      const y = Math.floor(i / terrain.width);
      if (t === 'water') expect(variants[i]).toBe(neighborMask(terrain, x, y, 4));
      else expect(variants[i]).toBe(-1);
    });
    // El agua de Pradera Uno va en grupos, así que no hay islas de una casilla.
    expect([...variants].includes(0)).toBe(false);
  });

  it('rechaza una tabla mal escrita', () => {
    expect(() => autotile(lake, { ...WATER_TILES, fallback: -3 })).toThrow(RangeError);
  });

  it('en modo 4 las diagonales no cuentan', () => {
    // El centro tiene las 8 vecinas de agua, pero en modo 4 solo salen los lados.
    expect(neighborMask(lake, 2, 2, 4)).toBe(N | E | S | W);
    expect(neighborMask(lake, 2, 2, 4) & (NE | SE | SW | NW)).toBe(0);
  });
});
