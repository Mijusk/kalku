import type Phaser from 'phaser';
import {
  advanceQuest,
  advanceStory,
  currentStep,
  isStoryDone,
  nextQuest,
  QUEST_TEMPLATES,
  regionStory,
  sceneLines,
  storyIn,
  type Quest,
  type QuestEvent,
  type SceneId,
  type StoryEvent,
  type StoryOutcome,
} from '@kalku/content';
import { createRng, randomSeed } from '@kalku/exercises';
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
  // En una región ya terminada (de vuelta a la pradera) la historia no avanza.
  if (regionStory(progress.at).id !== regionStory(progress.story.region).id) return { state: progress.story, changed: false, scenes: [] };
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
    await playDialog(sceneLines(id, progress.band), {
      locale: progress.locale,
      nickname: nickname(),
      voice: progress.settings.autoVoice,
      ...options,
    });
  }
}

/**
 * Va a la pantalla que toca según la historia: curso → prólogo → apodo (si no hay
 * cuenta) → crear personaje → entrenamiento → mapa.
 */
export async function goToStory(scene: Phaser.Scene): Promise<void> {
  const progress = loadProgress();
  const step = currentStep(progress.story);
  // Al empezar, el curso elige el tono de la historia (antes del prólogo, que ya cambia).
  if (step?.kind === 'prologue' && progress.grade === null) return void scene.scene.start('grade');
  if (step?.kind === 'prologue') return void scene.scene.start('prologue');
  if (await needsNickname(appBackend(), localStorage)) return void scene.scene.start('nickname');
  if (step?.kind === 'create') return void scene.scene.start('create');
  if (step?.kind === 'training' && !progress.placementDone) return void scene.scene.start('placement');
  if (step?.kind === 'training') applyStoryEvent({ type: 'trained' }, progress);
  scene.scene.start('world');
}

/** Qué ha pasado con el encargo al aplicar un evento. */
export interface QuestOutcome {
  changed: boolean;
  /** El encargo terminado ahora (con sus Cifras ya sumadas). */
  done?: Quest;
  /** El encargo en curso tras el evento (el siguiente, si se terminó). */
  quest: Quest | null;
}

/** Encargos de los personajes que viven en la región donde está el niño. */
function regionQuests(progress: PlayerProgress): typeof QUEST_TEMPLATES {
  const npcs = regionStory(progress.at).npcs;
  return QUEST_TEMPLATES.filter((q) => npcs[q.npc] !== undefined);
}

/**
 * Encargos de los personajes (#97): solo cuando la historia de la región
 * donde está el niño ha terminado. Si no hay ninguno (o es de alguien de otra
 * región y aún no se había aceptado), se crea uno de aquí. Uno ya aceptado se
 * conserva aunque se cambie de región: no se pierde lo hecho. Al terminar uno
 * se suman sus Cifras y se crea el siguiente, de otro personaje.
 */
export function applyQuestEvent(event: QuestEvent | undefined, progress: PlayerProgress = loadProgress()): QuestOutcome {
  if (!isStoryDone(storyIn(progress.story, progress.at))) return { changed: false, quest: null };
  const templates = regionQuests(progress);
  if (templates.length === 0) return { changed: false, quest: progress.quest };
  let changed = false;
  const here = (npc: string): boolean => templates.some((q) => q.npc === npc);
  if (!progress.quest || (!progress.quest.accepted && !here(progress.quest.npc))) {
    progress.quest = nextQuest(createRng(randomSeed()), undefined, templates);
    changed = true;
  }
  let done: Quest | undefined;
  if (event) {
    const out = advanceQuest(progress.quest, event);
    if (out.changed) {
      changed = true;
      progress.quest = out.quest;
      if (out.done) {
        done = out.quest;
        progress.coins += out.quest.reward;
        progress.quest = nextQuest(createRng(randomSeed()), out.quest, templates);
      }
    }
  }
  if (changed) saveProgress(progress);
  return { changed, quest: progress.quest, ...(done ? { done } : {}) };
}
