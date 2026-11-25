import { createRng } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import {
  canWalk,
  createWildlife,
  generateRegion,
  isGateClosed,
  isReachable,
  openGate,
  pathTo,
  PRADERA_UNO,
  tickWildlife,
  zoneInterior,
  ZONA_CUEVA,
  type PlacedPiece,
  type Point,
  type RegionSpec,
} from '../src/index.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

const zones = (map: ReturnType<typeof generateRegion>): PlacedPiece[] => map.places.filter((p) => p.zone !== undefined);

describe('zonas cerradas', () => {
  it('Pradera Uno tiene tres zonas, cada una con puerta y cofre', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    expect(zones(map).map((z) => z.zone)).toEqual(['puente-roto', 'cueva', 'puerta-de-piedra']);
    for (const z of zones(map)) {
      expect(z.gate).toBeDefined();
      expect(z.chest).toBeDefined();
    }
  });

  it('cerrada, la puerta no se pisa y no se entra; abierta, sí y el cofre es alcanzable', () => {
    for (const seed of SEEDS) {
      const map = generateRegion(PRADERA_UNO, seed);
      for (const z of zones(map)) {
        const gate = z.gate as Point;
        const chest = z.chest as Point;
        expect(isGateClosed(map, gate)).toBe(true);
        expect(canWalk(map, gate)).toBe(false);
        // La puerta se alcanza desde el camino, pero el cofre no.
        expect(isReachable(map, map.entrance, z.link), `semilla ${seed}`).toBe(true);
        expect(isReachable(map, map.entrance, chest), `semilla ${seed}`).toBe(false);
        const walked = pathTo(map, map.entrance, chest);
        expect(walked.some((p) => p.x === chest.x && p.y === chest.y)).toBe(false);

        const open = openGate(map, gate);
        expect(isGateClosed(open, gate)).toBe(false);
        expect(canWalk(open, gate)).toBe(true);
        expect(isReachable(open, map.entrance, chest), `semilla ${seed}`).toBe(true);
        // No muta el mapa original.
        expect(isGateClosed(map, gate)).toBe(true);
      }
    }
  });

  it('abrir una casilla que no es puerta no cambia nada', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    expect(openGate(map, map.entrance)).toBe(map);
  });

  it('las zonas no se pisan con el pueblo ni con la arena', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    const cells = new Set<number>();
    for (const p of map.places) {
      for (let y = p.y; y < p.y + p.height; y++) {
        for (let x = p.x; x < p.x + p.width; x++) {
          const i = y * map.width + x;
          expect(cells.has(i)).toBe(false);
          cells.add(i);
        }
      }
    }
  });

  it('el interior es el claro de detrás de la puerta, con hierba alta y el cofre', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    for (const z of zones(map)) {
      const inside = zoneInterior(map, z);
      expect(inside.length).toBeGreaterThan(5);
      expect(inside).toContainEqual(z.chest);
      expect(inside).not.toContainEqual(z.gate);
      expect(inside).not.toContainEqual(z.link);
    }
    const sinCofre = map.places.find((p) => p.chest === undefined);
    expect(sinCofre && zoneInterior(map, sinCofre)).toEqual([]);
  });

  it('añadir una zona solo toca datos: un lugar más con `zone` y aparece en el mapa', () => {
    const extra: RegionSpec = {
      ...PRADERA_UNO,
      places: [...PRADERA_UNO.places, { piece: { ...ZONA_CUEVA, id: 'zona-nueva' }, x: 8, y: 4, zone: 'nueva' }],
    };
    const map = generateRegion(extra, 7);
    const nueva = map.places.find((p) => p.zone === 'nueva');
    expect(nueva?.id).toBe('zona-nueva');
    expect(isReachable(openGate(map, nueva?.gate as Point), map.entrance, nueva?.chest as Point)).toBe(true);
  });
});

describe('criaturas y zonas cerradas', () => {
  it('con el filtro, no salen ni andan en el interior de una zona cerrada, y assign recibe la casilla', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    const closed = new Set(zones(map).flatMap((z) => zoneInterior(map, z).map((p) => `${p.x},${p.y}`)));
    const allow = (p: Point): boolean => !closed.has(`${p.x},${p.y}`);
    const rng = createRng(3);
    const seen: Point[] = [];
    const assign = (_r: unknown, tile: Point): number => {
      seen.push(tile);
      return 1;
    };
    const spec = { ...PRADERA_UNO.wildlife, max: 40 };
    let state = createWildlife(map, spec, map.entrance, rng, assign, allow);
    for (let i = 0; i < 300; i++) state = tickWildlife(map, spec, state, 800, map.entrance, rng, assign, allow);
    expect(seen.length).toBeGreaterThanOrEqual(spec.max);
    for (const t of [...seen, ...state.wanderers.map((w) => w.tile)]) expect(allow(t)).toBe(true);
  });

  it('sin filtro, salen también en las zonas (para cuando están abiertas)', () => {
    const map = generateRegion(PRADERA_UNO, 42);
    const inside = new Set(zones(map).flatMap((z) => zoneInterior(map, z).map((p) => `${p.x},${p.y}`)));
    const rng = createRng(5);
    const spec = { ...PRADERA_UNO.wildlife, max: 200, minSpawnDistance: 0 };
    const state = createWildlife(map, spec, map.entrance, rng, () => 0);
    expect(state.wanderers.some((w) => inside.has(`${w.tile.x},${w.tile.y}`))).toBe(true);
  });
});
