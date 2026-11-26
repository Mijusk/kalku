import type { Localized } from '@kalku/exercises';
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

export type StepId =
  | 'prologue'
  | 'create'
  | 'training'
  | 'first-rescue'
  | 'meet-bruno'
  | 'planks'
  | 'bruno-fix'
  | 'meet-lina'
  | 'crystals'
  | 'lina-light'
  | 'meet-pedrolo'
  | 'riddles'
  | 'boss';

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

export const CHAPTERS: readonly { chapter: number; title: Localized }[] = [
  { chapter: 1, title: { es: 'La chispa', ca: "L'espurna" } },
  { chapter: 2, title: { es: 'El puente roto', ca: 'El pont trencat' } },
  { chapter: 3, title: { es: 'La cueva sin luz', ca: 'La cova sense llum' } },
  { chapter: 4, title: { es: 'La Puerta de Piedra', ca: 'La Porta de Pedra' } },
  { chapter: 5, title: { es: 'El Gran Borrón', ca: 'El Gran Borrón' } },
];

export const STORY: readonly StoryStep[] = [
  { id: 'prologue', chapter: 1, kind: 'prologue', intro: 'prologue', objective: { es: 'Despierta', ca: 'Desperta’t' } },
  { id: 'create', chapter: 1, kind: 'create', intro: 'uni-hello', objective: { es: 'Crea tu personaje', ca: 'Crea el teu personatge' } },
  {
    id: 'training',
    chapter: 1,
    kind: 'training',
    npc: 'tecla',
    intro: 'tecla-training',
    outro: 'tecla-training-done',
    objective: { es: 'Entrena con la abuela Tecla', ca: "Entrena amb l'àvia Tecla" },
  },
  {
    id: 'first-rescue',
    chapter: 1,
    kind: 'firstRescue',
    outro: 'first-rescue-done',
    objective: { es: 'Ayuda al Sumus Brote asustado', ca: 'Ajuda el Sumus Brot espantat' },
  },
  {
    id: 'meet-bruno',
    chapter: 2,
    kind: 'talk',
    npc: 'bruno',
    outro: 'bruno-planks',
    objective: { es: 'Habla con Bruno junto al río', ca: 'Parla amb en Bruno vora el riu' },
  },
  {
    id: 'planks',
    chapter: 2,
    kind: 'collect',
    count: 3,
    item: 'plank',
    objective: { es: 'Devuelve la chispa a las criaturas y recupera los tablones', ca: "Torna l'espurna a les criatures i recupera els taulons" },
  },
  {
    id: 'bruno-fix',
    chapter: 2,
    kind: 'talk',
    npc: 'bruno',
    outro: 'bruno-fixes',
    opensZone: 'puente-roto',
    objective: { es: 'Lleva los tablones a Bruno', ca: 'Porta els taulons a en Bruno' },
  },
  {
    id: 'meet-lina',
    chapter: 3,
    kind: 'talk',
    npc: 'lina',
    outro: 'lina-cave',
    opensZone: 'cueva',
    objective: { es: 'Busca a Lina en la cueva', ca: 'Busca la Lina a la cova' },
  },
  {
    id: 'crystals',
    chapter: 3,
    kind: 'crystals',
    count: 3,
    item: 'crystal',
    objective: { es: 'Enciende los cristales de la cueva', ca: 'Encén els cristalls de la cova' },
  },
  {
    id: 'lina-light',
    chapter: 3,
    kind: 'talk',
    npc: 'lina',
    outro: 'lina-light',
    objective: { es: 'Cuéntaselo a Lina', ca: "Explica-ho a la Lina" },
  },
  {
    id: 'meet-pedrolo',
    chapter: 4,
    kind: 'talk',
    npc: 'pedrolo',
    outro: 'pedrolo-riddles',
    objective: { es: 'Ve a la Puerta de Piedra', ca: 'Ves a la Porta de Pedra' },
  },
  {
    id: 'riddles',
    chapter: 4,
    kind: 'riddles',
    npc: 'pedrolo',
    count: 3,
    item: 'rune',
    outro: 'pedrolo-opens',
    opensZone: 'puerta-de-piedra',
    objective: { es: 'Resuelve los acertijos de Pedrolo', ca: 'Resol les endevinalles d’en Pedrolo' },
  },
  {
    id: 'boss',
    chapter: 5,
    kind: 'boss',
    intro: 'borron-appears',
    outro: 'finale',
    objective: { es: 'Encuentra al Gran Borrón en el claro del este', ca: "Troba el Gran Borrón a la clariana de l'est" },
  },
];

