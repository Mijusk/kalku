import { createRng } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import {
  createWildlife,
  endEncounter,
  findCollision,
  generateRegion,
  PRADERA_UNO,
  tickWildlife,
  type Point,
  type WildlifeState,
} from '../src/index.js';

const map = generateRegion(PRADERA_UNO, 42);
const spec = PRADERA_UNO.wildlife;
const hero: Point = map.entrance;
const assign = (rng: { int(a: number, b: number): number }): number => rng.int(0, 5);

const kindAt = (p: Point): string | undefined => map.tiles[p.y * map.width + p.x];

function run(seed: number, ticks: number, dt = 100): WildlifeState<number> {
  const rng = createRng(seed);
  let state = createWildlife(map, spec, hero, rng, assign);
  for (let i = 0; i < ticks; i++) state = tickWildlife(map, spec, state, dt, hero, rng, assign);
  return state;
}

describe('criaturas visibles', () => {
  it('salen tantas como el máximo, solo en hierba alta y lejos del personaje', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const state = createWildlife(map, spec, hero, createRng(seed), assign);
      expect(state.wanderers).toHaveLength(spec.max);
      for (const w of state.wanderers) {
        expect(kindAt(w.tile)).toBe('tallGrass');
        expect(Math.abs(w.tile.x - hero.x) + Math.abs(w.tile.y - hero.y)).toBeGreaterThanOrEqual(spec.minSpawnDistance);
      }
    }
  });

  it('nunca salen de la hierba alta ni superan el máximo, ni al andar mucho tiempo', () => {
    const rng = createRng(7);
    let state = createWildlife(map, spec, hero, rng, assign);
    for (let i = 0; i < 3000; i++) {
      state = tickWildlife(map, spec, state, 100, hero, rng, assign);
      expect(state.wanderers.length).toBeLessThanOrEqual(spec.max);
      for (const w of state.wanderers) expect(kindAt(w.tile)).toBe('tallGrass');
      const keys = state.wanderers.map((w) => `${w.tile.x},${w.tile.y}`);
      expect(new Set(keys).size).toBe(keys.length);
      if (i % 500 === 499 && state.wanderers[0]) state = endEncounter(spec, state, state.wanderers[0].id);
    }
  });

  it('se mueven, pero despacio: un solo paso por cada moveEveryMs', () => {
    const rng = createRng(3);
    const before = createWildlife(map, spec, hero, rng, assign);
    const after = tickWildlife(map, spec, before, 50, hero, rng, assign);
    for (const w of after.wanderers) {
      const old = before.wanderers.find((o) => o.id === w.id);
      expect(Math.abs(w.tile.x - (old?.tile.x ?? 0)) + Math.abs(w.tile.y - (old?.tile.y ?? 0))).toBeLessThanOrEqual(1);
    }
    const later = run(3, 100);
    const start = createWildlife(map, spec, hero, createRng(3), assign);
    expect(later.wanderers.some((w) => w.tile !== start.wanderers.find((s) => s.id === w.id)?.tile)).toBe(true);
  });

  it('es determinista con la misma semilla', () => {
    expect(run(11, 500)).toEqual(run(11, 500));
    expect(run(11, 500)).not.toEqual(run(12, 500));
  });

  it('no muta el estado que recibe', () => {
    const rng = createRng(5);
    const state = createWildlife(map, spec, hero, rng, assign);
    const copy = structuredClone(state);
    tickWildlife(map, spec, state, 5000, hero, rng, assign);
    endEncounter(spec, state, 1);
    expect(state).toEqual(copy);
  });

  it('el combate empieza solo al coincidir en la misma casilla', () => {
    const state = createWildlife(map, spec, hero, createRng(5), assign);
    const w = state.wanderers[0];
    if (!w) throw new Error('falta criatura');
    expect(findCollision(state, hero)).toBeUndefined();
    expect(findCollision(state, w.tile)?.id).toBe(w.id);
  });

  it('tras el combate la criatura desaparece, sale otra después, lejos, y hay margen', () => {
    const rng = createRng(9);
    const start = createWildlife(map, spec, hero, rng, assign);
    const w = start.wanderers[0];
    if (!w) throw new Error('falta criatura');
    let state = endEncounter(spec, start, w.id);
    expect(state.wanderers.find((o) => o.id === w.id)).toBeUndefined();
    expect(state.wanderers).toHaveLength(spec.max - 1);
    // Con el margen activo no hay combate aunque coincidan.
    const other = state.wanderers[0];
    if (!other) throw new Error('falta criatura');
    expect(findCollision(state, other.tile)).toBeUndefined();

    const near: Point = { x: other.tile.x, y: other.tile.y };
    state = tickWildlife(map, spec, state, spec.respawnMs - 1, near, rng, assign);
    expect(state.wanderers).toHaveLength(spec.max - 1);
    state = tickWildlife(map, spec, state, 1, near, rng, assign);
    expect(state.wanderers).toHaveLength(spec.max);
    const born = state.wanderers.find((o) => o.id > 3);
    if (!born) throw new Error('no ha salido otra');
    expect(Math.abs(born.tile.x - near.x) + Math.abs(born.tile.y - near.y)).toBeGreaterThanOrEqual(spec.minSpawnDistance);
    expect(kindAt(born.tile)).toBe('tallGrass');
  });

  it('pasado el margen vuelve a haber combates', () => {
    const rng = createRng(9);
    const start = createWildlife(map, spec, hero, rng, assign);
    const w = start.wanderers[0];
    if (!w) throw new Error('falta criatura');
    const state = tickWildlife(map, spec, endEncounter(spec, start, w.id), spec.graceMs, hero, rng, assign);
    const other = state.wanderers[0];
    if (!other) throw new Error('falta criatura');
    expect(findCollision(state, other.tile)).toBeDefined();
  });

  it('en un mapa sin hierba alta no sale ninguna', () => {
    const empty = { width: 3, height: 3, tiles: Array<'grass'>(9).fill('grass') };
    expect(createWildlife(empty, spec, { x: 0, y: 0 }, createRng(1), assign).wanderers).toEqual([]);
  });
});
