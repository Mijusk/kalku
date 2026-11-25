import { describe, expect, it } from 'vitest';
import { createRng } from '@kalku/exercises';
import {
  CLASS_MAX_STUDENTS,
  CODE_SPACE,
  CODE_WORDS,
  SECRET_ANIMALS,
  codeHint,
  generateStudentCode,
  normalizeCode,
  validateClassCodes,
} from '../src/classCodes';

describe('lista de palabras y animales', () => {
  it('no tiene problemas (sin repetidas ni vetadas)', () => {
    expect(validateClassCodes()).toEqual([]);
  });
  it('hay exactamente 6 animales con nombre en es y ca', () => {
    expect(SECRET_ANIMALS).toHaveLength(6);
    for (const a of SECRET_ANIMALS) {
      expect(a.name.es.length).toBeGreaterThan(0);
      expect(a.name.ca.length).toBeGreaterThan(0);
    }
  });
});

describe('generateStudentCode', () => {
  it('tiene el formato PALABRA-NN con una palabra de la lista y un animal válido', () => {
    const rng = createRng(1);
    for (let i = 0; i < 2000; i++) {
      const { code, animal } = generateStudentCode(rng);
      const m = /^([A-Z]+)-(\d{2})$/.exec(code);
      expect(m).not.toBeNull();
      expect(CODE_WORDS).toContain(m?.[1]);
      expect(SECRET_ANIMALS.map((a) => a.id)).toContain(animal);
    }
  });

  it('en una clase de 30 nunca se repite un código (miles de clases con semilla)', () => {
    for (let seed = 1; seed <= 3000; seed++) {
      const rng = createRng(seed);
      const taken = new Set<string>();
      for (let i = 0; i < CLASS_MAX_STUDENTS; i++) {
        const { code } = generateStudentCode(rng, taken);
        expect(taken.has(code)).toBe(false);
        taken.add(code);
      }
    }
  });

  it('se puede llenar la clase entera sin repetir y luego falla con un error claro', () => {
    const rng = createRng(7);
    const taken = new Set<string>();
    for (let i = 0; i < CODE_SPACE; i++) taken.add(generateStudentCode(rng, taken).code);
    expect(taken.size).toBe(CODE_SPACE);
    expect(() => generateStudentCode(rng, taken)).toThrow(/agotado/);
  });

  it('es reproducible con la misma semilla', () => {
    expect(generateStudentCode(createRng(5))).toEqual(generateStudentCode(createRng(5)));
  });
});

describe('normalizeCode y codeHint', () => {
  it('acepta minúsculas, espacios, guiones y tildes', () => {
    expect(normalizeCode('luna 47')).toBe('LUNA-47');
    expect(normalizeCode(' León–47 ')).toBe('LEON-47');
    expect(normalizeCode('LUNA-47')).toBe('LUNA-47');
  });
  it('la pista son solo las dos primeras letras', () => {
    expect(codeHint('LUNA-47')).toBe('LU');
  });
});
