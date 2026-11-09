import { SKILLS } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import {
  countEncounter,
  CREATURES,
  damageMultiplier,
  getCreature,
  getFamily,
  parseEncounters,
  shouldShowWeaknessHint,
  WEAKNESS_HINT_ENCOUNTERS,
  WEAKNESS_MULTIPLIER,
  weakOperator,
} from '../src/index.js';

describe('debilidad por operación inversa', () => {
  it('un restus es débil a la suma y un sumus a la resta', () => {
    expect(damageMultiplier(getCreature('restus-gota'), '+')).toBe(WEAKNESS_MULTIPLIER);
    expect(damageMultiplier(getCreature('sumus-brote'), '-')).toBe(WEAKNESS_MULTIPLIER);
  });

  it('con su misma operación el daño no cambia', () => {
    expect(damageMultiplier(getCreature('restus-gota'), '-')).toBe(1);
    expect(damageMultiplier(getCreature('sumus-brote'), '+')).toBe(1);
  });

  it('en todas las criaturas y habilidades solo sube con la operación inversa y nunca baja de 1', () => {
    for (const c of CREATURES) {
      for (const skill of SKILLS) {
        const m = skill.operator === 'mixed' ? 1 : damageMultiplier(c, skill.operator);
        expect(m).toBeGreaterThanOrEqual(1);
        const mixed = skill.operator === 'mixed' || getFamily(c.family).operator === 'mixed';
        expect(m > 1).toBe(!mixed && skill.operator !== getFamily(c.family).operator);
      }
    }
  });

  it('weakOperator es el inverso de la familia', () => {
    for (const c of CREATURES.filter((x) => x.family !== 'problemus')) {
      expect(weakOperator(c)).not.toBe(getFamily(c.family).operator);
    }
  });

  it('los problemus no tienen debilidad: el daño es siempre ×1', () => {
    const cuentin = getCreature('problemus-cuentin');
    expect(weakOperator(cuentin)).toBeUndefined();
    expect(damageMultiplier(cuentin, '+')).toBe(1);
    expect(damageMultiplier(cuentin, '-')).toBe(1);
  });

  it('el multiplicador es mayor que 1', () => {
    expect(WEAKNESS_MULTIPLIER).toBeGreaterThan(1);
  });

  it('todas las criaturas tienen vida y nombre en es y ca', () => {
    for (const c of CREATURES) {
      expect(c.hp).toBeGreaterThan(0);
      expect(c.name.es).not.toBe('');
      expect(c.name.ca).not.toBe('');
    }
  });
});

describe('cartel de debilidad', () => {
  it('sale en los encuentros 1 a 5 y no desde el 6', () => {
    for (let n = 1; n <= WEAKNESS_HINT_ENCOUNTERS; n++) expect(shouldShowWeaknessHint(n)).toBe(true);
    expect(WEAKNESS_HINT_ENCOUNTERS).toBe(5);
    expect(shouldShowWeaknessHint(6)).toBe(false);
    expect(shouldShowWeaknessHint(20)).toBe(false);
  });

  it('el multiplicador se aplica igual en el encuentro 1 y en el 20', () => {
    const restus = getCreature('restus-gota');
    expect(damageMultiplier(restus, '+')).toBe(WEAKNESS_MULTIPLIER);
    // No depende del contador: la función ni lo recibe.
    expect(damageMultiplier.length).toBe(2);
  });
});

describe('contador de encuentros', () => {
  it('suma por familia sin mutar', () => {
    const a = {};
    const b = countEncounter(a, 'sumus');
    const c = countEncounter(b, 'sumus');
    expect(a).toEqual({});
    expect(c).toEqual({ sumus: 2 });
    expect(countEncounter(c, 'restus')).toEqual({ sumus: 2, restus: 1 });
  });

  it('un progreso antiguo sin encounters carga vacío', () => {
    expect(parseEncounters(undefined)).toEqual({});
    expect(parseEncounters('x')).toEqual({});
    expect(parseEncounters({ sumus: -3, restus: 'a', otra: 4 })).toEqual({});
    expect(parseEncounters({ sumus: 3 })).toEqual({ sumus: 3 });
  });
});
