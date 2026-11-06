import { describe, expect, it } from 'vitest';
import {
  addToCollection,
  canRescue,
  collectionStatus,
  CREATURES,
  getCreature,
  parseCollection,
  RESCUE_HP_RATIO,
  type CreatureDefinition,
} from '../src/index.js';

const creature = getCreature('sumus-brote');
const boss: CreatureDefinition = { ...creature, boss: true };

describe('canRescue', () => {
  it('no con la vida por encima del límite', () => {
    expect(canRescue(creature, 20, 20)).toBe(false);
    expect(canRescue(creature, 6, 20)).toBe(false);
  });
  it('sí justo en el límite y por debajo', () => {
    expect(RESCUE_HP_RATIO).toBe(0.25);
    expect(canRescue(creature, 5, 20)).toBe(true);
    expect(canRescue(creature, 1, 20)).toBe(true);
  });
  it('no con 0 de vida', () => {
    expect(canRescue(creature, 0, 20)).toBe(false);
  });
  it('nunca con un jefe, aunque le quede 1 de vida', () => {
    expect(canRescue(boss, 1, 20)).toBe(false);
  });
  it('ninguna criatura actual es jefe (si cambia, revisa el rescate)', () => {
    expect(CREATURES.filter((c) => c.boss)).toEqual([]);
  });
});

describe('addToCollection', () => {
  it('añade sin mutar la original', () => {
    const before = Object.freeze([]) as readonly never[];
    const after = addToCollection(before, 'sumus-brote', '2026-11-06');
    expect(after).toEqual([{ id: 'sumus-brote', date: '2026-11-06' }]);
    expect(before).toEqual([]);
  });
  it('no duplica y conserva la fecha original', () => {
    const one = addToCollection([], 'sumus-brote', '2026-11-06');
    const two = addToCollection(one, 'sumus-brote', '2026-12-01');
    expect(two).toEqual([{ id: 'sumus-brote', date: '2026-11-06' }]);
  });
});

describe('parseCollection', () => {
  it('lee un guardado válido', () => {
    expect(parseCollection([{ id: 'restus-gota', date: '2026-11-06' }])).toEqual([{ id: 'restus-gota', date: '2026-11-06' }]);
  });
  it('ignora ids desconocidos, entradas sin fecha, basura y repetidas', () => {
    const raw = [
      { id: 'dragon', date: '2026-11-06' },
      { id: 'sumus-brote' },
      { id: 'sumus-brote', date: '' },
      null,
      7,
      { id: 'restus-gota', date: 'a' },
      { id: 'restus-gota', date: 'b' },
    ];
    expect(parseCollection(raw)).toEqual([{ id: 'restus-gota', date: 'a' }]);
  });
  it('lo que no es una lista es una colección vacía', () => {
    expect(parseCollection(undefined)).toEqual([]);
    expect(parseCollection('x')).toEqual([]);
    expect(parseCollection({})).toEqual([]);
  });
});

describe('collectionStatus', () => {
  it('devuelve todas las criaturas y marca solo las rescatadas', () => {
    const status = collectionStatus([{ id: 'restus-gota', date: '2026-11-06' }]);
    expect(status).toHaveLength(CREATURES.length);
    expect(status.filter((s) => s.rescued).map((s) => s.creature.id)).toEqual(['restus-gota']);
  });
});
