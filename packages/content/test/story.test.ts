import { describe, expect, it } from 'vitest';
import {
  advanceStory,
  chaptersDone,
  CHARACTERS,
  currentStep,
  fillText,
  isStoryDone,
  NEW_STORY,
  objectiveText,
  parseStory,
  SCENES,
  STORY,
  stepIndex,
  validateStory,
  zonesOpenedByStory,
  ZONES,
  type StoryEvent,
  type StoryState,
} from '../src/index.js';

/** Juega la historia entera con los eventos justos, como lo haría un niño. */
function playAll(): { state: StoryState; log: ReturnType<typeof advanceStory>[] } {
  const events: StoryEvent[] = [
    { type: 'prologueSeen' },
    { type: 'created' },
    { type: 'trained' },
    { type: 'battleWon', where: 'wild' },
    { type: 'talked', npc: 'bruno' },
    { type: 'battleWon', where: 'wild' },
    { type: 'battleWon', where: 'wild' },
    { type: 'battleWon', where: 'wild' },
    { type: 'talked', npc: 'bruno' },
    { type: 'talked', npc: 'lina' },
    { type: 'battleWon', where: 'crystal', crystal: 2 },
    { type: 'battleWon', where: 'crystal', crystal: 0 },
    { type: 'battleWon', where: 'crystal', crystal: 1 },
    { type: 'talked', npc: 'lina' },
    { type: 'talked', npc: 'pedrolo' },
    { type: 'riddleSolved' },
    { type: 'riddleSolved' },
    { type: 'riddleSolved' },
    { type: 'battleWon', where: 'boss' },
  ];
  let state = NEW_STORY;
  const log = [];
  for (const e of events) {
    const out = advanceStory(state, e);
    expect(out.changed, JSON.stringify(e)).toBe(true);
    log.push(out);
    state = out.state;
  }
  return { state, log };
}

describe('datos de la historia', () => {
  it('son válidos', () => {
    expect(validateStory()).toEqual([]);
  });

  it('todos los diálogos existen en castellano y catalán', () => {
    for (const [id, lines] of Object.entries(SCENES)) {
      expect(lines.length, id).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.text.es.trim(), id).not.toBe('');
        expect(line.text.ca.trim(), id).not.toBe('');
        expect(CHARACTERS.some((c) => c.id === line.who), id).toBe(true);
      }
    }
  });

  it('cada paso apunta a escenas y zonas que existen', () => {
    for (const step of STORY) {
      for (const scene of [step.intro, step.outro]) if (scene) expect(SCENES[scene], `${step.id} → ${scene}`).toBeDefined();
      if (step.opensZone) expect(ZONES.some((z) => z.id === step.opensZone), step.id).toBe(true);
    }
  });
});

describe('advanceStory', () => {
  it('se puede jugar de principio a fin', () => {
    const { state, log } = playAll();
    expect(isStoryDone(state)).toBe(true);
    expect(log.at(-1)?.finished).toBe(true);
    expect(log.at(-1)?.scenes).toContain('finale');
    expect(chaptersDone(state)).toBe(5);
  });

  it('abre las tres zonas en orden: puente, cueva y puerta', () => {
    const { log } = playAll();
    expect(log.map((o) => o.zoneOpened).filter(Boolean)).toEqual(['puente-roto', 'cueva', 'puerta-de-piedra']);
  });

  it('avisa de cada capítulo terminado una vez', () => {
    const { log } = playAll();
    expect(log.map((o) => o.chapterDone).filter((c) => c !== undefined)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cuenta los tablones de uno en uno', () => {
    let state: StoryState = { step: stepIndex('planks'), count: 0, crystals: [] };
    const first = advanceStory(state, { type: 'battleWon', where: 'wild' });
    expect(first.item).toEqual({ id: 'plank', have: 1, need: 3 });
    state = first.state;
    expect(objectiveText(state, 'es')?.counter).toBe('1/3');
  });

  it('un cristal ya encendido no cuenta dos veces', () => {
    const start: StoryState = { step: stepIndex('crystals'), count: 0, crystals: [] };
    const once = advanceStory(start, { type: 'battleWon', where: 'crystal', crystal: 1 });
    const twice = advanceStory(once.state, { type: 'battleWon', where: 'crystal', crystal: 1 });
    expect(twice.changed).toBe(false);
    expect(twice.state).toBe(once.state);
  });

  it('hablar con quien no toca no cambia nada', () => {
    const state: StoryState = { step: stepIndex('meet-bruno'), count: 0, crystals: [] };
    expect(advanceStory(state, { type: 'talked', npc: 'lina' }).changed).toBe(false);
    expect(advanceStory(state, { type: 'battleWon', where: 'boss' }).changed).toBe(false);
  });

  it('no muta el estado que recibe', () => {
    const state: StoryState = { step: stepIndex('crystals'), count: 0, crystals: [] };
    const copy = structuredClone(state);
    advanceStory(state, { type: 'battleWon', where: 'crystal', crystal: 0 });
    expect(state).toEqual(copy);
  });

  it('perder nunca hace retroceder: no hay evento de derrota y ningún evento baja el paso', () => {
    const all: StoryEvent[] = [
      { type: 'prologueSeen' },
      { type: 'created' },
      { type: 'trained' },
      { type: 'battleWon', where: 'wild' },
      { type: 'battleWon', where: 'crystal', crystal: 0 },
      { type: 'battleWon', where: 'boss' },
      { type: 'talked', npc: 'tecla' },
      { type: 'riddleSolved' },
    ];
    for (let step = 0; step <= STORY.length; step++) {
      for (const e of all) {
        const out = advanceStory({ step, count: 0, crystals: [] }, e);
        expect(out.state.step).toBeGreaterThanOrEqual(step);
      }
    }
  });
});

describe('estado guardado', () => {
  it('corrige lo que no es válido', () => {
    expect(parseStory(undefined)).toEqual(NEW_STORY);
    expect(parseStory({ step: -3 })).toEqual(NEW_STORY);
    expect(parseStory({ step: 999 }).step).toBe(STORY.length);
    expect(parseStory({ step: stepIndex('planks'), count: 99 }).count).toBe(2);
    expect(parseStory({ step: stepIndex('crystals'), crystals: [0, 0, 7, 'x'] }).crystals).toEqual([0]);
  });

  it('las zonas abiertas salen del paso', () => {
    expect(zonesOpenedByStory(NEW_STORY)).toEqual([]);
    expect(zonesOpenedByStory({ step: stepIndex('meet-lina'), count: 0, crystals: [] })).toEqual(['puente-roto']);
    expect(zonesOpenedByStory({ step: STORY.length, count: 0, crystals: [] })).toHaveLength(3);
  });

  it('la tarjeta de misión dice qué toca', () => {
    expect(currentStep(NEW_STORY)?.kind).toBe('prologue');
    expect(objectiveText({ step: stepIndex('meet-bruno'), count: 0, crystals: [] }, 'ca')?.title).toContain('Bruno');
    expect(objectiveText({ step: STORY.length, count: 0, crystals: [] }, 'es')).toBeUndefined();
  });
});

describe('fillText', () => {
  it('pone el apodo y, si no hay, «Calculista»', () => {
    expect(fillText('¡Hola, {apodo}!', 'Luna', 'es')).toBe('¡Hola, Luna!');
    expect(fillText('Hola, {apodo}!', undefined, 'ca')).toBe('Hola, Calculista!');
  });
});
