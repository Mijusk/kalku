import { drawCreature, type CreatureLook } from '@kalku/art';
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

  it('solo Cuentín tiene el nombre pendiente de aprobar por Luis', () => {
    expect(CREATURES.filter((c) => c.provisional).map((c) => c.id)).toEqual(['problemus-cuentin']);
  });
});

describe('problemus', () => {
  const cuentin = getCreature('problemus-cuentin');

  it('la familia acepta su habilidad de problemas y el símbolo ±', () => {
    expect(cuentin.skill).toBe('word-problems-within-10');
    expect(cuentin.look.sign).toBe('±');
    expect(validateCreatures([cuentin])).toEqual([]);
  });

  it('rechaza un problemus con una habilidad de una sola operación o con el símbolo de otra familia', () => {
    expect(validateCreatures([{ ...cuentin, skill: 'add-within-10' }])).toContain(
      'problemus-cuentin: un problemus no puede ir con la habilidad «add-within-10»',
    );
    expect(validateCreatures([{ ...cuentin, look: { ...cuentin.look, sign: '+' } }])).toContain(
      'problemus-cuentin: el símbolo «+» no es el de la familia problemus',
    );
  });

  it('un sumus no puede practicar problemas mixtos', () => {
    expect(validateCreatures([broken({ skill: 'word-problems-within-10' })])).toContain(
      'sumus-brote: un sumus no puede ir con la habilidad «word-problems-within-10»',
    );
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

describe('piezas de las criaturas', () => {
  it('falla si el símbolo no es el de su familia', () => {
    const c = broken({ look: { ...base.look, sign: '-' } });
    expect(validateCreatures([c])).toContain('sumus-brote: el símbolo «-» no es el de la familia sumus');
  });

  it('falla si una pieza no existe', () => {
    const c = broken({ look: { ...base.look, body: 'cubo' } });
    expect(validateCreatures([c])).toContain('sumus-brote: el cuerpo «cubo» no existe');
  });

  it('las 7 criaturas se dibujan y no hay dos iguales', () => {
    const drawings = CREATURES.map((c) => drawCreature(c.look)[0]?.px.join(',') ?? '');
    expect(new Set(drawings).size).toBe(CREATURES.length);
  });

  it('añadir una criatura es solo añadir datos: se valida y se dibuja sin tocar lógica', () => {
    const look: CreatureLook = { ramp: 'rosa', body: 'drop', top: 'antenna', eyes: 'sleepy', cheeks: true, sign: '+' };
    const nueva = broken({
      id: 'sumus-nuevo',
      sprite: 'creature-sumus-nuevo',
      name: { es: 'Sumus Nuevo', ca: 'Sumus Nou' },
      description: { es: 'Una prueba.', ca: 'Una prova.' },
      look,
    });
    expect(validateCreatures([...CREATURES, nueva])).toEqual([]);
    expect(drawCreature(nueva.look)).toHaveLength(8);
  });
});
