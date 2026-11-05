import { SKILL_IDS, type SkillId } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import { CREATURES, creaturesForSkill, FAMILIES, getCreature, validateCreatures, type CreatureDefinition } from '../src/index.js';

const base = getCreature('sumus-brote');

/** Una criatura con algún campo cambiado, para probar datos mal escritos. */
function broken(patch: Partial<Record<keyof CreatureDefinition, unknown>>): CreatureDefinition {
  return { ...base, ...patch } as CreatureDefinition;
}

describe('criaturas de Pradera Uno', () => {
  it('los datos son válidos', () => {
    expect(validateCreatures(CREATURES)).toEqual([]);
  });

  it('hay una criatura por habilidad, en orden de currículo', () => {
    expect(CREATURES.map((c) => c.skill)).toEqual(SKILL_IDS);
  });

  it('todas las familias tienen nombre en los dos idiomas', () => {
    for (const f of FAMILIES) {
      expect(f.name.es).not.toBe('');
      expect(f.name.ca).not.toBe('');
    }
  });

  it('los nombres ya están aprobados por Luis', () => {
    expect(CREATURES.every((c) => !c.provisional)).toBe(true);
  });
});

describe('validateCreatures', () => {
  it('falla si falta un idioma en el nombre', () => {
    const c = broken({ name: { es: 'Sumus Brote', ca: '' } });
    expect(validateCreatures([c])).toContain('sumus-brote: falta el nombre en «ca»');
  });

  it('falla si falta un idioma en la descripción', () => {
    const c = broken({ description: { ca: 'Hola' } });
    expect(validateCreatures([c])).toContain('sumus-brote: falta la descripción en «es»');
  });

  it('falla si la habilidad no existe', () => {
    const c = broken({ skill: 'mul-within-100' as SkillId });
    expect(validateCreatures([c])).toContain('sumus-brote: la habilidad «mul-within-100» no existe');
  });

  it('falla si la familia no cuadra con la operación', () => {
    const c = broken({ skill: 'sub-within-10' });
    expect(validateCreatures([c])).toContain('sumus-brote: un sumus no puede ir con la habilidad «sub-within-10»');
  });

  it('falla si hay ids o sprites repetidos', () => {
    const errors = validateCreatures([base, base]);
    expect(errors).toContain('sumus-brote: id repetido');
    expect(errors).toContain('sumus-brote: sprite repetido (creature-sumus-brote)');
  });

  it('falla si la vida no es un entero positivo', () => {
    expect(validateCreatures([broken({ hp: 0 })])).toContain('sumus-brote: la vida tiene que ser un entero positivo');
  });
});

describe('creaturesForSkill', () => {
  it('cada habilidad tiene al menos una criatura que la practica', () => {
    for (const skill of SKILL_IDS) {
      const found = creaturesForSkill(skill);
      expect(found.length).toBeGreaterThan(0);
      for (const c of found) expect(c.skill).toBe(skill);
    }
  });
});
