import { describe, expect, it } from 'vitest';
import {
  applyAnswer,
  createProfile,
  createRng,
  generateExercise,
  nextPlacementSkill,
  parseAnswerRequest,
  parsePlacementRequest,
  parseSeed,
  recordPlacement,
  startPlacement,
  validateAnswer,
  validatePlacement,
  type AnswerRequest,
  type PlacementAnswer,
  type SkillId,
} from '../src/index.js';

/** Petición honrada: el ejercicio sale de la semilla y se responde con `given`. */
function request(skill: SkillId, seed: number, pick: (answer: number) => number, extra: Partial<AnswerRequest> = {}): AnswerRequest {
  const ex = generateExercise(skill, createRng(seed));
  return {
    skill,
    seed: String(seed),
    given: pick(ex.answer),
    exercise: { a: ex.a, b: ex.b, c: ex.c, hidden: ex.hidden },
    helped: false,
    slot: 'current',
    hintsUsed: 0,
    ...extra,
  };
}
const right = (n: number) => n;
const wrong = (n: number) => n + 1;

describe('validateAnswer', () => {
  it('acertar a la primera sube igual que en local (+8) y con ayuda (+5)', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const profile = createProfile();
      const req = request('add-within-10', seed, right);
      const result = validateAnswer(profile, req);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.profile).toEqual(applyAnswer(profile, 'add-within-10', { correct: true, helped: false, slot: 'current' }));
      expect(result.profile['add-within-10']).toEqual({ mastery: 8, attempts: 1, correct: 1 });
      const helped = validateAnswer(profile, { ...req, helped: true });
      expect(helped.ok && helped.profile['add-within-10'].mastery).toBe(5);
    }
  });

  it('no muta el perfil que recibe', () => {
    const profile = createProfile();
    validateAnswer(profile, request('add-within-10', 7, right));
    expect(profile['add-within-10']).toEqual({ mastery: 0, attempts: 0, correct: 0 });
  });

  it('el servidor corrige: lo que diga el cliente de si acertó no cuenta', () => {
    const result = validateAnswer(createProfile(), request('sub-within-10', 3, wrong));
    expect(result.ok && result.records[0]?.correct).toBe(false);
    expect(result.ok && result.profile['sub-within-10'].correct).toBe(0);
  });

  it('un ejercicio cambiado se rechaza y no devuelve perfil', () => {
    const req = request('add-within-10', 11, right);
    const tampered = { ...req, exercise: { ...req.exercise, a: req.exercise.a + 1 } };
    expect(validateAnswer(createProfile(), tampered)).toEqual({ ok: false, error: 'exercise-mismatch' });
    // Habilidad que no corresponde a esa semilla: sale otro ejercicio.
    let rejected = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const honest = request('add-within-20-carry', seed, right);
      if (!validateAnswer(createProfile(), { ...honest, skill: 'sub-within-10' }).ok) rejected++;
    }
    expect(rejected).toBeGreaterThan(150);
  });

  it('fallar nunca baja de 0, ni quita intentos o aciertos; en reto resta menos', () => {
    let profile = createProfile();
    for (let seed = 1; seed <= 20; seed++) {
      const result = validateAnswer(profile, request('add-within-10', seed, wrong));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.profile['add-within-10'].mastery).toBe(0);
      expect(result.profile['add-within-10'].attempts).toBe(seed);
      expect(result.profile['add-within-10'].correct).toBe(0);
      profile = result.profile;
    }
    const base = applyAnswer(createProfile(), 'add-within-10', { correct: true, helped: false, slot: 'current' });
    const fail = validateAnswer(base, request('add-within-10', 5, wrong));
    expect(fail.ok && fail.profile['add-within-10'].mastery).toBe(2);
    const challenge = validateAnswer(base, request('add-within-10', 5, wrong, { slot: 'challenge' }));
    expect(challenge.ok && challenge.profile['add-within-10'].mastery).toBe(5);
    // Los aciertos acumulados no se pierden al fallar.
    expect(fail.ok && fail.profile['add-within-10'].correct).toBe(1);
  });

  it('la rapidez no cuenta: cualquier tiempo enviado se ignora', () => {
    const req = request('add-within-10', 9, right);
    const base = validateAnswer(createProfile(), req);
    for (const elapsedMs of [0, 50, 20000, 9e9, -5, Number.NaN]) {
      const parsed = parseAnswerRequest({ ...req, elapsedMs });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(validateAnswer(createProfile(), parsed.value)).toEqual(base);
    }
  });

  it('cada semilla genera el mismo ejercicio siempre (reproducible en el servidor)', () => {
    for (let seed = 0; seed < 500; seed++) {
      for (const skill of ['add-within-10', 'sub-within-20-borrow', 'word-problems-within-10'] as const) {
        const a = generateExercise(skill, createRng(seed));
        const b = generateExercise(skill, createRng(seed));
        expect({ ...a, id: '' }).toEqual({ ...b, id: '' });
      }
    }
  });
});

