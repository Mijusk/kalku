import { getSkill, SKILL_IDS, type Localized, type Operator, type SkillId } from '@kalku/exercises';

/**
 * Familias de criaturas (kalkus). La familia decide la operación: a un
 * sumus se le gana sumando y a un restus, restando. Los problemus
 * (problemas con enunciado) llegarán con su propia habilidad.
 */
export type CreatureFamily = 'sumus' | 'restus';

export interface FamilyDefinition {
  id: CreatureFamily;
  operator: Operator;
  /** Invariable: «un sumus», «dos sumus». */
  name: Localized;
}

export const FAMILIES: readonly FamilyDefinition[] = [
  { id: 'sumus', operator: '+', name: { es: 'sumus', ca: 'sumus' } },
  { id: 'restus', operator: '-', name: { es: 'restus', ca: 'restus' } },
];

export type CreatureId =
  | 'sumus-brote'
  | 'sumus-trebol'
  | 'sumus-roble'
  | 'restus-gota'
  | 'restus-bruma'
  | 'restus-sombra';

export interface CreatureDefinition {
  id: CreatureId;
  family: CreatureFamily;
  /** Los ejercicios que hay que resolver para ganarle. */
  skill: SkillId;
  name: Localized;
  /** Una frase corta para el niño. */
  description: Localized;
  hp: number;
  /** Clave de la textura (sprite provisional en apps/game/src/art/pixelArt.ts). */
  sprite: string;
  /** Nombre pendiente de aprobar por Luis. */
  provisional: boolean;
}

/**
 * Criaturas de Pradera Uno, una por habilidad y en orden de currículo.
 * Añadir una criatura es añadir una entrada aquí (y su sprite); no toca lógica.
 */
export const CREATURES: readonly CreatureDefinition[] = [
  {
    id: 'sumus-brote',
    family: 'sumus',
    skill: 'add-within-10',
    name: { es: 'Sumus Brote', ca: 'Sumus Brot' },
    description: { es: 'Cada vez que suma, le sale una hoja.', ca: 'Cada cop que suma, li surt una fulla.' },
    hp: 20,
    sprite: 'creature-sumus-brote',
    provisional: false,
  },
  {
    id: 'restus-gota',
    family: 'restus',
    skill: 'sub-within-10',
    name: { es: 'Restus Gota', ca: 'Restus Gota' },
    description: { es: 'Gotea y se hace pequeñito.', ca: 'Degota i es fa petitet.' },
    hp: 20,
    sprite: 'creature-restus-gota',
    provisional: false,
  },
  {
    id: 'sumus-trebol',
    family: 'sumus',
    skill: 'add-within-20-no-carry',
    name: { es: 'Sumus Trébol', ca: 'Sumus Trèvol' },
    description: { es: 'Junta hojas hasta llegar a veinte.', ca: 'Ajunta fulles fins a arribar a vint.' },
    hp: 30,
    sprite: 'creature-sumus-trebol',
    provisional: false,
  },
  {
    id: 'restus-bruma',
    family: 'restus',
    skill: 'sub-within-20-no-borrow',
    name: { es: 'Restus Bruma', ca: 'Restus Boira' },
    description: { es: 'Esconde números entre la niebla.', ca: 'Amaga nombres dins la boira.' },
    hp: 30,
    sprite: 'creature-restus-bruma',
    provisional: false,
  },
  {
    id: 'sumus-roble',
    family: 'sumus',
    skill: 'add-within-20-carry',
    name: { es: 'Sumus Roble', ca: 'Sumus Roure' },
    description: { es: 'Fuerte y viejo: siempre se lleva una.', ca: 'Fort i vell: sempre en porta una.' },
    hp: 40,
    sprite: 'creature-sumus-roble',
    provisional: false,
  },
  {
    id: 'restus-sombra',
    family: 'restus',
    skill: 'sub-within-20-borrow',
    name: { es: 'Restus Sombra', ca: 'Restus Ombra' },
    description: { es: 'Pide prestado a la decena de al lado.', ca: 'Demana prestat a la desena del costat.' },
    hp: 40,
    sprite: 'creature-restus-sombra',
    provisional: false,
  },
];

export function getCreature(id: CreatureId): CreatureDefinition {
  const creature = CREATURES.find((c) => c.id === id);
  if (!creature) throw new Error(`Criatura desconocida: ${id}`);
  return creature;
}

export function getFamily(id: CreatureFamily): FamilyDefinition {
  const family = FAMILIES.find((f) => f.id === id);
  if (!family) throw new Error(`Familia desconocida: ${id}`);
  return family;
}

const LOCALES = ['es', 'ca'] as const;

/**
 * Comprueba los datos de criaturas y devuelve los errores (vacío si están bien).
 */
export function validateCreatures(creatures: readonly CreatureDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const seenSprites = new Set<string>();
  for (const c of creatures) {
    if (seen.has(c.id)) errors.push(`${c.id}: id repetido`);
    seen.add(c.id);
    if (seenSprites.has(c.sprite)) errors.push(`${c.id}: sprite repetido (${c.sprite})`);
    seenSprites.add(c.sprite);
    for (const locale of LOCALES) {
      if (!c.name[locale]?.trim()) errors.push(`${c.id}: falta el nombre en «${locale}»`);
      if (!c.description[locale]?.trim()) errors.push(`${c.id}: falta la descripción en «${locale}»`);
    }
    if (!SKILL_IDS.includes(c.skill)) {
      errors.push(`${c.id}: la habilidad «${c.skill}» no existe`);
    } else {
      const family = FAMILIES.find((f) => f.id === c.family);
      if (!family) errors.push(`${c.id}: la familia «${c.family}» no existe`);
      else if (family.operator !== getSkill(c.skill).operator) {
        errors.push(`${c.id}: un ${c.family} no puede ir con la habilidad «${c.skill}»`);
      }
    }
    if (!Number.isInteger(c.hp) || c.hp <= 0) errors.push(`${c.id}: la vida tiene que ser un entero positivo`);
  }
  return errors;
}
