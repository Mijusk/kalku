import { createRng } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import {
  generateTerrain,
  neighbors,
  PRADERA_UNO,
  tileAt,
  valueNoise,
  type FeatureKind,
  type TerrainSpec,
  type TileKind,
  type WorldMap,
} from '../src/index.js';

const SEEDS = Array.from({ length: 100 }, (_, i) => i * 7919 + 1);
const FEATURES: readonly FeatureKind[] = ['water', 'tree', 'tallGrass', 'flowers'];
const ALL_KINDS: readonly TileKind[] = ['grass', 'tallGrass', 'tree', 'water', 'path', 'flowers'];

/** Una región distinta a Pradera Uno, con mucha agua y bosque, para probar otros tamaños. */
const LAKES: TerrainSpec = {
  id: 'prueba-lagos',
  width: 37,
  height: 23,
  proportions: { water: 0.3, tree: 0.25, tallGrass: 0.1, flowers: 0.1 },
};

function share(map: WorldMap, kind: TileKind): number {
  return map.tiles.filter((t) => t === kind).length / map.tiles.length;
}

function isolated(map: WorldMap, kind: TileKind): number[] {
  return map.tiles.flatMap((t, i) =>
    t === kind && !neighbors(i, map.width, map.height).some((n) => map.tiles[n] === kind) ? [i] : [],
  );
}