describe('parseAnswerRequest', () => {
  const good = request('add-within-10', 4, right);

  it('acepta una petición válida', () => {
    expect(parseAnswerRequest(good)).toEqual({ ok: true, value: good });
  });

  it.each([
    ['habilidad desconocida', { skill: 'multiplicar' }],
    ['semilla vacía', { seed: '' }],
    ['semilla de más de 64 caracteres', { seed: '1'.repeat(65) }],
    ['semilla con ceros delante', { seed: '0004' }],
    ['semilla fuera de 32 bits', { seed: '4294967296' }],
    ['semilla numérica', { seed: 4 }],
    ['respuesta en texto', { given: '7' }],
    ['respuesta decimal', { given: 1.5 }],
    ['respuesta no finita', { given: Number.POSITIVE_INFINITY }],
    ['hueco desconocido', { exercise: { a: 1, b: 2, c: 3, hidden: 'x' } }],
    ['reto inventado', { slot: 'gratis' }],
    ['ayuda sin booleano', { helped: 'no' }],
    ['demasiadas pistas', { hintsUsed: 4 }],
  ])('rechaza %s', (_name, patch) => {
    expect(parseAnswerRequest({ ...good, ...patch }).ok).toBe(false);
  });

  it.each([null, 'hola', 3, [], undefined])('rechaza un cuerpo que no es un objeto: %s', (body) => {
    expect(parseAnswerRequest(body).ok).toBe(false);
  });

  it('parseSeed solo acepta enteros canónicos de 32 bits', () => {
    expect(parseSeed('0')).toBe('0');
    expect(parseSeed('4294967295')).toBe('4294967295');
    expect(parseSeed('-1')).toBeUndefined();
    expect(parseSeed('1e3')).toBeUndefined();
    expect(parseSeed(' 1')).toBeUndefined();
  });
});

/** Hace la prueba entera con `ok` decidiendo cada respuesta. */
function placementAnswers(ok: (i: number) => boolean): PlacementAnswer[] {
  let state = startPlacement();
  const out: PlacementAnswer[] = [];
  for (;;) {
    const skill = nextPlacementSkill(state);
    if (!skill) return out;
    const seed = 1000 + out.length;
    const ex = generateExercise(skill, createRng(seed));
    const good = ok(out.length);
    out.push({ skill, seed: String(seed), given: good ? ex.answer : ex.answer + 1, exercise: { a: ex.a, b: ex.b, c: ex.c, hidden: ex.hidden }, helped: false, hintsUsed: 0 });
    state = recordPlacement(state, good);
  }
}

describe('validatePlacement', () => {
  it('da un dominio inicial y nunca baja nada', () => {
    const answers = placementAnswers(() => true);
    const profile = createProfile();
    profile['add-within-10'] = { mastery: 90, attempts: 30, correct: 30 };
    const result = validatePlacement(profile, answers);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile['add-within-10'].mastery).toBe(90);
    expect(result.profile['add-within-10'].attempts).toBe(30);
    expect(result.records).toHaveLength(answers.length);
  });

  it('todo mal deja todo en 0', () => {
    const result = validatePlacement(createProfile(), placementAnswers(() => false));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.values(result.profile).every((s) => s.mastery === 0 && s.attempts === 0)).toBe(true);
  });

  it('rechaza un orden inventado, un ejercicio cambiado, semillas repetidas y pruebas sin acabar', () => {
    const answers = placementAnswers((i) => i % 2 === 0);
    const swapped = [answers[1] as PlacementAnswer, answers[0] as PlacementAnswer, ...answers.slice(2)];
    expect(validatePlacement(createProfile(), swapped).ok).toBe(false);
    const first = answers[0] as PlacementAnswer;
    const tampered = [{ ...first, exercise: { ...first.exercise, c: first.exercise.c + 1 } }, ...answers.slice(1)];
    expect(validatePlacement(createProfile(), tampered)).toEqual({ ok: false, error: 'exercise-mismatch' });
    expect(validatePlacement(createProfile(), answers.slice(0, 2))).toEqual({ ok: false, error: 'placement-incomplete' });
    expect(validatePlacement(createProfile(), [first, first]).ok).toBe(false);
  });

  it('acertar con ayuda no cuenta como acierto', () => {
    const answers = placementAnswers(() => true).map((a) => ({ ...a, helped: true }));
    // El orden esperado cambia (todo cuenta como fallo): o se rechaza o no da dominio alto.
    const result = validatePlacement(createProfile(), answers);
    if (result.ok) expect(Object.values(result.profile).every((s) => s.mastery <= 40)).toBe(true);
  });

  it('parsePlacementRequest limita el tamaño', () => {
    const a = placementAnswers(() => true);
    expect(parsePlacementRequest({ answers: a }).ok).toBe(true);
    expect(parsePlacementRequest({ answers: [] }).ok).toBe(false);
    expect(parsePlacementRequest({ answers: Array(13).fill(a[0]) }).ok).toBe(false);
    expect(parsePlacementRequest({}).ok).toBe(false);
  });
});
