import type Phaser from 'phaser';
import { advanceStory, currentStep, SCENES, type SceneId, type StoryEvent, type StoryOutcome } from '@kalku/content';
import { loadProgress, saveProgress, type PlayerProgress } from './progress';
import { appBackend, NICKNAME_KEY, needsNickname } from './sync';
import { playDialog } from './ui/DialogBox';

/**
 * Pegamento entre la historia (datos y lógica pura en `@kalku/content`) y
 * las escenas: aplica eventos, guarda y decide qué pantalla toca.
 */

/** El apodo del niño (solo el que eligió él; nunca un nombre real). */
export function nickname(): string | undefined {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Aplica un evento a la historia del progreso guardado y lo guarda. Si se
 * abre una zona, se apunta también en `zonesOpened`. Devuelve qué ha pasado.
 */
export function applyStoryEvent(event: StoryEvent, progress: PlayerProgress = loadProgress()): StoryOutcome {
  const outcome = advanceStory(progress.story, event);
  if (!outcome.changed) return outcome;
  progress.story = outcome.state;
  if (outcome.zoneOpened && !progress.zonesOpened.includes(outcome.zoneOpened)) {
    progress.zonesOpened = [...progress.zonesOpened, outcome.zoneOpened];
  }
  saveProgress(progress);
  return outcome;
}

/** Enseña los diálogos de la historia uno detrás de otro. */
export async function playScenes(ids: readonly SceneId[], options: { skippable?: boolean; onLine?: (index: number) => void } = {}): Promise<void> {
  for (const id of ids) {
    const progress = loadProgress();
    await playDialog(SCENES[id], {
      locale: progress.locale,
      nickname: nickname(),
      voice: progress.settings.autoVoice,
      ...options,
    });
  }
}

/**
 * Va a la pantalla que toca según la historia: prólogo → apodo (si no hay
 * cuenta) → crear personaje → entrenamiento → mapa.
 */
export async function goToStory(scene: Phaser.Scene): Promise<void> {
  const progress = loadProgress();
  const step = currentStep(progress.story);
  if (step?.kind === 'prologue') return void scene.scene.start('prologue');
  if (await needsNickname(appBackend(), localStorage)) return void scene.scene.start('nickname');
  if (step?.kind === 'create') return void scene.scene.start('create');
  if (step?.kind === 'training' && !progress.placementDone) return void scene.scene.start('placement');
  if (step?.kind === 'training') applyStoryEvent({ type: 'trained' }, progress);
  scene.scene.start('world');
}
