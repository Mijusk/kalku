import { describe, expect, it } from 'vitest';
import {
  applyAnswer,
  challengeSkill,
  createProfile,
  createRng,
  currentSkill,
  isMastered,
  MASTERY_MIN_ATTEMPTS,
  pickSkill,
  scoreAnswer,
  type MasteryProfile,
  type SkillId,
} from '../src/index.js';

function master(profile: MasteryProfile, skill: SkillId): MasteryProfile {
  let p = profile;
  for (let i = 0; i < MASTERY_MIN_ATTEMPTS + 5; i++) p = applyAnswer(p, skill, { correct: true, helped: false, slot: 'current' });
  return p;
}

describe('dominio', () => {
  it('sube 8 a la primera, 5 con ayuda, baja 6 al fallar y 3 al fallar un reto', () => {
    let p = createProfile();
    p = applyAnswer(p, 'add-within-10', { correct: true, helped: false, slot: 'current' });
    expect(p['add-within-10'].mastery).toBe(8);
    p = applyAnswer(p, 'add-within-10', { correct: true, helped: true, slot: 'current' });
    expect(p['add-within-10'].mastery).toBe(13);
    p = applyAnswer(p, 'add-within-10', { correct: false, helped: false, slot: 'current' });
    expect(p['add-within-10'].mastery).toBe(7);
    p = applyAnswer(p, 'add-within-10', { correct: false, helped: false, slot: 'challenge' });
    expect(p['add-within-10'].mastery).toBe(4);
  });

  it('se queda entre 0 y 100', () => {
    let p = createProfile();
    p = applyAnswer(p, 'add-within-10', { correct: false, helped: false, slot: 'current' });
    expect(p['add-within-10'].mastery).toBe(0);
    p = master(master(p, 'add-within-10'), 'add-within-10');
    expect(p['add-within-10'].mastery).toBe(100);
  });

  it('no modifica el perfil original', () => {
    const p = createProfile();
    applyAnswer(p, 'add-within-10', { correct: true, helped: false, slot: 'current' });
    expect(p['add-within-10'].mastery).toBe(0);
  });

  it('pide un mínimo de intentos para dar una habilidad por dominada', () => {
    const p = { ...createProfile(), 'add-within-10': { mastery: 90, attempts: 3, correct: 3 } };
    expect(isMastered(p['add-within-10'])).toBe(false);
  });
});

describe('selección de habilidad', () => {
  it('empieza por sumas hasta 10 y avanza al dominar', () => {
    let p = createProfile();
    expect(currentSkill(p)).toBe('add-within-10');
    p = master(p, 'add-within-10');
    expect(currentSkill(p)).toBe('sub-within-10');
    expect(challengeSkill(p)).toBe('add-within-20-no-carry');
  });

  it('no propone una habilidad sin sus requisitos', () => {
    let p = master(createProfile(), 'add-within-10');
    p = master(p, 'add-within-20-no-carry');
    // Restas hasta 10 sigue sin dominar, así que va antes que nada que la necesite.
    expect(currentSkill(p)).toBe('sub-within-10');
  });

  it('reparte aproximadamente 60 / 25 / 15', () => {
    let p = master(createProfile(), 'add-within-10');
    p = master(p, 'sub-within-10');
    const rng = createRng(99);
    const counts = { current: 0, review: 0, challenge: 0 };
    const n = 10_000;
    for (let i = 0; i < n; i++) counts[pickSkill(p, rng).slot]++;
    expect(counts.current / n).toBeCloseTo(0.6, 1);
    expect(counts.review / n).toBeCloseTo(0.25, 1);
    expect(counts.challenge / n).toBeCloseTo(0.15, 1);
  });

  it('sin nada que repasar, usa la habilidad actual', () => {
    const rng = createRng(5);
    const p = createProfile();
    for (let i = 0; i < 500; i++) expect(pickSkill(p, rng).slot).not.toBe('review');
  });
});

describe('puntos', () => {
  it('fallar da 0 puntos y nunca resta', () => {
    expect(scoreAnswer({ correct: false, difficulty: 6, streak: 10, helped: false, elapsedMs: 1_000 }).total).toBe(0);
  });

  it('ser lento nunca resta respecto a no tener tiempo', () => {
    const noTimer = scoreAnswer({ correct: true, difficulty: 3, streak: 0, helped: false }).total;
    const slow = scoreAnswer({ correct: true, difficulty: 3, streak: 0, helped: false, elapsedMs: 120_000 }).total;
    const fast = scoreAnswer({ correct: true, difficulty: 3, streak: 0, helped: false, elapsedMs: 2_000 }).total;
    expect(slow).toBe(noTimer);
    expect(fast).toBeGreaterThan(slow);
  });

  it('sin tiempo no hay bonus de rapidez y los puntos igualan a responder despacio', () => {
    const input = { correct: true, difficulty: 4, streak: 2, helped: false } as const;
    const noTimer = scoreAnswer(input);
    const slow = scoreAnswer({ ...input, elapsedMs: 120_000 });
    expect(noTimer.speedBonus).toBe(0);
    expect(noTimer).toEqual(slow);
  });

  it('la racha suma con tope y la ayuda reduce los puntos', () => {
    const base = scoreAnswer({ correct: true, difficulty: 2, streak: 0, helped: false }).total;
    const streak = scoreAnswer({ correct: true, difficulty: 2, streak: 3, helped: false }).total;
    const capped = scoreAnswer({ correct: true, difficulty: 2, streak: 100, helped: false }).total;
    const helped = scoreAnswer({ correct: true, difficulty: 2, streak: 0, helped: true }).total;
    expect(streak).toBeGreaterThan(base);
    expect(capped).toBe(Math.round(base * 1.5));
    expect(helped).toBeLessThan(base);
    expect(helped).toBeGreaterThan(0);
  });
});
