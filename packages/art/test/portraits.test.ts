import { describe, expect, it } from 'vitest';
import { drawPortrait, PORTRAITS, PORTRAIT_SIZE, validatePortraits, EMPTY, type PortraitId } from '../src/index.js';

describe('retratos', () => {
  it('los datos son válidos', () => {
    expect(validatePortraits()).toEqual([]);
  });

  it('cada retrato pinta algo con contorno oscuro', () => {
    for (const id of Object.keys(PORTRAITS) as PortraitId[]) {
      const g = drawPortrait(id);
      expect(g.width).toBe(PORTRAIT_SIZE);
      const painted = Array.from(g.px).filter((c) => c !== EMPTY);
      expect(painted.length, id).toBeGreaterThan(60);
      expect(painted.includes(0x1b2a1f), id).toBe(true);
    }
  });
});
