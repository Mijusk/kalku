import { describe, expect, it } from 'vitest';
import { SOUND_DATA } from '../src/audio/sound';

describe('sonido generado por código', () => {
  it('todos los efectos tienen notas válidas y volumen bajo', () => {
    for (const [id, effect] of Object.entries(SOUND_DATA.EFFECTS)) {
      expect(effect.notes.length, id).toBeGreaterThan(0);
      expect(effect.voice.volume, id).toBeLessThanOrEqual(0.2);
      for (const n of effect.notes) {
        expect(n.f, id).toBeGreaterThanOrEqual(0);
        expect(n.d, id).toBeGreaterThan(0);
      }
    }
  });

  it('cada melodía tiene notas y un bajo del mismo largo', () => {
    for (const [id, tune] of Object.entries(SOUND_DATA.TUNES)) {
      expect(tune.melody.length, id).toBeGreaterThan(0);
      expect(tune.bassline.length, id).toBe(tune.melody.length);
      expect([...tune.melody, ...tune.bassline].every((f) => Number.isFinite(f) && f >= 0), id).toBe(true);
    }
  });
});
