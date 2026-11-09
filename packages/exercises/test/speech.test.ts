import { describe, expect, it } from 'vitest';
import { createRng, generateExercise, numberToWords, SKILLS, speakExercise, type Exercise, type Locale } from '../src/index.js';

function make(partial: Partial<Exercise> & Pick<Exercise, 'a' | 'b' | 'c' | 'hidden' | 'operator'>): Exercise {
  return {
    id: 'x',
    skill: 'add-within-10',
    format: partial.hidden === 'c' ? 'result' : 'missing',
    answer: partial[partial.hidden] ?? 0,
    difficulty: 1,
    ...partial,
  };
}

describe('speakExercise', () => {
  it('con miles de ejercicios no queda ningún dígito ni signo, en es y ca', () => {
    const rng = createRng(7);
    for (const skill of SKILLS) {
      for (let i = 0; i < 1_000; i++) {
        const ex = generateExercise(skill.id, rng);
        for (const locale of ['es', 'ca'] as Locale[]) {
          const text = speakExercise(ex, locale);
          expect(text.length).toBeGreaterThan(0);
          expect(text).not.toMatch(/[0-9+−\-=▢_]/);
        }
        expect(speakExercise(ex, 'es')).not.toBe(speakExercise(ex, 'ca'));
      }
    }
  });

  it('hueco en el resultado', () => {
    const ex = make({ a: 5, b: 3, c: 8, hidden: 'c', operator: '+' });
    expect(speakExercise(ex, 'es')).toBe('cinco más tres son… ¿cuánto?');
    expect(speakExercise(ex, 'ca')).toBe('cinc més tres són… quant?');
  });

  it('la resta se lee «menos» / «menys»', () => {
    const ex = make({ a: 9, b: 4, c: 5, hidden: 'c', operator: '-' });
    expect(speakExercise(ex, 'es')).toContain('nueve menos cuatro');
    expect(speakExercise(ex, 'ca')).toContain('nou menys quatre');
  });

  it('suma con hueco en b: «cuánto falta para» el resultado', () => {
    const ex = make({ a: 7, b: 5, c: 12, hidden: 'b', operator: '+' });
    expect(speakExercise(ex, 'es')).toBe('siete más ¿cuánto falta para doce?');
    expect(speakExercise(ex, 'ca')).toBe('set més quant falta per a dotze?');
  });

  it('hueco en a y resta con hueco en b nombran el resultado en palabras', () => {
    expect(speakExercise(make({ a: 7, b: 5, c: 12, hidden: 'a', operator: '+' }), 'es')).toBe('¿cuánto? más cinco son doce');
    expect(speakExercise(make({ a: 10, b: 6, c: 4, hidden: 'b', operator: '-' }), 'ca')).toBe('deu menys quant? són quatre');
  });
});

describe('numberToWords', () => {
  it('del 0 al 20 en castellano y catalán', () => {
    const es = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
    const ca = ['zero', 'un', 'dos', 'tres', 'quatre', 'cinc', 'sis', 'set', 'vuit', 'nou', 'deu', 'onze', 'dotze', 'tretze', 'catorze', 'quinze', 'setze', 'disset', 'divuit', 'dinou', 'vint'];
    es.forEach((w, n) => expect(numberToWords(n, 'es')).toBe(w));
    ca.forEach((w, n) => expect(numberToWords(n, 'ca')).toBe(w));
  });
});
