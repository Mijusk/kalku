import { describe, expect, it } from 'vitest';
import { checkAdultGate, createAdultGate } from '../src/adultGate';

describe('cuenta de la zona de adultos', () => {
  it('con la misma semilla sale la misma cuenta', () => {
    expect(createAdultGate(7)).toEqual(createAdultGate(7));
  });

  it('es una multiplicación de dos cifras por una, con su resultado', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const g = createAdultGate(seed);
      expect(g.a).toBeGreaterThanOrEqual(23);
      expect(g.b).toBeGreaterThanOrEqual(6);
      expect(g.answer).toBe(g.a * g.b);
    }
  });

  it('solo acepta el resultado exacto', () => {
    const g = createAdultGate(1);
    expect(checkAdultGate(g, ` ${g.answer} `)).toBe(true);
    expect(checkAdultGate(g, String(g.answer + 1))).toBe(false);
    expect(checkAdultGate(g, '')).toBe(false);
    expect(checkAdultGate(g, `${g.answer}abc`)).toBe(false);
  });
});
