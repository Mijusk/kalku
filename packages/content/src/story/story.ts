import type { Localized } from '@kalku/exercises';
import { FIRST_REGION, REGION_STORIES, regionStory, type RegionStory } from './regions.js';
import type { CharacterId, SceneId } from './scenes.js';

/**
 * La historia de Pradera Uno como una lista de pasos (guion en docs/HISTORIA.md).
 * El estado del niño es solo en qué paso va, un contador y unas marcas: todo
 * lo demás sale de estos datos. Las funciones son puras y no mutan nada.
 *
 * Reglas que se cumplen aquí (y tienen test):
 * - Solo se avanza acertando (ganando combates, resolviendo acertijos) o hablando.
 * - Perder un combate no es un evento: nunca hace retroceder la historia.
 * - Ningún paso se cumple con monedas.
 */

export type StepKind =
  /** Viñetas del principio. */
  | 'prologue'
  /** Crear el personaje. */
  | 'create'
  /** Entrenamiento con la abuela (la prueba de nivel). */
  | 'training'
  /** Primer combate guiado. */
  | 'firstRescue'
  /** Ir a hablar con alguien. */
  | 'talk'
  /** Ganar combates en la pradera; cada uno da un objeto (tablón). */
  | 'collect'
  /** Ganar el combate de cada cristal de la cueva. */
  | 'crystals'
  /** Resolver acertijos con el guardián. */
  | 'riddles'
  /** El jefe final. */
  | 'boss';

/** Id de un paso, único dentro de su región (por ejemplo «meet-bruno»). */
export type StepId = string;

export interface ChapterInfo {
  chapter: number;
  title: Localized;
}

export type ItemId = 'plank' | 'crystal' | 'rune';

export interface StoryStep {
  id: StepId;
  /** Capítulo (1–5). Al pasar al siguiente, el pueblo recupera color. */
  chapter: number;
  kind: StepKind;
  /** Con quién hay que hablar (pasos `talk`) o quién da la misión. */
  npc?: CharacterId;
  /** Diálogo que pone en marcha el paso; lo enseña la pantalla de ese paso (prólogo, entrenamiento, jefe…). */
  intro?: SceneId;
  /** Diálogo que sale al cumplir el paso. */
  outro?: SceneId;
  /** Cuántas veces hay que cumplirlo (tablones, cristales, acertijos). */
  count?: number;
  item?: ItemId;
  /** Zona del mapa que se abre al cumplir el paso (`ZONES`). */
  opensZone?: string;
  /** Lo que pone la tarjeta de misión. */
  objective: Localized;
}

/** Nombre de los objetos de las misiones (para «¡Has encontrado un tablón!»). */
export const ITEMS: Readonly<Record<ItemId, { one: Localized; found: Localized }>> = {
  plank: { one: { es: 'Tablón', ca: 'Tauló' }, found: { es: '¡Has recuperado un tablón!', ca: 'Has recuperat un tauló!' } },
  crystal: { one: { es: 'Cristal', ca: 'Cristall' }, found: { es: '¡Cristal encendido!', ca: 'Cristall encès!' } },
  rune: { one: { es: 'Acertijo', ca: 'Endevinalla' }, found: { es: '¡Acertijo resuelto!', ca: 'Endevinalla resolta!' } },
};

/** En qué va el niño. `step` = índice en los pasos de su región; igual a su longitud = historia terminada. */
export interface StoryState {
  /** Región de la historia (`REGION_STORIES`). Sin ella, la primera (guardados del hito 3). */
  region?: string;
  step: number;
  /** Cuántas veces se ha cumplido el paso actual (tablones, cristales, acertijos). */
  count: number;
  /** Cristales encendidos (índices 0–2). */
  crystals: number[];
}

export const NEW_STORY: StoryState = { region: FIRST_REGION, step: 0, count: 0, crystals: [] };

/** Pasos de la región en la que va el niño. */
export function stepsOf(state: StoryState): readonly StoryStep[] {
  return regionStory(state.region).steps;
}

export type StoryEvent =
  | { type: 'prologueSeen' }
  | { type: 'created' }
  | { type: 'trained' }
  | { type: 'battleWon'; where: 'wild' | 'crystal' | 'boss'; crystal?: number }
  | { type: 'talked'; npc: CharacterId }
  | { type: 'riddleSolved' };

