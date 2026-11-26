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

describe('pistas de problemas', () => {
  it('el nivel 1 ayuda a decidir la operación, sin cifras, en es y ca', () => {
    const ex = generateExercise('word-problems-within-10', createRng(8));
    expect(getHint(ex, 1, 'es').text).toContain('suma');
    expect(getHint(ex, 1, 'ca').text).toContain('suma');
    expect(getHint(ex, 1, 'es').text).not.toMatch(/\d/);
  });

  it('el nivel 2 dice la operación y el 3 ayuda a calcularla, sin dar la respuesta', () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i++) {
      const ex = generateExercise('word-problems-within-10', rng);
      const word = ex.operator === '+' ? 'suma' : 'resta';
      expect(getHint(ex, 2, 'es').text).toContain(`Es una ${word}: ${ex.a}`);
      expect(getHint(ex, 2, 'ca').text).toContain(`És una ${word}: ${ex.a}`);
      expect(getHint(ex, 2, 'es').text).not.toContain(`= ${ex.answer}`);
      for (const locale of ['es', 'ca'] as const) {
        const numbers = (getHint(ex, 3, locale).text.match(/\d+/g) ?? []).map(Number);
        const start = ex.operator === '+' ? Math.max(ex.a, ex.b) : ex.a;
        const direction = ex.operator === '+' ? 1 : -1;
        const operand = ex.operator === '+' ? Math.min(ex.a, ex.b) : ex.b;
        expect(numbers[0]).toBe(start);
        expect(numbers).toHaveLength(operand);
        for (const [index, value] of numbers.entries()) {
          expect(value).toBe(start + index * direction);
        }
        expect(numbers).not.toContain(ex.answer);
      }
    }
  });
});

describe('pistas hasta 100', () => {
  const ex = (patch: Partial<Exercise>): Exercise => ({ ...carry, ...patch });

  it('decenas y unidades: separa el número sin dar la respuesta en el nivel 1', () => {
    const e = ex({ skill: 'tens-units', a: 40, b: 7, c: 47, answer: 47 });
    expect(getHint(e, 1, 'es').text).toBe('40 son 4 decenas. Añade 7 unidades.');
    expect(getHint(e, 2, 'ca').text).toBe('4 desenes i 7 unitats.');
    const hole = ex({ skill: 'tens-units', format: 'missing', a: 90, b: 3, c: 93, hidden: 'a', answer: 90 });
    expect(getHint(hole, 1, 'es').text).toBe('Separa 93 en decenas y unidades.');
    expect(getHint(hole, 2, 'es').text).toBe('93 son 9 decenas y 3 unidades.');
  });

  it('sumas y restas hasta 100: primero las decenas y luego las unidades', () => {
    const add = ex({ skill: 'add-within-100-carry', a: 38, b: 27, c: 65, answer: 65 });
    expect(getHint(add, 2, 'es').text).toBe('38 + 27 = 38 + 20 + 7');
    expect(getHint(add, 3, 'es').text).toBe('38 + 20 = 58. Ahora, 58 + 7 = ?');
    const sub = ex({ skill: 'sub-within-100-borrow', operator: '-', a: 52, b: 27, c: 25, answer: 25 });
    expect(getHint(sub, 2, 'es').text).toBe('52 − 27 = 52 − 20 − 7');
    expect(getHint(sub, 3, 'ca').text).toBe('52 − 20 = 32. Ara, 32 − 7 = ?');
  });

  it('la primera pista hasta 100 nunca enseña la respuesta', () => {
    const rng = createRng(21);
    for (const skill of SKILLS.filter((s) => SKILLS.indexOf(s) >= 7)) {
      for (let i = 0; i < 500; i++) {
        const e = generateExercise(skill.id, rng);
        // Si la respuesta ya sale en el ejercicio (22 + _ = 44), no se puede evitar que salga en la pista.
        const shown = (['a', 'b', 'c'] as const).filter((k) => k !== e.hidden).map((k) => e[k]);
        if (shown.includes(e.answer)) continue;
        for (const level of [1] as const) {
          for (const locale of ['es', 'ca'] as const) {
            // «de 10 en 10» y «de 1 en 1» son la estrategia, no un resultado.
            const text = getHint(e, level, locale).text.replace(/\b10 en 10\b|\b1 en 1\b/g, '');
            const numbers = (text.match(/\d+/g) ?? []).map(Number);
            expect(numbers, `${skill.id}: ${getHint(e, level, locale).text} (${e.answer})`).not.toContain(e.answer);
          }
        }
      }
    }
  });
});
