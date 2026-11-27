import { validateLook, type CreatureLook } from '@kalku/art';
import { getSkill, SKILL_IDS, type Localized, type SkillId, type SkillOperator } from '@kalku/exercises';

/**
 * Familias de criaturas (kalkus). La familia decide la operación: a un
 * sumus se le gana sumando y a un restus, restando. Los problemus
 * (problemas con enunciado) mezclan las dos y el niño decide cuál toca.
 */
export type CreatureFamily = 'sumus' | 'restus' | 'problemus';

export interface FamilyDefinition {
  id: CreatureFamily;
  operator: SkillOperator;
  /** Invariable: «un sumus», «dos sumus». */
  name: Localized;
}

export const FAMILIES: readonly FamilyDefinition[] = [
  { id: 'sumus', operator: '+', name: { es: 'sumus', ca: 'sumus' } },
  { id: 'restus', operator: '-', name: { es: 'restus', ca: 'restus' } },
  { id: 'problemus', operator: 'mixed', name: { es: 'problemus', ca: 'problemus' } },
];

export type CreatureId =
  | 'sumus-brote'
  | 'sumus-trebol'
  | 'sumus-roble'
  | 'restus-gota'
  | 'restus-bruma'
  | 'restus-sombra'
  | 'problemus-cuentin'
  | 'sumus-pina'
  | 'sumus-helecho'
  | 'restus-musgo'
  | 'sumus-bellota'
  | 'restus-seta'
  | 'problemus-corteza'
  | 'problemus-castana'
  | 'problemus-copito'
  | 'problemus-roseta'
  | 'problemus-solete';

export interface CreatureDefinition {
  id: CreatureId;
  family: CreatureFamily;
  /** Los ejercicios que hay que resolver para ganarle. */
  skill: SkillId;
  name: Localized;
  /** Una frase corta para el niño. */
  description: Localized;
  hp: number;
  /** Clave de la textura que el juego genera a partir de `look`. */
  sprite: string;
  /** Sus piezas: cuerpo, cabeza, ojos y colores. El dibujo sale de aquí (`@kalku/art`). */
  look: CreatureLook;
  /** Nombre pendiente de aprobar por Luis. */
  provisional: boolean;
  /** Los jefes nunca se pueden rescatar. Ausente cuenta como false. */
  boss?: boolean;
  /** Página del álbum: la región donde vive (id de su historia) o `eventos`. */
  album: string;
  /**
   * Criatura invitada de un evento de temporada (id del evento, `events.ts`).
   * Solo sale en el mapa durante sus fechas y sus ejercicios son los que le
   * tocan al niño (su `skill` es solo nominal). Nunca sale por su habilidad.
   */
  guest?: string;
}

/** Página del álbum de las criaturas invitadas de los eventos. */
export const EVENTS_ALBUM = 'eventos';