/** Lo que pasa al aplicar un evento, para que el juego lo enseñe. */
export interface StoryOutcome {
  state: StoryState;
  /** Si ha cambiado algo. */
  changed: boolean;
  /** Diálogo que hay que enseñar ahora (el final del paso o el principio del siguiente). */
  scenes: SceneId[];
  /** Objeto conseguido y cuántos van. */
  item?: { id: ItemId; have: number; need: number };
  /** Capítulo terminado (el pueblo recupera color). */
  chapterDone?: number;
  /** Zona que se abre ahora. */
  zoneOpened?: string;
  /** Se ha terminado la historia. */
  finished?: boolean;
}

export function currentStep(state: StoryState): StoryStep | undefined {
  return stepsOf(state)[state.step];
}

export function isStoryDone(state: StoryState): boolean {
  return state.step >= stepsOf(state).length;
}

/** Capítulos ya terminados (0–5): cuánto color ha recuperado el pueblo. */
export function chaptersDone(state: StoryState): number {
  const step = currentStep(state);
  if (!step) return regionStory(state.region).chapters.length;
  return step.chapter - 1;
}

/** Zonas que la historia ya ha abierto. */
export function zonesOpenedByStory(state: StoryState): string[] {
  const steps = stepsOf(state);
  return steps.slice(0, Math.min(state.step, steps.length))
    .map((s) => s.opensZone)
    .filter((z): z is string => z !== undefined);
}

function matches(step: StoryStep, event: StoryEvent, state: StoryState): boolean {
  switch (step.kind) {
    case 'prologue':
      return event.type === 'prologueSeen';
    case 'create':
      return event.type === 'created';
    case 'training':
      return event.type === 'trained';
    case 'firstRescue':
      return event.type === 'battleWon' && event.where === 'wild';
    case 'talk':
      return event.type === 'talked' && event.npc === step.npc;
    case 'collect':
      return event.type === 'battleWon' && event.where === 'wild';
    case 'crystals':
      return (
        event.type === 'battleWon' &&
        event.where === 'crystal' &&
        event.crystal !== undefined &&
        Number.isInteger(event.crystal) &&
        event.crystal >= 0 &&
        event.crystal < (step.count ?? 0) &&
        !state.crystals.includes(event.crystal)
      );
    case 'riddles':
      return event.type === 'riddleSolved';
    case 'boss':
      return event.type === 'battleWon' && event.where === 'boss';
  }
}

/**
 * Aplica un evento a la historia. Si el evento no toca al paso actual, no
 * cambia nada (por ejemplo, hablar con Lina cuando toca Bruno). No muta `state`.
 */
export function advanceStory(state: StoryState, event: StoryEvent): StoryOutcome {
  const step = currentStep(state);
  if (!step || !matches(step, event, state)) return { state, changed: false, scenes: [] };

  const need = step.count ?? 1;
  const have = state.count + 1;
  const crystals = event.type === 'battleWon' && event.crystal !== undefined && step.kind === 'crystals' ? [...state.crystals, event.crystal] : state.crystals;
  const item = step.item ? { id: step.item, have, need } : undefined;

  if (have < need) {
    return { state: { ...withRegion(state), step: state.step, count: have, crystals }, changed: true, scenes: [], ...(item ? { item } : {}) };
  }

  // Paso cumplido: se pasa al siguiente.
  const nextIndex = state.step + 1;
  const next = stepsOf(state)[nextIndex];
  const scenes: SceneId[] = [];
  if (step.outro) scenes.push(step.outro);
  const outcome: StoryOutcome = {
    state: { ...withRegion(state), step: nextIndex, count: 0, crystals: next?.kind === 'crystals' ? [] : crystals },
    changed: true,
    scenes,
    ...(item ? { item } : {}),
  };
  if (!next || next.chapter > step.chapter) outcome.chapterDone = step.chapter;
  if (step.opensZone) outcome.zoneOpened = step.opensZone;
  if (!next) outcome.finished = true;
  return outcome;
}

