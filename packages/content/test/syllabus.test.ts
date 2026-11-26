import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkAnswer, formatExercise } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import { parseSyllabus, questionExercise, syllabusQuestions, syllabusSkills } from '../src/index.js';

const DIR = join(__dirname, '..', 'temarios');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

describe('temarios de los centros', () => {
  it('hay al menos el de prueba', () => {
    expect(files).toContain('colegio-de-prueba.json');
  });

  for (const file of files) {
    it(`${file} es válido y su id coincide con el nombre del fichero`, () => {
      const { syllabus, errors } = parseSyllabus(JSON.parse(readFileSync(join(DIR, file), 'utf8')));
      expect(errors).toEqual([]);
      expect(`${syllabus?.id}.json`).toBe(file);
    });
  }

  it('las preguntas propias se juegan como un ejercicio con enunciado', () => {
    const { syllabus } = parseSyllabus(JSON.parse(readFileSync(join(DIR, 'colegio-de-prueba.json'), 'utf8')));
    if (!syllabus) throw new Error('temario no válido');
    const q = syllabusQuestions(syllabus);
    expect(q.length).toBe(3);
    const ex = questionExercise(syllabus, q[0]!, 0);
    expect(formatExercise(ex, '▢', 'ca')).toContain('tomàquets');
    expect(checkAnswer(ex, '7').status).toBe('correct');
    expect(checkAnswer(ex, '6').status).toBe('wrong');
    expect(ex.custom).toBe(true);
    expect(ex.hint?.es).toContain('Cuenta');
    expect(syllabusSkills(syllabus)).toEqual(['add-within-10', 'sub-within-10']);
  });
});

describe('parseSyllabus', () => {
  it('dice qué falta y dónde, en castellano', () => {
    const { syllabus, errors } = parseSyllabus({
      id: 'Mi Cole',
      name: { es: 'Mi cole' },
      units: [
        { id: 'u1', name: { es: 'U', ca: 'U' }, skills: ['multiplicar'], questions: [{ text: { es: 'a', ca: 'a' }, answer: 2.5 }] },
        { id: 'u1', name: { es: 'U', ca: 'U' } },
      ],
    });
    expect(syllabus).toBeUndefined();
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"id"'),
        expect.stringContaining('catalán'),
        expect.stringContaining('"multiplicar" no existe'),
        expect.stringContaining('pregunta 1: "answer"'),
        expect.stringContaining('repetido'),
        expect.stringContaining('ni habilidades'),
      ]),
    );
  });

  it('rechaza lo que no es un temario', () => {
    expect(parseSyllabus(null).errors.length).toBe(1);
    expect(parseSyllabus([]).errors.length).toBe(1);
    expect(parseSyllabus({ id: 'a', name: { es: 'a', ca: 'a' }, units: [] }).errors).toEqual([
      '"units": hace falta al menos una unidad',
    ]);
  });
});
