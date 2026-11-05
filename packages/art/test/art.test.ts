import { generateRegion, PRADERA_UNO, validMasks, type TileKind, type WorldMap } from '@kalku/world';
import { describe, expect, it } from 'vitest';
import {
  BODIES,
  CREATURE_FRAMES,
  CREATURE_PX,
  drawBuilding,
  drawCreature,
  drawCreatureFrame,
  drawGrass,
  drawPath,
  drawWater,
  EMPTY,
  EYES,
  findBuildings,
  gridToRgba,
  RAMP_NAMES,
  TILE_PX,
  tilemapData,
  tilesetGrids,
  TILESET_SIZE,
  TOPS,
  toSheet,
  validateLook,
  WATER_FRAMES,
  type CreatureLook,
  type Grid,
} from '../src/index.js';

const same = (a: Grid, b: Grid): boolean => a.px.length === b.px.length && a.px.every((v, i) => v === b.px[i]);
const look: CreatureLook = { ramp: 'verde', body: 'round', top: 'sprout', eyes: 'big', cheeks: true, sign: '+' };

describe('casillas del mundo', () => {
  it('mismos datos y misma semilla dan el mismo dibujo', () => {
    expect(same(drawGrass(5), drawGrass(5))).toBe(true);
    expect(same(drawGrass(5), drawGrass(6))).toBe(false);
    for (const mask of validMasks(8)) {
      expect(same(drawWater(mask, 1), drawWater(mask, 1))).toBe(true);
      expect(same(drawPath(mask), drawPath(mask))).toBe(true);
    }
  });

  it('todas las casillas miden 16×16 y están enteras, sin huecos', () => {
    const grids = tilesetGrids(0);
    expect(grids).toHaveLength(TILESET_SIZE);
    for (const g of grids) {
      expect([g.width, g.height]).toEqual([TILE_PX, TILE_PX]);
      expect(g.px.every((c) => c !== EMPTY)).toBe(true);
    }
  });

  it('el agua se anima: cada fotograma es distinto y vuelve a empezar', () => {
    const frames = Array.from({ length: WATER_FRAMES }, (_, f) => drawWater(255, f));
    expect(same(frames[0] as Grid, frames[1] as Grid)).toBe(false);
    expect(same(frames[1] as Grid, frames[2] as Grid)).toBe(false);
    const first = tilesetGrids(0);
    const looped = tilesetGrids(WATER_FRAMES);
    expect(first.every((g, i) => same(g, looped[i] as Grid))).toBe(true);
    const next = tilesetGrids(1);
    expect(first.some((g, i) => !same(g, next[i] as Grid))).toBe(true);
  });

  it('el agua con orilla es distinta del agua rodeada de agua', () => {
    expect(same(drawWater(255, 0), drawWater(0, 0))).toBe(false);
  });

  it('el tileset solo cambia en el agua entre fotogramas', () => {
    const a = tilesetGrids(0);
    const b = tilesetGrids(1);
    const changed = a.flatMap((g, i) => (same(g, b[i] as Grid) ? [] : [i]));
    expect(changed).toHaveLength(validMasks(8).length);
  });
});

describe('mapa a fotogramas', () => {
  const region = generateRegion(PRADERA_UNO, 42);

  it('es determinista y usa fotogramas que existen', () => {
    const a = tilemapData(region, 42);
    expect(tilemapData(region, 42)).toEqual(a);
    const flat = a.flat();
    expect(flat).toHaveLength(region.width * region.height);
    expect(flat.every((f) => Number.isInteger(f) && f >= 0 && f < TILESET_SIZE)).toBe(true);
  });

  it('otra semilla da otras variantes de hierba', () => {
    expect(tilemapData(region, 43)).not.toEqual(tilemapData(region, 42));
  });
});

