import { isMastered, type MasteryProfile, type Slot } from './mastery.js';
import type { Rng } from './rng.js';
import { SKILLS } from './skills.js';
import type { SkillId } from './types.js';

/**
 * Mezcla de un combate (documento de diseño): 60 % habilidad actual,
 * 25 % repaso de lo ya dominado y 15 % reto de la siguiente.
 */
export const SLOT_WEIGHTS: Record<Slot, number> = {
  current: 0.6,
  review: 0.25,
  challenge: 0.15,
};

export interface SkillPick {
  skill: SkillId;
  slot: Slot;
}

/**
 * Habilidad actual: la primera del currículo que aún no está dominada y
 * cuyos requisitos sí lo están. Si todo está dominado, la última.
 */
export function currentSkill(profile: MasteryProfile): SkillId {
  for (const skill of SKILLS) {
    if (isMastered(profile[skill.id])) continue;
    if (skill.prerequisites.every((p) => isMastered(profile[p]))) return skill.id;
  }
  const last = SKILLS[SKILLS.length - 1];
  if (!last) throw new Error('No hay habilidades definidas');
  return last.id;
}

/** La siguiente habilidad en el currículo después de la actual, si existe. */
export function challengeSkill(profile: MasteryProfile): SkillId | undefined {
  const index = SKILLS.findIndex((s) => s.id === currentSkill(profile));
  return SKILLS[index + 1]?.id;
}

export function masteredSkills(profile: MasteryProfile): SkillId[] {
  return SKILLS.filter((s) => isMastered(profile[s.id])).map((s) => s.id);
}

/**
 * Elige la habilidad del próximo ejercicio. Si no hay nada que repasar o
 * no hay siguiente habilidad, se usa la actual.
 */
export function pickSkill(profile: MasteryProfile, rng: Rng): SkillPick {
  const current = currentSkill(profile);
  const roll = rng.next();

  if (roll < SLOT_WEIGHTS.current) return { skill: current, slot: 'current' };

  if (roll < SLOT_WEIGHTS.current + SLOT_WEIGHTS.review) {
    const review = masteredSkills(profile).filter((s) => s !== current);
    return review.length > 0 ? { skill: rng.pick(review), slot: 'review' } : { skill: current, slot: 'current' };
  }

  const challenge = challengeSkill(profile);
  return challenge ? { skill: challenge, slot: 'challenge' } : { skill: current, slot: 'current' };
}
