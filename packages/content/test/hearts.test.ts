import { describe, expect, it } from 'vitest';
import { HEARTS, outOfHearts, scoreHit, startHearts, takeHit } from '../src/index.js';

describe('corazones del combate', () => {
  it('empiezan según la edad, con uno más contra el jefe y otro tras dos derrotas seguidas', () => {
    expect(startHearts('older', false, 0).hearts).toBe(HEARTS.base.older);
    expect(startHearts('young', false, 0).hearts).toBe(HEARTS.base.young);
    expect(startHearts('older', true, 0).hearts).toBe(HEARTS.base.older + 1);
    expect(startHearts('older', false, 1).hearts).toBe(HEARTS.base.older);
    expect(startHearts('older', false, 2).hearts).toBe(HEARTS.base.older + 1);
  });

  it('cada golpe quita un corazón y nunca baja de 0', () => {
    let s = startHearts('older', false, 0);
    for (let i = 0; i < 5; i++) s = takeHit(s).state;
    expect(s.hearts).toBe(0);
    expect(outOfHearts(s)).toBe(true);
  });

  it('tres aciertos seguidos dan un escudo que para el siguiente golpe', () => {
    let s = startHearts('older', false, 0);
    let got = false;
    for (let i = 0; i < HEARTS.shieldStreak; i++) {
      const r = scoreHit(s);
      s = r.state;
      got = r.gotShield;
    }
    expect(got).toBe(true);
    expect(s.shield).toBe(true);
    const hit = takeHit(s);
    expect(hit.blocked).toBe(true);
    expect(hit.state.hearts).toBe(s.hearts);
    expect(hit.state.shield).toBe(false);
  });

  it('solo se lleva un escudo a la vez y un fallo corta la racha', () => {
    let s = startHearts('young', false, 0);
    for (let i = 0; i < HEARTS.shieldStreak * 2; i++) s = scoreHit(s).state;
    expect(s.shield).toBe(true);
    expect(scoreHit(s).gotShield).toBe(false);
    s = takeHit(s).state;
    expect(s.streak).toBe(0);
  });
});
