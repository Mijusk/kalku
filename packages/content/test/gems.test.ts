import { SKILLS } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import { gemStatus } from '../src/index.js';

describe('gemas de dominio', () => {
  it('sale de SKILLS: mismas habilidades y mismo orden', () => {
    expect(gemStatus([]).map((g) => g.skill.id)).toEqual(SKILLS.map((s) => s.id));
  });

  it('solo están ganadas las que constan, e ids desconocidos se ignoran', () => {
    const second = SKILLS[1]?.id ?? '';
    const status = gemStatus([second, 'no-existe']);
    expect(status).toHaveLength(SKILLS.length);
    expect(status.filter((g) => g.earned).map((g) => g.skill.id)).toEqual([second]);
  });

  it('todas tienen nombre en es y ca', () => {
    for (const { skill } of gemStatus([])) {
      expect(skill.name.es).not.toBe('');
      expect(skill.name.ca).not.toBe('');
    }
  });
});
