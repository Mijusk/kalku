import { describe, expect, it } from 'vitest';
import { capCoins, COIN_CAP, parseCoinDay, type SkillProgress } from '../src/index.js';

const mastered: SkillProgress = { mastery: 95, attempts: 40, correct: 38 };
const learning: SkillProgress = { mastery: 55, attempts: 12, correct: 8 };
const struggling: SkillProgress = { mastery: 20, attempts: 6, correct: 2 };

describe('límite diario de Cifras', () => {
  it('lo dominado da Cifras hasta el tope del día y luego 0 (sin quitar nada)', () => {
    let state = null as ReturnType<typeof capCoins>['state'] | null;
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const r = capCoins({ coins: 20, skill: mastered, slot: 'review' }, state, '2026-11-27');
      expect(r.coins).toBeGreaterThanOrEqual(0);
      total += r.coins;
      state = r.state;
    }
    expect(total).toBe(COIN_CAP.masteredPerDay);
    const after = capCoins({ coins: 20, skill: mastered, slot: 'review' }, state, '2026-11-27');
    expect(after).toMatchObject({ coins: 0, capped: true });
  });
  it('el límite se reinicia cada día', () => {
    const full = { day: '2026-11-27', mastered: COIN_CAP.masteredPerDay };
    expect(capCoins({ coins: 20, skill: mastered, slot: 'review' }, full, '2026-11-27').coins).toBe(0);
    const next = capCoins({ coins: 20, skill: mastered, slot: 'review' }, full, '2026-11-28');
    expect(next.coins).toBe(20);
    expect(next.state).toEqual({ day: '2026-11-28', mastered: 20 });
  });
  it('lo que aún se aprende no tiene tope', () => {
    const full = { day: '2026-11-27', mastered: COIN_CAP.masteredPerDay };
    expect(capCoins({ coins: 20, skill: learning, slot: 'current' }, full, '2026-11-27')).toMatchObject({ coins: 20, capped: false });
  });
  it('practicar lo que cuesta (reto o poco dominio) da un extra', () => {
    expect(capCoins({ coins: 20, skill: struggling, slot: 'current' }, null, '2026-11-27')).toMatchObject({ coins: 25, bonus: 5 });
    expect(capCoins({ coins: 20, skill: learning, slot: 'challenge' }, null, '2026-11-27')).toMatchObject({ coins: 25, bonus: 5 });
  });
  it('fallar sigue dando 0 y nunca negativo', () => {
    expect(capCoins({ coins: 0, skill: struggling, slot: 'challenge' }, null, '2026-11-27').coins).toBe(0);
    expect(capCoins({ coins: -5, skill: mastered, slot: 'review' }, null, '2026-11-27').coins).toBe(0);
  });
  it('no muta el contador que recibe', () => {
    const state = { day: '2026-11-27', mastered: 10 };
    capCoins({ coins: 20, skill: mastered, slot: 'review' }, state, '2026-11-27');
    expect(state).toEqual({ day: '2026-11-27', mastered: 10 });
  });
  it('lee el contador guardado', () => {
    expect(parseCoinDay({ day: '2026-11-27', mastered: 40 })).toEqual({ day: '2026-11-27', mastered: 40 });
    expect(parseCoinDay({ day: 'x', mastered: 4 })).toBeNull();
    expect(parseCoinDay(null)).toBeNull();
  });
});
