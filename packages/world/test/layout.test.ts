import { describe, expect, it } from 'vitest';
import {
  ARENA_PRADERA,
  CLEARING_RADIUS,
  generateRegion,
  generateTerrain,
  isReachable,
  neighbors,
  parsePiece,
  PIECE_LEGEND,
  PRADERA_UNO,
  PUEBLO_PRADERA,
  type PieceSpec,
  type Point,
  type RegionMap,
  type RegionSpec,
  type TileKind,
  type WorldMap,
} from '../src/index.js';

const SEEDS = Array.from({ length: 1_000 }, (_, i) => i * 104_729 + 3);

function bossTile(map: RegionMap): Point {
  const i = map.tiles.indexOf('boss');
  expect(i).toBeGreaterThanOrEqual(0);
  return { x: i % map.width, y: Math.floor(i / map.width) };
}

/** Casillas de cada pieza colocada, en coordenadas del mapa. */
function pieceCells(map: RegionMap): Set<number> {
  const cells = new Set<number>();
  for (const p of map.places) {
    for (let dy = 0; dy < p.height; dy++) {
      for (let dx = 0; dx < p.width; dx++) cells.add((p.y + dy) * map.width + p.x + dx);
    }
  }
  return cells;
}

describe('generateRegion: Pradera Uno', () => {
  const maps = SEEDS.map((seed) => ({ seed, map: generateRegion(PRADERA_UNO, seed) }));

  it('con la misma semilla sale exactamente el mismo mapa', () => {
    for (const seed of [0, 42, 4_294_967_295]) {
      expect(generateRegion(PRADERA_UNO, seed)).toEqual(generateRegion(PRADERA_UNO, seed));
    }
  });

  it('con 1.000 semillas siempre se puede ir andando de la entrada al pueblo y al jefe', () => {
    for (const { map } of maps) {
      expect(map.tiles[map.entrance.y * map.width + map.entrance.x]).toBe('path');
      for (const place of map.places) expect(isReachable(map, map.entrance, place.link)).toBe(true);
      expect(isReachable(map, map.entrance, bossTile(map))).toBe(true);
    }
  });

  it('las piezas aparecen exactamente como están escritas', () => {
    for (const { map } of maps) {
      for (const [k, place] of map.places.entries()) {
        const spec = PRADERA_UNO.places[k];
        expect(spec).toBeDefined();
        if (spec === undefined) continue;
        spec.piece.rows.forEach((row, dy) => {
          const written = Array.from(row, (char) => PIECE_LEGEND[char]);
          const actual = map.tiles.slice((place.y + dy) * map.width + place.x, (place.y + dy) * map.width + place.x + place.width);
          expect(actual).toEqual(written);
        });
      }
    }
  });

  it('ninguna pieza se sale del mapa ni se pisa con otra', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    expect(map.places.map((p) => p.id)).toEqual(['pueblo-pradera', 'arena-pradera']);
    let cellsInPieces = 0;
    for (const p of map.places) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(map.width);
      expect(p.y + p.height).toBeLessThanOrEqual(map.height);
      cellsInPieces += p.width * p.height;
    }
    // Si dos piezas se pisaran, habría menos casillas distintas que la suma de sus áreas.
    expect(pieceCells(map).size).toBe(cellsInPieces);
  });

  it('el camino esquiva el agua: solo pone un puente si no hay otra forma de llegar, y es raro', () => {
    let seedsWithBridge = 0;
    for (const { seed, map } of maps) {
      const terrain = generateTerrain(PRADERA_UNO, seed);
      const pieces = pieceCells(map);
      const stops = [map.entrance, ...map.places.map((p) => p.link)];
      // El agua de los claros alrededor de la entrada y los enlaces se quita a propósito: no es puente.
      const inClearing = (i: number): boolean =>
        stops.some((p) => Math.abs((i % map.width) - p.x) + Math.abs(Math.floor(i / map.width) - p.y) <= CLEARING_RADIUS);
      const isBridge = (t: TileKind, i: number): boolean =>
        t === 'path' && !pieces.has(i) && !inClearing(i) && terrain.tiles[i] === 'water';
      if (!map.tiles.some(isBridge)) continue;
      seedsWithBridge++;

      // Con el agua que había al trazar el camino (la del terreno, menos los claros) y todos los
      // árboles talados, no debe haber otra forma de llegar. La limpieza final puede quitar agua
      // suelta junto al puente, por eso se mira el agua del terreno y no la del mapa final.
      // El camino no atraviesa piezas, así que por dentro de ellas solo cuenta el enlace.
      const links = new Set(stops.map((p) => p.y * map.width + p.x));
      const withoutBridge: WorldMap = {
        ...map,
        tiles: map.tiles.map((t, i): TileKind => {
          if (pieces.has(i)) return links.has(i) ? t : 'house';
          if (terrain.tiles[i] === 'water' && !inClearing(i)) return 'water';
          return t === 'tree' ? 'grass' : t;
        }),
      };
      const reachesAll = map.places.every((p) => isReachable(withoutBridge, map.entrance, p.link));
      expect(reachesAll, `semilla ${seed}: el puente se podía evitar`).toBe(false);
    }
    expect(seedsWithBridge).toBeLessThanOrEqual(SEEDS.length * 0.03);
  });

  it('fuera de las piezas no quedan árboles ni agua sueltos', () => {
    for (const { map } of maps.slice(0, 200)) {
      const pieces = pieceCells(map);
      map.tiles.forEach((t, i) => {
        if (pieces.has(i) || (t !== 'tree' && t !== 'water')) return;
        expect(neighbors(i, map.width, map.height).some((n) => map.tiles[n] === t)).toBe(true);
      });
    }
  });

  it('las piezas de casas, tienda y jefe solo salen de las piezas', () => {
    for (const { map } of maps.slice(0, 200)) {
      const pieces = pieceCells(map);
      map.tiles.forEach((t, i) => {
        if (t === 'house' || t === 'shop' || t === 'boss') expect(pieces.has(i)).toBe(true);
      });
    }
  });
});

