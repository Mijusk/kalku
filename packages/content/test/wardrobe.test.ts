import { describe, expect, it } from 'vitest';
import { LEVELS } from '@kalku/exercises';
import {
  buyPiece,
  DEFAULT_OUTFIT,
  getPiece,
  lockReason,
  newlyEarned,
  OUTFIT_PIECES,
  ownedOutfit,
  ownsPiece,
  parseOwned,
  setPiece,
  shopPieces,
  wearPiece,
  ZONES,
  type WardrobeState,
} from '../src/index.js';

const fresh: WardrobeState = { owned: [], treasures: [], gems: [], xp: 0 };
const xpForLevel = (level: number): number => LEVELS[level - 1] ?? 0;
const piece = (id: string) => {
  const p = getPiece(id);
  if (!p) throw new Error(`falta ${id}`);
  return p;
};

describe('objetos como datos', () => {
  it('la tienda tiene al menos 5 objetos, con precio entero y positivo', () => {
    const shop = shopPieces();
    expect(shop.length).toBeGreaterThanOrEqual(5);
    for (const p of shop) if (p.get?.kind === 'shop') expect(Number.isInteger(p.get.price) && p.get.price > 0).toBe(true);
  });
  it('cada tesoro de las zonas es una pieza que se lleva puesta', () => {
    for (const zone of ZONES) {
      expect(OUTFIT_PIECES.some((p) => p.get?.kind === 'treasure' && p.get.treasure === zone.treasure.id)).toBe(true);
    }
  });
  it('regla 1: las piezas son solo dibujo y nombre (ningún dato de combate)', () => {
    const allowed = new Set(['id', 'layer', 'name', 'art', 'get']);
    for (const p of OUTFIT_PIECES) for (const key of Object.keys(p)) expect(allowed.has(key)).toBe(true);
    const sources = new Set(['kind', 'price', 'minLevel', 'gem', 'treasure', 'level']);
    for (const p of OUTFIT_PIECES) for (const key of Object.keys(p.get ?? {})) expect(sources.has(key)).toBe(true);
  });
});

describe('ownsPiece', () => {
  it('las piezas del principio se tienen siempre; las de tienda y regalo, no', () => {
    expect(ownsPiece(piece('piel-1'), fresh)).toBe(true);
    expect(ownsPiece(piece('gorra-azul'), fresh)).toBe(false);
    expect(ownsPiece(piece('gafas-sol'), fresh)).toBe(false);
  });
  it('los tesoros, al abrir el cofre de la zona', () => {
    expect(ownsPiece(piece('corona-piedra'), fresh)).toBe(false);
    expect(ownsPiece(piece('corona-piedra'), { ...fresh, treasures: ['tesoro-puerta'] })).toBe(true);
  });
  it('los premios de nivel y de gema, al llegar', () => {
    expect(ownsPiece(piece('capa-bosque'), { ...fresh, xp: xpForLevel(2) })).toBe(false);
    expect(ownsPiece(piece('capa-bosque'), { ...fresh, xp: xpForLevel(3) })).toBe(true);
    expect(ownsPiece(piece('insignia-suma'), { ...fresh, gems: ['add-within-10'] })).toBe(true);
  });
});

describe('lockReason', () => {
  it('dice el motivo: nivel, gema, zona, cofre sorpresa o precio', () => {
    expect(lockReason(piece('gorra-azul'), fresh)).toEqual({ kind: 'price', price: 120 });
    expect(lockReason(piece('gorro-lana'), fresh)).toEqual({ kind: 'level', level: 3 });
    expect(lockReason(piece('sombrero-cifras'), { ...fresh, xp: xpForLevel(8) })).toEqual({ kind: 'gem', gem: 'tens-units' });
    expect(lockReason(piece('corona-piedra'), fresh)).toEqual({ kind: 'treasure', zone: 'puerta-de-piedra' });
    expect(lockReason(piece('gafas-sol'), fresh)).toEqual({ kind: 'gift' });
    expect(lockReason(piece('piel-1'), fresh)).toBeUndefined();
  });
});