describe('generateTerrain', () => {
  it('Pradera Uno mide 60×40 casillas', () => {
    expect(PRADERA_UNO.width).toBe(60);
    expect(PRADERA_UNO.height).toBe(40);
    const map = generateTerrain(PRADERA_UNO, 42);
    expect(map.width).toBe(60);
    expect(map.height).toBe(40);
    expect(map.tiles).toHaveLength(60 * 40);
  });

  it('con la misma semilla y región sale exactamente el mismo mapa', () => {
    for (const region of [PRADERA_UNO, LAKES]) {
      for (const seed of [0, 42, 123_456, 4_294_967_295]) {
        expect(generateTerrain(region, seed)).toEqual(generateTerrain(region, seed));
      }
    }
  });

  it('semillas distintas dan mapas distintos', () => {
    const maps = new Set(SEEDS.map((seed) => generateTerrain(PRADERA_UNO, seed).tiles.join(',')));
    expect(maps.size).toBe(SEEDS.length);
  });

  it('solo usa tipos de casilla conocidos y no pone caminos (eso es otra tarea)', () => {
    const map = generateTerrain(PRADERA_UNO, 42);
    for (const t of map.tiles) expect(ALL_KINDS).toContain(t);
    expect(share(map, 'path')).toBe(0);
  });

  it('las proporciones de cada tipo quedan a menos de 5 puntos de lo pedido', () => {
    for (const region of [PRADERA_UNO, LAKES]) {
      const requestedGrass = 1 - FEATURES.reduce((sum, k) => sum + region.proportions[k], 0);
      for (const seed of SEEDS) {
        const map = generateTerrain(region, seed);
        for (const kind of FEATURES) {
          expect(Math.abs(share(map, kind) - region.proportions[kind])).toBeLessThanOrEqual(0.05);
        }
        expect(Math.abs(share(map, 'grass') - requestedGrass)).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('no hay árboles ni agua sueltos de una sola casilla', () => {
    for (const region of [PRADERA_UNO, LAKES]) {
      for (const seed of SEEDS) {
        const map = generateTerrain(region, seed);
        expect(isolated(map, 'tree')).toEqual([]);
        expect(isolated(map, 'water')).toEqual([]);
      }
    }
  });

  it('no muta la región que recibe', () => {
    const region = structuredClone(PRADERA_UNO);
    generateTerrain(region, 7);
    expect(region).toEqual(PRADERA_UNO);
  });

  it('una región sin agua ni árboles es todo hierba, hierba alta y flores', () => {
    const map = generateTerrain(
      { id: 'prueba-llanura', width: 20, height: 10, proportions: { water: 0, tree: 0, tallGrass: 0.5, flowers: 0.1 } },
      3,
    );
    expect(share(map, 'water')).toBe(0);
    expect(share(map, 'tree')).toBe(0);
    expect(share(map, 'tallGrass')).toBeCloseTo(0.5, 5);
  });

  it('los cupos se reparten juntos: nunca piden más casillas de las que hay', () => {
    // 13×2 = 26 casillas; 4 × 0,25 redondeado por separado pediría 28.
    const full: TerrainSpec = {
      id: 'prueba-llena',
      width: 13,
      height: 2,
      proportions: { water: 0.25, tree: 0.25, tallGrass: 0.25, flowers: 0.25 },
    };
    for (let seed = 0; seed < 200; seed++) {
      const map = generateTerrain(full, seed);
      const count = (kind: TileKind): number => map.tiles.filter((t) => t === kind).length;
      // Los cupos son 7, 7, 6 y 6: ninguna capa pasa de 7.
      for (const kind of FEATURES) expect(count(kind)).toBeLessThanOrEqual(7);
      // Las capas sin agrupar siempre llegan a su cupo; antes las flores se quedaban en 5.
      expect(count('tallGrass')).toBeGreaterThanOrEqual(6);
      expect(count('flowers')).toBeGreaterThanOrEqual(6);
      expect(isolated(map, 'tree')).toEqual([]);
      expect(isolated(map, 'water')).toEqual([]);
    }
  });

  it('en regiones diminutas el primer grupo no se pierde', () => {
    // 3×2, mitad agua y un tercio de árboles (con la semilla 25 el árbol se perdía): siempre hay una pareja.
    const tiny: TerrainSpec = {
      id: 'prueba-diminuta',
      width: 3,
      height: 2,
      proportions: { water: 0.5, tree: 1 / 3, tallGrass: 0, flowers: 0 },
    };
    for (let seed = 0; seed < 300; seed++) {
      const map = generateTerrain(tiny, seed);
      expect(map.tiles.filter((t) => t === 'tree')).toHaveLength(2);
      expect(isolated(map, 'tree')).toEqual([]);
    }
  });

  it('rechaza regiones no válidas', () => {
    const base = PRADERA_UNO;
    expect(() => generateTerrain({ ...base, width: 0 }, 1)).toThrow(RangeError);
    expect(() => generateTerrain({ ...base, height: 2.5 }, 1)).toThrow(RangeError);
    expect(() => generateTerrain({ ...base, proportions: { ...base.proportions, water: -0.1 } }, 1)).toThrow(RangeError);
    expect(() => generateTerrain({ ...base, proportions: { ...base.proportions, tree: Number.NaN } }, 1)).toThrow(
      RangeError,
    );
    expect(() =>
      generateTerrain({ ...base, proportions: { water: 0.5, tree: 0.5, tallGrass: 0.1, flowers: 0 } }, 1),
    ).toThrow(RangeError);
  });
});

describe('tileAt y neighbors', () => {
  const map = generateTerrain(PRADERA_UNO, 42);

  it('tileAt lee por filas y devuelve undefined fuera del mapa', () => {
    expect(tileAt(map, 3, 2)).toBe(map.tiles[2 * 60 + 3]);
    expect(tileAt(map, -1, 0)).toBeUndefined();
    expect(tileAt(map, 60, 0)).toBeUndefined();
    expect(tileAt(map, 0, 40)).toBeUndefined();
    expect(tileAt(map, 1.5, 0)).toBeUndefined();
  });

  it('neighbors da las 4 vecinas sin salirse ni dar la vuelta por los bordes', () => {
    expect(neighbors(0, 60, 40).sort((a, b) => a - b)).toEqual([1, 60]);
    expect(neighbors(59, 60, 40).sort((a, b) => a - b)).toEqual([58, 119]);
    expect(neighbors(61, 60, 40).sort((a, b) => a - b)).toEqual([1, 60, 62, 121]);
    expect(neighbors(60 * 40 - 1, 60, 40)).toHaveLength(2);
  });
});

describe('valueNoise', () => {
  it('es reproducible y da valores en [0, 1)', () => {
    const a = valueNoise(30, 20, 5, 3, createRng(9));
    const b = valueNoise(30, 20, 5, 3, createRng(9));
    expect(a).toEqual(b);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('rechaza parámetros que darían NaN o un mapa vacío', () => {
    expect(() => valueNoise(10, 10, 4, 0, createRng(1))).toThrow(RangeError);
    expect(() => valueNoise(10, 10, 4, 1.5, createRng(1))).toThrow(RangeError);
    expect(() => valueNoise(10, 10, 0, 2, createRng(1))).toThrow(RangeError);
    expect(() => valueNoise(0, 10, 4, 2, createRng(1))).toThrow(RangeError);
  });

  it('es suave: casillas vecinas se parecen más que casillas al azar', () => {
    const width = 60;
    const noise = valueNoise(width, 40, 8, 1, createRng(5));
    const rng = createRng(11);
    let neighborDiff = 0;
    let randomDiff = 0;
    for (let k = 0; k < 2_000; k++) {
      const i = rng.int(0, noise.length - 2);
      const j = rng.int(0, noise.length - 1);
      const right = i % width === width - 1 ? i - 1 : i + 1;
      neighborDiff += Math.abs((noise[i] ?? 0) - (noise[right] ?? 0));
      randomDiff += Math.abs((noise[i] ?? 0) - (noise[j] ?? 0));
    }
    expect(neighborDiff * 3).toBeLessThan(randomDiff);
  });
});