describe('generateRegion: regiones no válidas', () => {
  const base: RegionSpec = PRADERA_UNO;

  it('rechaza piezas que se salen del mapa', () => {
    expect(() => generateRegion({ ...base, places: [{ piece: ARENA_PRADERA, x: 55, y: 0 }] }, 1)).toThrow(RangeError);
    expect(() => generateRegion({ ...base, places: [{ piece: ARENA_PRADERA, x: 0, y: 36 }] }, 1)).toThrow(RangeError);
    expect(() => generateRegion({ ...base, places: [{ piece: ARENA_PRADERA, x: -1, y: 5 }] }, 1)).toThrow(RangeError);
  });

  it('rechaza piezas que se pisan o tapan la entrada', () => {
    expect(() =>
      generateRegion(
        {
          ...base,
          places: [
            { piece: PUEBLO_PRADERA, x: 10, y: 10 },
            { piece: ARENA_PRADERA, x: 20, y: 16 },
          ],
        },
        1,
      ),
    ).toThrow(/se pisa/);
    expect(() => generateRegion({ ...base, places: [{ piece: PUEBLO_PRADERA, x: 0, y: 17 }] }, 1)).toThrow(/entrada/);
  });

  it('rechaza una entrada que no está en el borde', () => {
    expect(() => generateRegion({ ...base, entrance: { x: 5, y: 5 } }, 1)).toThrow(RangeError);
    expect(() => generateRegion({ ...base, entrance: { x: 60, y: 5 } }, 1)).toThrow(RangeError);
  });

  it('avisa si no hay forma de llegar a un lugar', () => {
    // El enlace del pueblo da justo contra la pared de la arena.
    const blocked: RegionSpec = {
      ...base,
      places: [
        { piece: PUEBLO_PRADERA, x: 20, y: 5 },
        { piece: ARENA_PRADERA, x: 21, y: 12 },
      ],
    };
    expect(() => generateRegion(blocked, 1)).toThrow(/No hay forma de llegar/);
  });
});

describe('parsePiece', () => {
  it('traduce cada letra con la leyenda', () => {
    const grid = parsePiece(ARENA_PRADERA);
    expect(grid).toHaveLength(7);
    expect(grid[3]).toEqual(['path', 'path', 'path', 'grass', 'boss', 'grass', 'grass', 'tree']);
  });

  it('rechaza piezas mal escritas', () => {
    const ok: PieceSpec = { id: 'prueba', rows: ['#.', '..'], link: { x: 0, y: 0 } };
    expect(() => parsePiece(ok)).not.toThrow();
    expect(() => parsePiece({ ...ok, rows: [] })).toThrow(/vacía/);
    expect(() => parsePiece({ ...ok, rows: ['#.', '...'] })).toThrow(/mide/);
    expect(() => parsePiece({ ...ok, rows: ['#X', '..'] })).toThrow(/desconocida/);
    expect(() => parsePiece({ ...ok, rows: ['#.', '.C'], link: { x: 1, y: 1 } })).toThrow(/pisar/);
    expect(() => parsePiece({ ...ok, rows: ['...', '...', '...'], link: { x: 1, y: 1 } })).toThrow(/borde/);
  });
});

describe('isReachable', () => {
  const kinds: Record<string, TileKind> = { '.': 'grass', T: 'tree', A: 'water' };
  const map = (rows: string[]): WorldMap => ({
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tiles: rows.flatMap((r) => Array.from(r, (c) => kinds[c] ?? 'grass')),
  });

  it('busca por casillas transitables en cruz, sin diagonales', () => {
    const open = map(['..A', 'A.A', 'A..']);
    expect(isReachable(open, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(true);
    const diagonal = map(['.A', 'A.']);
    expect(isReachable(diagonal, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
    const wall = map(['.T.', '.T.', '.T.']);
    expect(isReachable(wall, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
    expect(isReachable(wall, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe(false);
  });
});