/** Nombre de los objetos de las misiones (para «¡Has encontrado un tablón!»). */
export const ITEMS: Readonly<Record<ItemId, { one: Localized; found: Localized }>> = {
  plank: { one: { es: 'Tablón', ca: 'Tauló' }, found: { es: '¡Has recuperado un tablón!', ca: 'Has recuperat un tauló!' } },
  crystal: { one: { es: 'Cristal', ca: 'Cristall' }, found: { es: '¡Cristal encendido!', ca: 'Cristall encès!' } },
  rune: { one: { es: 'Acertijo', ca: 'Endevinalla' }, found: { es: '¡Acertijo resuelto!', ca: 'Endevinalla resolta!' } },
};

/** En qué va el niño. `step` = índice en `STORY`; igual a `STORY.length` = historia terminada. */
export interface StoryState {
  step: number;
  /** Cuántas veces se ha cumplido el paso actual (tablones, cristales, acertijos). */
  count: number;
  /** Cristales encendidos (índices 0–2). */
  crystals: number[];
}

export const NEW_STORY: StoryState = { step: 0, count: 0, crystals: [] };

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
  return STORY[state.step];
}

export function isStoryDone(state: StoryState): boolean {
  return state.step >= STORY.length;
}

/** Capítulos ya terminados (0–5): cuánto color ha recuperado el pueblo. */
export function chaptersDone(state: StoryState): number {
  const step = currentStep(state);
  if (!step) return CHAPTERS.length;
  return step.chapter - 1;
}

/** Zonas que la historia ya ha abierto. */
export function zonesOpenedByStory(state: StoryState): string[] {
  return STORY.slice(0, Math.min(state.step, STORY.length))
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
    return { state: { ...state, count: have, crystals }, changed: true, scenes: [], ...(item ? { item } : {}) };
  }

  // Paso cumplido: se pasa al siguiente.
  const nextIndex = state.step + 1;
  const next = STORY[nextIndex];
  const scenes: SceneId[] = [];
  if (step.outro) scenes.push(step.outro);
  const outcome: StoryOutcome = {
    state: { step: nextIndex, count: 0, crystals: next?.kind === 'crystals' ? [] : crystals },
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

/** Lee el estado guardado. Lo que no sea válido vuelve al principio o se corrige. */
export function parseStory(raw: unknown, fallback: StoryState = NEW_STORY): StoryState {
  if (typeof raw !== 'object' || raw === null) return { ...fallback, crystals: [...fallback.crystals] };
  const r = raw as Record<string, unknown>;
  const step = typeof r.step === 'number' && Number.isInteger(r.step) ? Math.min(Math.max(0, r.step), STORY.length) : fallback.step;
  const current = STORY[step];
  const max = current?.count ?? 1;
  const count = typeof r.count === 'number' && Number.isInteger(r.count) ? Math.min(Math.max(0, r.count), Math.max(0, max - 1)) : 0;
  const crystals =
    current?.kind === 'crystals' && Array.isArray(r.crystals)
      ? [...new Set(r.crystals.filter((c): c is number => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < max))].slice(0, max - 1)
      : [];
  return { step, count, crystals };
}

/** Índice de un paso por su id (para empezar a mitad, en pruebas o al migrar guardados antiguos). */
export function stepIndex(id: StepId): number {
  return STORY.findIndex((s) => s.id === id);
}

/** Comprueba los datos de la historia: ids únicos, capítulos en orden, contadores y textos es/ca. */
export function validateStory(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  let chapter = 1;
  for (const step of STORY) {
    if (ids.has(step.id)) errors.push(`Paso repetido: ${step.id}`);
    ids.add(step.id);
    if (step.chapter < chapter || step.chapter > chapter + 1) errors.push(`${step.id}: capítulo fuera de orden`);
    chapter = step.chapter;
    if (step.objective.es.trim() === '' || step.objective.ca.trim() === '') errors.push(`${step.id}: falta el objetivo en es o ca`);
    if (['collect', 'crystals', 'riddles'].includes(step.kind) && !(step.count && step.count > 0)) errors.push(`${step.id}: falta el contador`);
    if (step.kind === 'talk' && !step.npc) errors.push(`${step.id}: ¿con quién se habla?`);
  }
  return errors;
}
