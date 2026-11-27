import { describe, expect, it } from 'vitest';
import { chooseCompanion, parseCompanion, type Collection } from '../src/index.js';

const collection: Collection = [
  { id: 'sumus-brote', date: '2026-11-20' },
  { id: 'restus-gota', date: '2026-11-21', shiny: '2026-11-25' },
];

describe('compañero', () => {
  it('solo puede serlo una criatura rescatada', () => {
    expect(chooseCompanion(collection, 'sumus-brote')).toEqual({ id: 'sumus-brote', shiny: false });
    expect(chooseCompanion(collection, 'sumus-roble')).toBeUndefined();
    expect(chooseCompanion([], 'sumus-brote')).toBeUndefined();
  });
  it('sale brillante si se rescató brillante', () => {
    expect(chooseCompanion(collection, 'restus-gota')).toEqual({ id: 'restus-gota', shiny: true });
  });
  it('lee el guardado y descarta lo que no está en la colección', () => {
    expect(parseCompanion({ id: 'restus-gota', shiny: true }, collection)).toEqual({ id: 'restus-gota', shiny: true });
    expect(parseCompanion({ id: 'sumus-brote', shiny: true }, collection)).toEqual({ id: 'sumus-brote', shiny: false });
    expect(parseCompanion({ id: 'sumus-roble' }, collection)).toBeNull();
    for (const raw of [null, 3, 'x', {}, { id: 4 }]) expect(parseCompanion(raw, collection)).toBeNull();
  });
  it('regla 1: el compañero solo guarda qué criatura es y su color', () => {
    const c = chooseCompanion(collection, 'restus-gota');
    expect(Object.keys(c ?? {}).sort()).toEqual(['id', 'shiny']);
  });
});
