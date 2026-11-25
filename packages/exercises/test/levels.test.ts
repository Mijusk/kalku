import { describe, expect, it } from 'vitest';
import { createRng, levelForXp, levelProgress, LEVELS, MAX_LEVEL, sanitizeXp, xpForAnswer } from '../src/index.js';

describe('xpForAnswer', () => {
  it('fallar da 0, con cualquier dificultad', () => {
    for (const difficulty of [1, 2, 3, 5]) {
      for (const helped of [false, true]) expect(xpForAnswer({ correct: false, difficulty, helped })).toBe(0);
    }
  });

  it('acertar da 10 × dificultad; con pista, la mitad y nunca 0', () => {
    expect(xpForAnswer({ correct: true, difficulty: 2, helped: false })).toBe(20);
    expect(xpForAnswer({ correct: true, difficulty: 2, helped: true })).toBe(10);
    expect(xpForAnswer({ correct: true, difficulty: 1, helped: true })).toBeGreaterThan(0);
  });

  it('no depende del tiempo: la función ni lo recibe', () => {
    const input = { correct: true, difficulty: 3, helped: false };
    expect(xpForAnswer({ ...input, elapsedMs: 1 } as typeof input)).toBe(xpForAnswer({ ...input, elapsedMs: 900_000 } as typeof input));
  });
});

describe('curva de niveles', () => {
  it('empieza en 0, es estrictamente creciente y cada nivel cuesta ≥ que el anterior', () => {
    expect(LEVELS[0]).toBe(0);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i]).toBeGreaterThan(LEVELS[i - 1] ?? 0);
    for (let i = 2; i < LEVELS.length; i++) {
      expect((LEVELS[i] ?? 0) - (LEVELS[i - 1] ?? 0)).toBeGreaterThanOrEqual((LEVELS[i - 1] ?? 0) - (LEVELS[i - 2] ?? 0));
    }
  });

  it('llega hasta el nivel 30 con los primeros umbrales pactados', () => {
    expect(MAX_LEVEL).toBe(30);
    expect(LEVELS.slice(0, 5)).toEqual([0, 400, 900, 1500, 2300]);
  });

  it('levelForXp coincide con la tabla justo antes y en cada umbral', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const threshold = LEVELS[i] ?? 0;
      expect(levelForXp(threshold - 1)).toBe(i);
      expect(levelForXp(threshold)).toBe(i + 1);
    }
  });

  it('con XP gigante o inválida no se rompe', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
    expect(levelForXp(Infinity)).toBe(1);
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelProgress(Number.MAX_SAFE_INTEGER)).toMatchObject({ level: MAX_LEVEL, fraction: 1, xpToNext: 0, max: true });
  });

  it('levelProgress da la fracción de la barra', () => {
    expect(levelProgress(0)).toMatchObject({ level: 1, xpInLevel: 0, xpForNext: 400, xpToNext: 400, fraction: 0, max: false });
    expect(levelProgress(200).fraction).toBe(0.5);
    expect(levelProgress(400)).toMatchObject({ level: 2, xpInLevel: 0, xpForNext: 500 });
  });

  it('sanitizeXp acepta enteros ≥ 0 y el resto da 0', () => {
    expect(sanitizeXp(12.9)).toBe(12);
    for (const bad of [-1, 'x', null, undefined, Number.NaN, Infinity, {}]) expect(sanitizeXp(bad)).toBe(0);
  });
});

describe('la XP y el nivel nunca bajan', () => {
  it('1.000 respuestas (aciertos, fallos, con ayuda, lentas) con semilla fija', () => {
    const rng = createRng(69);
    let xp = 0;
    let level = levelForXp(xp);
    for (let i = 0; i < 1000; i++) {
      const gained = xpForAnswer({ correct: rng.chance(0.7), difficulty: rng.int(1, 4), helped: rng.chance(0.3) });
      expect(gained).toBeGreaterThanOrEqual(0);
      const next = xp + gained;
      expect(next).toBeGreaterThanOrEqual(xp);
      const nextLevel = levelForXp(next);
      expect(nextLevel).toBeGreaterThanOrEqual(level);
      xp = next;
      level = nextLevel;
    }
    expect(xp).toBeGreaterThan(0);
  });
});