describe('buyPiece', () => {
  it('compra: resta las Cifras y la guarda, sin mutar', () => {
    const state = { ...fresh, owned: [] as string[] };
    const r = buyPiece(state, 500, 'gorra-azul');
    expect(r).toEqual({ ok: true, coins: 380, owned: ['gorra-azul'] });
    expect(state.owned).toEqual([]);
  });
  it('no se puede comprar sin Cifras suficientes', () => {
    expect(buyPiece(fresh, 119, 'gorra-azul')).toEqual({ ok: false, reason: 'coins' });
  });
  it('no se puede comprar dos veces la misma', () => {
    expect(buyPiece({ ...fresh, owned: ['gorra-azul'] }, 1000, 'gorra-azul')).toEqual({ ok: false, reason: 'owned' });
  });
  it('no se puede comprar antes del nivel o la gema que pide, aunque sobren Cifras', () => {
    expect(buyPiece(fresh, 99999, 'gorro-lana')).toEqual({ ok: false, reason: 'locked' });
    expect(buyPiece({ ...fresh, xp: xpForLevel(8) }, 99999, 'sombrero-cifras')).toEqual({ ok: false, reason: 'locked' });
    expect(buyPiece({ ...fresh, xp: xpForLevel(8), gems: ['tens-units'] }, 99999, 'sombrero-cifras').ok).toBe(true);
  });
  it('regla 1: lo que se gana aprendiendo (tesoros, nivel, gemas, regalos) no se vende', () => {
    for (const p of OUTFIT_PIECES) {
      if (p.get === undefined || p.get.kind === 'shop') continue;
      expect(buyPiece(fresh, 1e9, p.id)).toEqual({ ok: false, reason: 'not-for-sale' });
    }
  });
});

describe('wearPiece y ownedOutfit', () => {
  it('solo se pone lo que se tiene', () => {
    expect(wearPiece(DEFAULT_OUTFIT, fresh, 'gorra-azul')).toBeUndefined();
    expect(wearPiece(DEFAULT_OUTFIT, { ...fresh, owned: ['gorra-azul'] }, 'gorra-azul')?.hat).toBe('gorra-azul');
  });
  it('un objeto con requisito no se puede poner sin cumplirlo', () => {
    expect(wearPiece(DEFAULT_OUTFIT, { ...fresh, xp: xpForLevel(2) }, 'capa-bosque')).toBeUndefined();
    expect(wearPiece(DEFAULT_OUTFIT, { ...fresh, xp: xpForLevel(3) }, 'capa-bosque')?.back).toBe('capa-bosque');
  });
  it('un atuendo guardado con piezas que no tiene vuelve a la de por defecto en esa capa', () => {
    const worn = setPiece(setPiece(DEFAULT_OUTFIT, 'hat', 'gorra-azul'), 'hair', 'pelo-largo');
    expect(ownedOutfit(worn, fresh, DEFAULT_OUTFIT)).toEqual(setPiece(DEFAULT_OUTFIT, 'hair', 'pelo-largo'));
  });
});

describe('newlyEarned', () => {
  it('avisa de lo que se acaba de ganar al subir de nivel', () => {
    const got = newlyEarned({ ...fresh, xp: xpForLevel(2) }, { ...fresh, xp: xpForLevel(3) }).map((p) => p.id);
    expect(got).toEqual(['capa-bosque']);
  });
});

describe('parseOwned', () => {
  it('solo ids de tienda o regalo que existen, sin repetir', () => {
    expect(parseOwned(['gorra-azul', 'gorra-azul', 'inventado', 3, 'capa-bosque', 'piel-1', 'gafas-sol'])).toEqual(['gorra-azul', 'gafas-sol']);
    expect(parseOwned('x')).toEqual([]);
  });
});