/**
 * Criaturas, una por habilidad y en orden de currículo (Pradera Uno y Bosque de las Decenas).
 * Añadir una criatura es añadir una entrada aquí, con sus piezas en `look`; no toca lógica.
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
    look: { ramp: 'verde', body: 'round', top: 'sprout', eyes: 'big', cheeks: true, sign: '+' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'restus-gota',
    family: 'restus',
    skill: 'sub-within-10',
    name: { es: 'Restus Gota', ca: 'Restus Gota' },
    description: { es: 'Gotea y se hace pequeñito.', ca: 'Degota i es fa petitet.' },
    hp: 20,
    sprite: 'creature-restus-gota',
    look: { ramp: 'azul', body: 'drop', top: 'droplet', eyes: 'big', sign: '-' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'sumus-trebol',
    family: 'sumus',
    skill: 'add-within-20-no-carry',
    name: { es: 'Sumus Trébol', ca: 'Sumus Trèvol' },
    description: { es: 'Junta hojas hasta llegar a veinte.', ca: 'Ajunta fulles fins a arribar a vint.' },
    hp: 30,
    sprite: 'creature-sumus-trebol',
    look: { ramp: 'verde', body: 'pear', top: 'ears', eyes: 'small', spots: true, sign: '+' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'restus-bruma',
    family: 'restus',
    skill: 'sub-within-20-no-borrow',
    name: { es: 'Restus Bruma', ca: 'Restus Boira' },
    description: { es: 'Esconde números entre la niebla.', ca: 'Amaga nombres dins la boira.' },
    hp: 30,
    sprite: 'creature-restus-bruma',
    look: { ramp: 'gris', body: 'bean', top: 'puff', eyes: 'sleepy', cheeks: true, sign: '-' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'sumus-roble',
    family: 'sumus',
    skill: 'add-within-20-carry',
    name: { es: 'Sumus Roble', ca: 'Sumus Roure' },
    description: { es: 'Fuerte y viejo: siempre se lleva una.', ca: 'Fort i vell: sempre en porta una.' },
    hp: 40,
    sprite: 'creature-sumus-roble',
    look: { ramp: 'marron', body: 'bean', top: 'sprout', eyes: 'small', spots: true, sign: '+' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'restus-sombra',
    family: 'restus',
    skill: 'sub-within-20-borrow',
    name: { es: 'Restus Sombra', ca: 'Restus Ombra' },
    description: { es: 'Pide prestado a la decena de al lado.', ca: 'Demana prestat a la desena del costat.' },
    hp: 40,
    sprite: 'creature-restus-sombra',
    look: { ramp: 'morado', body: 'pear', top: 'horns', eyes: 'small', sign: '-' },
    provisional: false,
    album: 'pradera-uno',
  },
  {
    id: 'problemus-cuentin',
    family: 'problemus',
    skill: 'word-problems-within-10',
    name: { es: 'Problemus Cuentín', ca: 'Problemus Contin' },
    description: { es: 'Siempre tiene una historia que contar.', ca: 'Sempre té una història per explicar.' },
    hp: 25,
    sprite: 'creature-problemus-cuentin',
    look: { ramp: 'naranja', body: 'round', top: 'antenna', eyes: 'big', cheeks: true, sign: '±' },
    provisional: true,
    album: 'pradera-uno',
  },
  // Bosque de las Decenas (números hasta 100).
  {
    id: 'sumus-pina',
    family: 'sumus',
    skill: 'tens-units',
    name: { es: 'Sumus Piña', ca: 'Sumus Pinya' },
    description: { es: 'Guarda los piñones de diez en diez.', ca: 'Guarda els pinyons de deu en deu.' },
    hp: 30,
    sprite: 'creature-sumus-pina',
    look: { ramp: 'marron', body: 'pear', top: 'sprout', eyes: 'big', spots: true, sign: '+' },
    provisional: false,
    album: 'bosque-decenas',
  },
  {
    id: 'sumus-helecho',
    family: 'sumus',
    skill: 'add-within-100-no-carry',
    name: { es: 'Sumus Helecho', ca: 'Sumus Falguera' },
    description: { es: 'Le crecen las hojas por decenas.', ca: 'Li creixen les fulles per desenes.' },
    hp: 40,
    sprite: 'creature-sumus-helecho',
    look: { ramp: 'verde', body: 'round', top: 'ears', eyes: 'big', cheeks: true, sign: '+' },
    provisional: false,
    album: 'bosque-decenas',
  },
  {
    id: 'restus-musgo',
    family: 'restus',
    skill: 'sub-within-100-no-borrow',
    name: { es: 'Restus Musgo', ca: 'Restus Molsa' },
    description: { es: 'Blandito y callado: borra sin hacer ruido.', ca: 'Tou i callat: esborra sense fer soroll.' },
    hp: 40,
    sprite: 'creature-restus-musgo',
    look: { ramp: 'verde', body: 'bean', top: 'puff', eyes: 'sleepy', sign: '-' },
    provisional: false,
    album: 'bosque-decenas',
  },
  {
    id: 'sumus-bellota',
    family: 'sumus',
    skill: 'add-within-100-carry',
    name: { es: 'Sumus Bellota', ca: 'Sumus Gla' },
    description: { es: 'Cuando junta diez bellotas, hace una decena.', ca: 'Quan ajunta deu glans, fa una desena.' },
    hp: 50,
    sprite: 'creature-sumus-bellota',
    look: { ramp: 'naranja', body: 'bean', top: 'antenna', eyes: 'small', spots: true, sign: '+' },
    provisional: false,
    album: 'bosque-decenas',
  },
  {
    id: 'restus-seta',
    family: 'restus',
    skill: 'sub-within-100-borrow',
    name: { es: 'Restus Seta', ca: 'Restus Bolet' },
    description: { es: 'Rompe una decena para poder quitar.', ca: 'Trenca una desena per poder treure.' },
    hp: 50,
    sprite: 'creature-restus-seta',
    look: { ramp: 'rosa', body: 'round', top: 'horns', eyes: 'small', spots: true, sign: '-' },
    provisional: false,
    album: 'bosque-decenas',
  },
  {
    id: 'problemus-corteza',
    family: 'problemus',
    skill: 'word-problems-within-100',
    name: { es: 'Problemus Corteza', ca: 'Problemus Escorça' },
    description: { es: 'Lleva historias escritas en la corteza.', ca: "Porta històries escrites a l'escorça." },
    hp: 35,
    sprite: 'creature-problemus-corteza',
    look: { ramp: 'marron', body: 'drop', top: 'antenna', eyes: 'big', cheeks: true, sign: '±' },
    provisional: false,
    album: 'bosque-decenas',
  },
  // Invitadas de los eventos de temporada (events.ts). Nombres pendientes de aprobar por Luis.
  {
    id: 'problemus-castana',
    family: 'problemus',
    skill: 'word-problems-within-10',
    name: { es: 'Problemus Castaña', ca: 'Problemus Castanya' },
    description: { es: 'Llega con el otoño, calentita y con pinchos suaves.', ca: 'Arriba amb la tardor, calentona i amb punxes suaus.' },
    hp: 30,
    sprite: 'creature-problemus-castana',
    look: { ramp: 'marron', body: 'round', top: 'horns', eyes: 'big', cheeks: true, spots: true, sign: '±' },
    provisional: true,
    album: EVENTS_ALBUM,
    guest: 'castanyada',
  },
  {
    id: 'problemus-copito',
    family: 'problemus',
    skill: 'word-problems-within-10',
    name: { es: 'Problemus Copito', ca: 'Problemus Floquet' },
    description: { es: 'Cae con la primera nieve y nunca tiene frío.', ca: 'Cau amb la primera neu i mai no té fred.' },
    hp: 30,
    sprite: 'creature-problemus-copito',
    look: { ramp: 'gris', body: 'round', top: 'puff', eyes: 'big', cheeks: true, sign: '±' },
    provisional: true,
    album: EVENTS_ALBUM,
    guest: 'navidad',
  },
  {
    id: 'problemus-roseta',
    family: 'problemus',
    skill: 'word-problems-within-10',
    name: { es: 'Problemus Roseta', ca: 'Problemus Roseta' },
    description: { es: 'Huele a rosa y siempre lleva un cuento.', ca: 'Fa olor de rosa i sempre porta un conte.' },
    hp: 30,
    sprite: 'creature-problemus-roseta',
    look: { ramp: 'rosa', body: 'pear', top: 'sprout', eyes: 'big', cheeks: true, sign: '±' },
    provisional: true,
    album: EVENTS_ALBUM,
    guest: 'sant-jordi',
  },
  {
    id: 'problemus-solete',
    family: 'problemus',
    skill: 'word-problems-within-10',
    name: { es: 'Problemus Solete', ca: 'Problemus Solet' },
    description: { es: 'Sale cuando acaba el curso y se va de vacaciones contigo.', ca: 'Surt quan acaba el curs i se\'n va de vacances amb tu.' },
    hp: 30,
    sprite: 'creature-problemus-solete',
    look: { ramp: 'amarillo', body: 'round', top: 'antenna', eyes: 'big', sign: '±' },
    provisional: true,
    album: EVENTS_ALBUM,
    guest: 'fin-de-curso',
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
    for (const problem of validateLook(c.look)) errors.push(`${c.id}: ${problem}`);
    const familyOperator = FAMILIES.find((f) => f.id === c.family)?.operator;
    if (c.look.sign !== (familyOperator === 'mixed' ? '±' : familyOperator)) {
      errors.push(`${c.id}: el símbolo «${c.look.sign}» no es el de la familia ${c.family}`);
    }
    if (!Number.isInteger(c.hp) || c.hp <= 0) errors.push(`${c.id}: la vida tiene que ser un entero positivo`);
    if ((c.guest !== undefined) !== (c.album === EVENTS_ALBUM)) errors.push(`${c.id}: solo las invitadas van en la página de eventos`);
  }
  return errors;
}

/** Las criaturas con las que se practica una habilidad (puede haber varias). Las invitadas nunca. */
export function creaturesForSkill(skill: SkillId): CreatureDefinition[] {
  return CREATURES.filter((c) => c.skill === skill && c.guest === undefined);
}
