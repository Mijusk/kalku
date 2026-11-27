import {
  dateKey,
  missionsFor,
  REGION_STORIES,
  refreshMissions,
  regionIndex,
  regionStory,
  stepsOf,
  zonesOpenedByStory,
  type StoryState,
} from '@kalku/content';
import { SKILL_IDS } from '@kalku/exercises';
import type { PlayerProgress } from '../progress';

/**
 * Atajos de desarrollo (solo en local y en las vistas previas, nunca en la
 * web publicada: ver `devTools.ts`). Cambian el progreso que reciben y no
 * guardan: quien llama guarda y recarga el mapa.
 */

/** Abre las zonas que la historia ya habría abierto hasta `story` (y las de las regiones anteriores). */
function openStoryZones(progress: PlayerProgress, story: StoryState): void {
  const zones = new Set(progress.zonesOpened);
  const upTo = regionIndex(regionStory(story.region).id);
  for (const region of REGION_STORIES.slice(0, upTo)) {
    for (const z of zonesOpenedByStory({ region: region.id, step: region.steps.length, count: 0, crystals: [] })) zones.add(z);
  }
  for (const z of zonesOpenedByStory(story)) zones.add(z);
  progress.zonesOpened = [...zones];
}

/** Salta el paso actual de la historia (la región más avanzada). false si ya estaba terminada. */
export function skipStep(progress: PlayerProgress): boolean {
  const steps = stepsOf(progress.story);
  if (progress.story.step >= steps.length) return false;
  setStep(progress, progress.story.step + 1);
  return true;
}

/** Termina la historia de la región más avanzada (abre el camino a la siguiente). */
export function finishRegion(progress: PlayerProgress): boolean {
  const steps = stepsOf(progress.story);
  if (progress.story.step >= steps.length) return false;
  setStep(progress, steps.length);
  return true;
}

function setStep(progress: PlayerProgress, step: number): void {
  progress.story = { region: regionStory(progress.story.region).id, step, count: 0, crystals: [] };
  // Saltarse el prólogo o la prueba de nivel no tiene que volver a pedirlos.
  progress.placementDone = true;
  progress.at = progress.story.region ?? progress.at;
  openStoryZones(progress, progress.story);
}

/**
 * Va a una región. Si está por delante de la historia, la empieza desde el
 * principio (las anteriores cuentan como terminadas). Devuelve true si es la
 * primera vez que se llega (para contar la llegada).
 */
export function jumpToRegion(progress: PlayerProgress, id: string): boolean {
  const target = regionIndex(id);
  if (target < 0) throw new RangeError(`Región desconocida: ${id}`);
  const first = target > regionIndex(regionStory(progress.story.region).id);
  if (first) {
    progress.story = { region: id, step: 0, count: 0, crystals: [] };
    progress.placementDone = true;
  }
  progress.at = id;
  openStoryZones(progress, progress.story);
  return first;
}

/** Da por hecho el encargo en curso: suma sus Cifras y lo quita (el mapa crea el siguiente). */
export function completeQuest(progress: PlayerProgress): boolean {
  if (!progress.quest) return false;
  progress.coins += progress.quest.reward;
  progress.quest = null;
  return true;
}

/** Completa las misiones de hoy y de la semana y da sus premios (una vez). */
export function completeMissions(progress: PlayerProgress, now: Date = new Date()): number {
  const day = dateKey(now);
  const state = refreshMissions(progress.missions, day);
  let given = 0;
  for (const mission of missionsFor(day)) {
    state.progress[mission.id] = mission.need;
    if (state.claimed.includes(mission.id)) continue;
    state.claimed = [...state.claimed, mission.id];
    progress.coins += mission.reward;
    given += 1;
  }
  progress.missions = { ...state, progress: { ...state.progress } };
  return given;
}

/** Todas las habilidades dominadas, con su gema. */
export function masterAll(progress: PlayerProgress): void {
  const profile = { ...progress.profile };
  for (const id of SKILL_IDS) {
    const skill = profile[id];
    profile[id] = { mastery: 100, attempts: Math.max(skill.attempts, 10), correct: Math.max(skill.correct, 10) };
  }
  progress.profile = profile;
  progress.gems = [...SKILL_IDS];
}