describe('edificios', () => {
  const rows = ['..CCC..', '..CCC..', '.......', 'SS..CC.', 'SS..CC.'];
  const kinds: Record<string, TileKind> = { '.': 'grass', C: 'house', S: 'shop' };
  const map: WorldMap = { width: 7, height: 5, tiles: rows.flatMap((r) => Array.from(r, (c) => kinds[c] ?? 'grass')) };

  it('agrupa las casillas en edificios rectangulares', () => {
    expect(findBuildings(map)).toEqual([
      { kind: 'house', x: 2, y: 0, width: 3, height: 2 },
      { kind: 'shop', x: 0, y: 3, width: 2, height: 2 },
      { kind: 'house', x: 4, y: 3, width: 2, height: 2 },
    ]);
  });

  it('en Pradera Uno hay casas y tienda, todas con sitio para dibujarse', () => {
    const buildings = findBuildings(generateRegion(PRADERA_UNO, 42));
    expect(buildings.some((b) => b.kind === 'house')).toBe(true);
    expect(buildings.some((b) => b.kind === 'shop')).toBe(true);
    for (const b of buildings) expect(drawBuilding(b.kind, b.width, b.height).width).toBe(b.width * TILE_PX);
  });

  it('el dibujo es determinista, mide lo que toca y deja transparentes las esquinas', () => {
    const g = drawBuilding('house', 3, 2);
    expect([g.width, g.height]).toEqual([48, 32]);
    expect(same(g, drawBuilding('house', 3, 2))).toBe(true);
    expect(same(g, drawBuilding('shop', 3, 2))).toBe(false);
    expect(g.px[0]).toBe(EMPTY);
  });

  it('rechaza tamaños demasiado pequeños', () => {
    expect(() => drawBuilding('house', 1, 2)).toThrow(RangeError);
  });
});

describe('criaturas por piezas', () => {
  it('mismos datos dan siempre el mismo dibujo, de 32×32 y con 8 fotogramas', () => {
    const frames = drawCreature(look);
    expect(frames).toHaveLength(CREATURE_FRAMES);
    for (const [i, g] of frames.entries()) {
      expect([g.width, g.height]).toEqual([CREATURE_PX, CREATURE_PX]);
      expect(same(g, drawCreatureFrame(look, i))).toBe(true);
    }
  });

  it('respira y parpadea: los fotogramas no son todos iguales', () => {
    const frames = drawCreature(look);
    expect(new Set(frames.map((g) => g.px.join(','))).size).toBeGreaterThan(3);
  });

  it('cada pieza cambia el dibujo', () => {
    const base = drawCreatureFrame(look, 0);
    for (const body of BODIES.filter((b) => b !== look.body)) expect(same(base, drawCreatureFrame({ ...look, body }, 0))).toBe(false);
    for (const top of TOPS.filter((t) => t !== look.top)) expect(same(base, drawCreatureFrame({ ...look, top }, 0))).toBe(false);
    for (const eyes of EYES.filter((e) => e !== look.eyes)) expect(same(base, drawCreatureFrame({ ...look, eyes }, 0))).toBe(false);
    for (const ramp of RAMP_NAMES.filter((r) => r !== look.ramp)) expect(same(base, drawCreatureFrame({ ...look, ramp }, 0))).toBe(false);
    expect(same(base, drawCreatureFrame({ ...look, sign: '-' }, 0))).toBe(false);
  });

  it('todas las combinaciones se dibujan dentro de los 32 px', () => {
    for (const body of BODIES) {
      for (const top of TOPS) {
        const g = drawCreatureFrame({ ...look, body, top }, 2);
        expect(g.px.some((c) => c !== EMPTY)).toBe(true);
      }
    }
  });

  it('valida las piezas', () => {
    expect(validateLook(look)).toEqual([]);
    expect(validateLook({ ...look, top: 'sombrero' as never })).toHaveLength(1);
  });
});

describe('paso a textura', () => {
  it('una tira junta los dibujos en RGBA', () => {
    const sheet = toSheet(drawCreature(look));
    expect([sheet.width, sheet.height, sheet.cell]).toEqual([CREATURE_PX * CREATURE_FRAMES, CREATURE_PX, CREATURE_PX]);
    expect(sheet.rgba).toHaveLength(sheet.width * sheet.height * 4);
    expect(gridToRgba(drawGrass(1))[3]).toBe(255);
  });
});