/** Texto de la tarjeta de misión: objetivo y, si hay contador, «1/3». */
export function objectiveText(state: StoryState, locale: 'es' | 'ca'): { title: string; counter?: string; chapter: number } | undefined {
  const step = currentStep(state);
  if (!step) return undefined;
  const counter = step.count ? `${step.kind === 'crystals' ? state.crystals.length : state.count}/${step.count}` : undefined;
  return { title: step.objective[locale], chapter: step.chapter, ...(counter ? { counter } : {}) };
}

/** La región del estado, con la primera si es un guardado antiguo. */
function withRegion(state: StoryState): { region: string } {
  return { region: regionStory(state.region).id };
}

/** Lee el estado guardado. Lo que no sea válido vuelve al principio o se corrige. */
export function parseStory(raw: unknown, fallback: StoryState = NEW_STORY): StoryState {
  if (typeof raw !== 'object' || raw === null) return { ...withRegion(fallback), step: fallback.step, count: fallback.count, crystals: [...fallback.crystals] };
  const r = raw as Record<string, unknown>;
  // Guardados del hito 3: sin región, son de Pradera Uno.
  const region = regionStory(typeof r.region === 'string' ? r.region : undefined);
  const steps = region.steps;
  const step = typeof r.step === 'number' && Number.isInteger(r.step) ? Math.min(Math.max(0, r.step), steps.length) : fallback.step;
  const current = steps[step];
  const max = current?.count ?? 1;
  const count = typeof r.count === 'number' && Number.isInteger(r.count) ? Math.min(Math.max(0, r.count), Math.max(0, max - 1)) : 0;
  const crystals =
    current?.kind === 'crystals' && Array.isArray(r.crystals)
      ? [...new Set(r.crystals.filter((c): c is number => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < max))].slice(0, max - 1)
      : [];
  return { region: region.id, step, count, crystals };
}

/** Índice de un paso por su id en una región (para empezar a mitad, en pruebas o al migrar guardados antiguos). */
export function stepIndex(id: StepId, region: string = FIRST_REGION): number {
  return regionStory(region).steps.findIndex((s) => s.id === id);
}

/**
 * Comprueba los datos de la historia de cada región: ids únicos, capítulos en
 * orden y con título, contadores, textos es/ca, personajes y luces.
 */
export function validateStory(regions: readonly RegionStory[] = REGION_STORIES): string[] {
  const errors: string[] = [];
  const regionIds = new Set<string>();
  for (const region of regions) {
    const where = (msg: string): string => `${region.id}: ${msg}`;
    if (regionIds.has(region.id)) errors.push(where('región repetida'));
    regionIds.add(region.id);
    if (!region.name.es.trim() || !region.name.ca.trim()) errors.push(where('falta el nombre en es o ca'));
    if (region.steps.length === 0) errors.push(where('no tiene pasos'));
    const ids = new Set<string>();
    let chapter = 1;
    for (const step of region.steps) {
      if (ids.has(step.id)) errors.push(where(`paso repetido: ${step.id}`));
      ids.add(step.id);
      if (step.chapter < chapter || step.chapter > chapter + 1) errors.push(where(`${step.id}: capítulo fuera de orden`));
      chapter = step.chapter;
      if (!region.chapters.some((c) => c.chapter === step.chapter)) errors.push(where(`${step.id}: el capítulo ${step.chapter} no tiene título`));
      if (step.objective.es.trim() === '' || step.objective.ca.trim() === '') errors.push(where(`${step.id}: falta el objetivo en es o ca`));
      if (['collect', 'crystals', 'riddles'].includes(step.kind) && !(step.count && step.count > 0)) errors.push(where(`${step.id}: falta el contador`));
      if (step.kind === 'talk' && !step.npc) errors.push(where(`${step.id}: ¿con quién se habla?`));
      if (step.kind === 'talk' && step.npc && !region.npcs[step.npc]) errors.push(where(`${step.id}: ${step.npc} no está en el mapa`));
      if (step.kind === 'crystals' && (step.count ?? 0) > region.lights.length) errors.push(where(`${step.id}: hay menos luces que el contador`));
    }
    for (const c of region.chapters) if (!c.title.es.trim() || !c.title.ca.trim()) errors.push(where(`capítulo ${c.chapter}: falta el título en es o ca`));
    if (region.next !== undefined && !regions.some((r) => r.id === region.next)) errors.push(where(`la región siguiente «${region.next}» no existe`));
  }
  return errors;
}
