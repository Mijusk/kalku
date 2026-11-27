import { describe, expect, it } from 'vitest';
import { drawFurniture, FURNITURE_ARTS, FURNITURE_PX_H, TILE_PX } from '@kalku/art';
import {
  buyFurniture,
  canPlace,
  DEFAULT_HOME,
  FURNITURE,
  furnitureAt,
  homeState,
  ownsFurniture,
  parseHome,
  placeFurniture,
  removeFurniture,
  type Home,
  type WardrobeState,
} from '../src/index.js';

const fresh: WardrobeState = { owned: [], treasures: [], gems: [], xp: 0 };

describe('muebles de la casa', () => {
  it('tienen ids únicos, nombre en los dos idiomas y se pueden dibujar', () => {
    const ids = new Set(FURNITURE.map((p) => p.id));
    expect(ids.size).toBe(FURNITURE.length);
    for (const p of FURNITURE) {
      expect(p.name.es.length).toBeGreaterThan(0);
      expect(p.name.ca.length).toBeGreaterThan(0);
      const g = drawFurniture(p.art, p.color, p.width);
      expect(g.width).toBe(p.width * TILE_PX);
      expect(g.height).toBe(FURNITURE_PX_H);
      expect(g.px.some((c) => c !== -1)).toBe(true);
    }
    for (const art of FURNITURE_ARTS) expect(drawFurniture(art, 'verde', 1).px.some((c) => c !== -1)).toBe(true);
  });

  it('la casa del principio solo tiene muebles que ya se tienen', () => {
    const state = homeState(fresh, DEFAULT_HOME);
    for (const p of DEFAULT_HOME.placed) {
      const piece = FURNITURE.find((f) => f.id === p.id);
      expect(piece && ownsFurniture(piece, state)).toBe(true);
    }
  });
});

describe('comprar muebles', () => {
  it('cuesta Cifras, no se compra dos veces y no deja Cifras negativas', () => {
    const first = buyFurniture(DEFAULT_HOME, fresh, 100, 'silla');
    expect(first).toMatchObject({ ok: true, coins: 40 });
    if (!first.ok) return;
    expect(first.home.owned).toEqual(['silla']);
    expect(buyFurniture(first.home, fresh, 100, 'silla')).toEqual({ ok: false, reason: 'owned' });
    expect(buyFurniture(DEFAULT_HOME, fresh, 10, 'silla')).toEqual({ ok: false, reason: 'coins' });
  });

  it('lo de nivel o gema no se vende y lo de nivel mínimo espera', () => {
    expect(buyFurniture(DEFAULT_HOME, fresh, 9999, 'telescopio')).toEqual({ ok: false, reason: 'not-for-sale' });
    expect(buyFurniture(DEFAULT_HOME, fresh, 9999, 'acuario')).toEqual({ ok: false, reason: 'locked' });
    expect(buyFurniture(DEFAULT_HOME, fresh, 9999, 'cama')).toEqual({ ok: false, reason: 'not-for-sale' });
  });

  it('la copa se gana con la gema', () => {
    const cup = FURNITURE.find((p) => p.id === 'trofeo-suma');
    expect(cup).toBeDefined();
    if (!cup) return;
    expect(ownsFurniture(cup, homeState(fresh, DEFAULT_HOME))).toBe(false);
    expect(ownsFurniture(cup, homeState({ ...fresh, gems: ['add-within-10'] }, DEFAULT_HOME))).toBe(true);
  });
});

describe('colocar muebles', () => {
  const empty: Home = { owned: [], placed: [] };

  it('no se sale del suelo ni pisa la casilla del niño', () => {
    expect(canPlace(empty, 'cama', 9, 0)).toBe(false);
    expect(canPlace(empty, 'cama', 8, 0)).toBe(true);
    expect(canPlace(empty, 'mesa', 0, 3)).toBe(false);
    expect(canPlace(empty, 'mesa', -1, 0)).toBe(false);
  });

  it('dos muebles no se pisan, pero una alfombra va debajo', () => {
    const one = placeFurniture(empty, 'cama', 2, 1);
    expect(one).toBeDefined();
    if (!one) return;
    expect(canPlace(one, 'mesa', 3, 1)).toBe(false);
    expect(canPlace(one, 'alfombra', 2, 1)).toBe(true);
    const two = placeFurniture(one, 'alfombra', 2, 1);
    expect(two && furnitureAt(two, 2, 1)?.id).toBe('cama');
    expect(two && canPlace(two, 'alfombra-estrellas', 3, 1)).toBe(false);
  });

  it('mover un mueble no lo duplica y quitarlo lo devuelve a la caja', () => {
    const a = placeFurniture(empty, 'mesa', 3, 1);
    const b = a && placeFurniture(a, 'mesa', 4, 1);
    expect(b?.placed).toEqual([{ id: 'mesa', x: 4, y: 1 }]);
    expect(b && removeFurniture(b, 'mesa').placed).toEqual([]);
    expect(b && furnitureAt(b, 3, 1)).toBeUndefined();
  });
});

describe('leer la casa guardada', () => {
  it('sin datos, la casa del principio', () => {
    expect(parseHome(undefined, fresh)).toEqual(DEFAULT_HOME);
    expect(parseHome('basura', fresh)).toEqual(DEFAULT_HOME);
  });

  it('quita lo que no existe, lo que no se tiene y lo que no cabe', () => {
    const home = parseHome(
      {
        owned: ['silla', 'silla', 'cama', 'nada', 7],
        placed: [
          { id: 'silla', x: 1, y: 1 },
          { id: 'mesa', x: 1, y: 1 },
          { id: 'telescopio', x: 5, y: 2 },
          { id: 'sofa', x: 4, y: 0 },
          { id: 'cama', x: 0, y: 3 },
          { id: 'nada', x: 2, y: 2 },
          { id: 'mesa', x: 'a', y: 2 },
        ],
      },
      fresh,
    );
    expect(home.owned).toEqual(['silla']);
    expect(home.placed).toEqual([{ id: 'silla', x: 1, y: 1 }]);
  });
});
