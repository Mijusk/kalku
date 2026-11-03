import { describe, expect, it } from 'vitest';
import { createRng, formatExercise, generateExercise, hasGenerator, SKILLS, type Exercise, type SkillId } from '../src/index.js';

const SAMPLES = 2_000;

function sample(skill: SkillId, seed = 42): Exercise[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateExercise(skill, rng));
}

function value(ex: Exercise): { a: number; b: number; c: number } {
  return { a: ex.a, b: ex.b, c: ex.c };
}

describe('generadores', () => {
  it('hay un generador para cada habilidad del currículo', () => {
    for (const skill of SKILLS) expect(hasGenerator(skill.id)).toBe(true);
  });

  it('todas las operaciones son correctas y la respuesta es la posición oculta', () => {
    for (const skill of SKILLS) {
      for (const ex of sample(skill.id)) {
        const expected = ex.operator === '+' ? ex.a + ex.b : ex.a - ex.b;
        expect(ex.c).toBe(expected);
        expect(ex.answer).toBe(ex[ex.hidden]);
        expect(ex.a).toBeGreaterThan(0);
        expect(ex.b).toBeGreaterThan(0);
        expect(ex.c).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('sumas hasta 10 no pasan de 10', () => {
    for (const ex of sample('add-within-10')) expect(ex.c).toBeLessThanOrEqual(10);
  });

  it('restas hasta 10 empiezan como mucho en 10', () => {
    for (const ex of sample('sub-within-10')) expect(ex.a).toBeLessThanOrEqual(10);
  });

  it('sumas hasta 20 sin llevar: las unidades no pasan de 9', () => {
    for (const ex of sample('add-within-20-no-carry')) {
      const { a, b, c } = value(ex);
      expect(c).toBeLessThan(20);
      expect((a % 10) + (b % 10)).toBeLessThanOrEqual(9);
      expect(Math.max(a, b)).toBeGreaterThanOrEqual(10);
    }
  });

  it('restas hasta 20 sin llevar: no cruzan la decena', () => {
    for (const ex of sample('sub-within-20-no-borrow')) {
      expect(ex.a).toBeGreaterThan(10);
      expect(ex.b).toBeLessThanOrEqual(ex.a % 10);
      expect(ex.c).toBeGreaterThanOrEqual(10);
    }
  });

  it('sumas hasta 20 llevando: dos números de una cifra que pasan de 10', () => {
    for (const ex of sample('add-within-20-carry')) {
      expect(ex.a).toBeLessThan(10);
      expect(ex.b).toBeLessThan(10);
      expect(ex.c).toBeGreaterThan(10);
    }
  });

  it('restas hasta 20 llevando: siempre cruzan la decena', () => {
    for (const ex of sample('sub-within-20-borrow')) {
      expect(ex.a).toBeGreaterThan(10);
      expect(ex.a).toBeLessThan(20);
      expect(ex.b).toBeGreaterThan(ex.a % 10);
      expect(ex.c).toBeLessThan(10);
    }
  });

  it('con la misma semilla sale lo mismo', () => {
    const first = sample('add-within-20-carry', 7).map(value);
    const second = sample('add-within-20-carry', 7).map(value);
    expect(first).toEqual(second);
  });

  it('respeta el formato pedido y mezcla ambos si no se pide', () => {
    const rng = createRng(1);
    expect(generateExercise('add-within-10', rng, { format: 'missing' }).hidden).not.toBe('c');
    expect(generateExercise('add-within-10', rng, { format: 'result' }).hidden).toBe('c');

    const formats = new Set(sample('add-within-10').map((e) => e.format));
    expect(formats).toEqual(new Set(['result', 'missing']));
  });

  it('formatea el ejercicio con el hueco', () => {
    const ex: Exercise = {
      id: 'x',
      skill: 'add-within-20-carry',
      format: 'missing',
      operator: '+',
      a: 7,
      b: 5,
      c: 12,
      hidden: 'b',
      answer: 5,
      difficulty: 5.5,
    };
    expect(formatExercise(ex)).toBe('7 + _ = 12');
    expect(formatExercise({ ...ex, operator: '-', a: 12, b: 5, c: 7, hidden: 'c', answer: 7 })).toBe('12 − 5 = _');
  });
});

describe('createRng', () => {
  it('int da enteros dentro del rango, ambos incluidos', () => {
    const rng = createRng(3);
    const values = new Set(Array.from({ length: 500 }, () => rng.int(2, 4)));
    expect(values).toEqual(new Set([2, 3, 4]));
  });

  it('int lanza RangeError con un rango no válido', () => {
    const rng = createRng(3);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(1.5, 3)).toThrow(RangeError);
    expect(() => rng.int(1, Number.NaN)).toThrow(RangeError);
  });

  it('pick lanza RangeError con una lista vacía', () => {
    expect(() => createRng(3).pick([])).toThrow(RangeError);
  });
});
