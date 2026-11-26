import { advanceMissions, dateKey, missionsFor, refreshMissions, type Mission, type MissionEvent } from '@kalku/content';
import type { PlayerProgress } from './progress';

/**
 * Misiones del día y de la semana (#98) sobre el progreso del niño. Iguales
 * para todos los niños el mismo día (y así, para toda la clase).
 */
export function todaysMissions(now: Date = new Date()): Mission[] {
  return missionsFor(dateKey(now));
}

/**
 * Aplica un evento a las misiones de hoy sobre `progress` (lo modifica; quien
 * llama guarda). Suma las Cifras de las que se terminan ahora y las devuelve.
 */
export function applyMissionEvent(progress: PlayerProgress, event: MissionEvent, now: Date = new Date()): Mission[] {
  const day = dateKey(now);
  const state = refreshMissions(progress.missions, day);
  const { state: next, completed } = advanceMissions(state, missionsFor(day), event);
  progress.missions = next;
  for (const m of completed) progress.coins += m.reward;
  return completed;
}

/** Cuánto lleva en cada misión de hoy. */
export function missionProgress(progress: PlayerProgress, now: Date = new Date()): { mission: Mission; have: number; done: boolean }[] {
  const day = dateKey(now);
  const state = refreshMissions(progress.missions, day);
  return missionsFor(day).map((mission) => ({
    mission,
    have: Math.min(mission.need, state.progress[mission.id] ?? 0),
    done: state.claimed.includes(mission.id),
  }));
}
