import { SKILLS, type SkillDefinition } from '@kalku/exercises';

/**
 * Gemas de dominio: una por habilidad, sacadas de `SKILLS` (nunca escritas a
 * mano). Solo se miran; no dan ventaja en el combate.
 */
export interface GemStatus {
  skill: SkillDefinition;
  earned: boolean;
}

/** Todas las habilidades, en orden de currículo, con si su gema está ganada. Ignora ids desconocidos. */
export function gemStatus(gems: readonly string[]): GemStatus[] {
  const earned = new Set(gems);
  return SKILLS.map((skill) => ({ skill, earned: earned.has(skill.id) }));
}
