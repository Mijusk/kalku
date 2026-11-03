import { describe, expect, it } from 'vitest';
import {
  canWalk,
  generateRegion,
  isReachable,
  pathTo,
  PRADERA_UNO,
  step,
  type Point,
  type TileKind,
  type WorldMap,
} from '../src/index.js';

const KINDS: Record<string, TileKind> = {
  '.': 'grass',
  '"': 'tallGrass',
  '*': 'flowers',
  '#': 'path',
  T: 'tree',
  A: 'water',
  C: 'house',
  S: 'shop',
  J: 'boss',
};

/** Mapa escrito a mano con la misma leyenda que las piezas. */
function map(rows: string[]): WorldMap {
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tiles: rows.flatMap((r) => Array.from(r, (c) => KINDS[c] ?? 'grass')),
  };
}

/** Comprueba que una ruta va de vecina en vecina, en cruz, y solo por casillas que se pisan. */
function expectValidRoute(m: WorldMap, from: Point, route: readonly Point[]): void {
  let current = from;
  for (const p of route) {
    expect(Math.abs(p.x - current.x) + Math.abs(p.y - current.y)).toBe(1);
    expect(canWalk(m, p)).toBe(true);
    current = p;
  }
}

describe('canWalk', () => {
  it('se pisa hierba, hierba alta, flores, camino y la casilla del jefe', () => {
    const m = map(['."*#J', 'TACS.']);
    for (let x = 0; x < 5; x++) expect(canWalk(m, { x, y: 0 })).toBe(true);
    for (let x = 0; x < 4; x++) expect(canWalk(m, { x, y: 1 })).toBe(false);
  });

  it('fuera del mapa o en medio de una casilla no se puede', () => {
    const m = map(['..', '..']);
    expect(canWalk(m, { x: -1, y: 0 })).toBe(false);
    expect(canWalk(m, { x: 2, y: 0 })).toBe(false);
    expect(canWalk(m, { x: 0, y: 2 })).toBe(false);
    expect(canWalk(m, { x: 0.5, y: 0 })).toBe(false);
  });
});

describe('step', () => {
  const m = map(['.T.', '...', 'A..']);

  it('avanza una casilla si se puede pisar', () => {
    expect(step(m, { x: 1, y: 1 }, 'up')).toEqual({ x: 1, y: 1 }); // árbol
    expect(step(m, { x: 1, y: 1 }, 'down')).toEqual({ x: 1, y: 2 });
    expect(step(m, { x: 1, y: 1 }, 'left')).toEqual({ x: 0, y: 1 });
    expect(step(m, { x: 1, y: 1 }, 'right')).toEqual({ x: 2, y: 1 });
  });

  it('no atraviesa agua, árboles ni el borde del mapa', () => {
    expect(step(m, { x: 0, y: 1 }, 'down')).toEqual({ x: 0, y: 1 }); // agua
    expect(step(m, { x: 0, y: 0 }, 'right')).toEqual({ x: 0, y: 0 }); // árbol
    expect(step(m, { x: 0, y: 0 }, 'up')).toEqual({ x: 0, y: 0 }); // borde
    expect(step(m, { x: 2, y: 2 }, 'right')).toEqual({ x: 2, y: 2 }); // borde
  });
});

describe('pathTo', () => {
  it('va por el camino más corto rodeando lo que no se pisa', () => {
    const m = map(['.....', '.TTT.', '.T.T.', '.....']);
    const from = { x: 2, y: 2 };
    const route = pathTo(m, from, { x: 2, y: 0 });
    expectValidRoute(m, from, route);
    expect(route.at(-1)).toEqual({ x: 2, y: 0 });
    // Bajar, rodear el bloque por un lado y subir: 1 + 2 + 3 + 2 = 8 pasos.
    expect(route).toHaveLength(8);
  });

  it('si toca un árbol o el agua, va a la casilla más cercana a la que se llega', () => {
    const m = map(['....', '.AA.', '.AA.', '....']);
    const from = { x: 0, y: 0 };
    const route = pathTo(m, from, { x: 2, y: 2 });
    expectValidRoute(m, from, route);
    const end = route.at(-1);
    expect(end).toBeDefined();
    if (end === undefined) return;
    expect(Math.abs(end.x - 2) + Math.abs(end.y - 2)).toBe(1);
  });

  it('si el destino está cerrado, se acerca todo lo que puede', () => {
    const m = map(['...T.', '...T.', '...T.']);
    const route = pathTo(m, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(route.at(-1)).toEqual({ x: 2, y: 1 });
  });

  it('no se mueve si ya está en el destino o si parte de una casilla que no se pisa', () => {
    const m = map(['..', '.T']);
    expect(pathTo(m, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(pathTo(m, { x: 1, y: 1 }, { x: 0, y: 0 })).toEqual([]);
  });

  it('un destino fuera del mapa se toma como el borde más cercano', () => {
    const m = map(['...', '...']);
    expect(pathTo(m, { x: 0, y: 0 }, { x: 10, y: -5 }).at(-1)).toEqual({ x: 2, y: 0 });
  });

  it('en Pradera Uno se llega andando de la entrada al pueblo y al jefe', () => {
    for (const seed of [1, 42, 2026, 123_456]) {
      const region = generateRegion(PRADERA_UNO, seed);
      const boss = region.tiles.indexOf('boss');
      const targets: Point[] = [
        ...region.places.map((p) => p.link),
        { x: boss % region.width, y: Math.floor(boss / region.width) },
      ];
      for (const target of targets) {
        const route = pathTo(region, region.entrance, target);
        expectValidRoute(region, region.entrance, route);
        expect(route.at(-1)).toEqual(target);
        expect(isReachable(region, region.entrance, target)).toBe(true);
      }
    }
  });

  it('con el mismo mapa da siempre la misma ruta', () => {
    const region = generateRegion(PRADERA_UNO, 42);
    const target = region.places[1]?.link ?? region.entrance;
    expect(pathTo(region, region.entrance, target)).toEqual(pathTo(region, region.entrance, target));
  });
});
