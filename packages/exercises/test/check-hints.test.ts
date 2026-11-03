import { describe, expect, it } from 'vitest';
import { checkAnswer, createRng, generateExercise, getHint, parseAnswer, SKILLS, type Exercise } from '../src/index.js';

const carry: Exercise = {
  id: 'x',
  skill: 'add-within-20-carry',
  format: 'result',
  operator: '+',
  a: 8,
  b: 5,
  c: 13,
  hidden: 'c',
  answer: 13,
  difficulty: 5,
};

describe('corrección', () => {
  it('acepta la respuesta correcta como texto o número', () => {
    expect(checkAnswer(carry, '13').status).toBe('correct');
    expect(checkAnswer(carry, ' 13 ').status).toBe('correct');
    expect(checkAnswer(carry, 13).status).toBe('correct');
  });

  it('marca como fallo un número equivocado', () => {
    expect(checkAnswer(carry, '12')).toEqual({ status: 'wrong', value: 12 });
  });

  it('lo que no es un número no cuenta como fallo', () => {
    for (const input of ['', 'abc', '1.5', '13a', '12345']) {
      expect(checkAnswer(carry, input).status).toBe('invalid');
    }
    expect(checkAnswer(carry, 12.5).status).toBe('invalid');
  });

  it('entiende el signo menos tipográfico', () => {
    expect(parseAnswer('−3')).toBe(-3);
  });
});

describe('pistas', () => {
  it('la suma llevando sugiere llegar a 10', () => {
    expect(getHint(carry, 2, 'es').text).toBe('8 + 5 = 8 + 2 + 3');
    expect(getHint(carry, 3, 'es').text).toContain('10 + 3');
  });

  it('la resta llevando sugiere bajar a 10', () => {
    const ex: Exercise = { ...carry, skill: 'sub-within-20-borrow', operator: '-', a: 13, b: 5, c: 8, answer: 8 };
    expect(getHint(ex, 2, 'es').text).toBe('13 − 5 = 13 − 3 − 2');
  });

  it('hay pistas en castellano y catalán distintas para todos los niveles y habilidades', () => {
    const rng = createRng(3);
    for (const skill of SKILLS) {
      for (let i = 0; i < 50; i++) {
        const ex = generateExercise(skill.id, rng);
        for (const level of [1, 2, 3] as const) {
          const es = getHint(ex, level, 'es').text;
          const ca = getHint(ex, level, 'ca').text;
          expect(es.length).toBeGreaterThan(0);
          expect(ca.length).toBeGreaterThan(0);
          // La pista nunca debe dar la respuesta directamente en el nivel 1.
          if (level === 1) expect(es).not.toContain(`= ${ex.answer}`);
        }
      }
    }
  });
});

describe('pistas de conteo', () => {
  it('los niveles 1 y 2 nunca enseñan la respuesta al contar', () => {
    const rng = createRng(11);
    for (const skill of SKILLS) {
      for (let i = 0; i < 300; i++) {
        const ex = generateExercise(skill.id, rng, { format: 'result' });
        for (const level of [1, 2] as const) {
          for (const locale of ['es', 'ca'] as const) {
            const text = getHint(ex, level, locale).text;
            if (!/Cuenta|Compta/.test(text)) continue;
            const numbers = (text.match(/\d+/g) ?? []).map(Number);
            expect(numbers, `${text} (respuesta ${ex.answer})`).not.toContain(ex.answer);
          }
        }
      }
    }
  });

  it('el nivel 2 cuenta menos pasos que el nivel 3', () => {
    const ex: Exercise = { ...carry, skill: 'add-within-10', a: 3, b: 5, c: 8, answer: 8, difficulty: 1 };
    const count = (s: string) => (s.match(/\d+/g) ?? []).length;
    expect(count(getHint(ex, 2, 'es').text)).toBeLessThan(count(getHint(ex, 3, 'es').text));
  });
});
