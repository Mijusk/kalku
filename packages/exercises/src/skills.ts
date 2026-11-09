import type { Localized, SkillId, SkillOperator } from './types.js';

export interface SkillDefinition {
  id: SkillId;
  operator: SkillOperator;
  /** Nombre para paneles de familias y docentes. */
  name: Localized;
  /** Curso orientativo (LOMLOE). */
  grade: string;
  /** Habilidades que conviene dominar antes. */
  prerequisites: SkillId[];
}

/**
 * Currículo de la fase 1, en orden. El índice + 1 es la dificultad base.
 * Para añadir una habilidad: añadirla a `SkillId` (types.ts), aquí, y su
 * generador en generators.ts. Los tests comprueban que todas tienen uno.
 */
export const SKILLS: readonly SkillDefinition[] = [
  {
    id: 'add-within-10',
    operator: '+',
    name: { es: 'Sumas hasta 10', ca: 'Sumes fins a 10' },
    grade: '1.º',
    prerequisites: [],
  },
  {
    id: 'sub-within-10',
    operator: '-',
    name: { es: 'Restas hasta 10', ca: 'Restes fins a 10' },
    grade: '1.º',
    prerequisites: ['add-within-10'],
  },
  {
    id: 'add-within-20-no-carry',
    operator: '+',
    name: { es: 'Sumas hasta 20 sin llevar', ca: 'Sumes fins a 20 sense portar' },
    grade: '1.º',
    prerequisites: ['add-within-10'],
  },
  {
    id: 'sub-within-20-no-borrow',
    operator: '-',
    name: { es: 'Restas hasta 20 sin llevar', ca: 'Restes fins a 20 sense portar' },
    grade: '1.º',
    prerequisites: ['sub-within-10', 'add-within-20-no-carry'],
  },
  {
    id: 'add-within-20-carry',
    operator: '+',
    name: { es: 'Sumas hasta 20 llevando', ca: 'Sumes fins a 20 portant' },
    grade: '1.º–2.º',
    prerequisites: ['add-within-20-no-carry'],
  },
  {
    id: 'sub-within-20-borrow',
    operator: '-',
    name: { es: 'Restas hasta 20 llevando', ca: 'Restes fins a 20 portant' },
    grade: '1.º–2.º',
    prerequisites: ['sub-within-20-no-borrow', 'add-within-20-carry'],
  },
  // Al final para no mover la dificultad de las demás: la prueba de nivel la trata como la más difícil.
  {
    id: 'word-problems-within-10',
    operator: 'mixed',
    name: { es: 'Problemas hasta 10', ca: 'Problemes fins a 10' },
    grade: '1.º',
    prerequisites: ['add-within-10', 'sub-within-10'],
  },
];

export const SKILL_IDS: readonly SkillId[] = SKILLS.map((s) => s.id);

export function getSkill(id: SkillId): SkillDefinition {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Habilidad desconocida: ${id}`);
  return skill;
}

/** Dificultad base (1–7) según la posición en el currículo. */
export function skillDifficulty(id: SkillId): number {
  return SKILL_IDS.indexOf(id) + 1;
}
