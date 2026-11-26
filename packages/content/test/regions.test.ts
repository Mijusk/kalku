import { generateRegion, REGIONS } from '@kalku/world';
import { describe, expect, it } from 'vitest';
import {
  advanceStory,
  currentStep,
  NEW_STORY,
  parseStory,
  PRADERA_UNO_STORY,
  REGION_STORIES,
  regionStory,
  stepIndex,
  validateStory,
  type Anchor,
  type RegionStory,
} from '../src/index.js';

describe('historia por regiones', () => {
  it('todas las regiones son válidas', () => {
    expect(validateStory()).toEqual([]);
  });

  it('cada región de la historia tiene su mapa y todo lo que pone en él existe', () => {
    for (const story of REGION_STORIES) {
      const spec = REGIONS.find((r) => r.id === story.id);
      expect(spec, story.id).toBeDefined();
      if (!spec) continue;
      const map = generateRegion(spec, 42);
      const resolve = (a: Anchor) =>
        a.place
          ? map.places.find((p) => p.id === a.place)
          : a.zone
            ? map.places.find((p) => p.zone === a.zone)
            : map.places.find((p) => p.zone === a.gate)?.gate;
      for (const [npc, anchor] of Object.entries(story.npcs)) expect(resolve(anchor), `${story.id}: ${npc}`).toBeDefined();
      for (const light of story.lights) expect(resolve(light)).toBeDefined();
      // Las luces de Pradera Uno están dentro de la cueva, donde estaban en el hito 3.
      if (story.id === 'pradera-uno') {
        const cave = map.places.find((p) => p.zone === 'cueva');
        expect(story.lights.map((l) => ({ x: (resolve(l)?.x ?? 0) + l.dx, y: (resolve(l)?.y ?? 0) + l.dy }))).toEqual(
          [1, 3, 5].map((dx) => ({ x: (cave?.x ?? -1) + dx, y: (cave?.y ?? -1) + 1 })),
        );
      }
    }
  });

  it('un guardado del hito 3 (sin región) sigue en Pradera Uno sin perder nada', () => {
    const old = { step: stepIndex('crystals'), count: 1, crystals: [2] };
    const state = parseStory(old);
    expect(state).toEqual({ region: 'pradera-uno', ...old });
    expect(currentStep(state)?.id).toBe('crystals');
    // Y sigue avanzando igual.
    const next = advanceStory(old, { type: 'battleWon', where: 'crystal', crystal: 0 });
    expect(next.state.region).toBe('pradera-uno');
    expect(next.state.crystals).toEqual([2, 0]);
  });

  it('una región desconocida en el guardado vuelve a la primera', () => {
    expect(parseStory({ region: 'no-existe', step: 2 }).region).toBe('pradera-uno');
    expect(regionStory('no-existe')).toBe(PRADERA_UNO_STORY);
    expect(NEW_STORY.region).toBe('pradera-uno');
  });

  it('una región nueva se valida solo con sus datos', () => {
    const test: RegionStory = {
      id: 'region-de-prueba',
      name: { es: 'Prueba', ca: 'Prova' },
      chapters: [{ chapter: 1, title: { es: 'Uno', ca: 'U' } }],
      steps: [
        { id: 'hablar', chapter: 1, kind: 'talk', npc: 'bruno', objective: { es: 'Habla', ca: 'Parla' } },
        { id: 'recoger', chapter: 1, kind: 'collect', count: 2, item: 'plank', objective: { es: 'Recoge', ca: 'Recull' } },
      ],
      npcs: { bruno: { place: 'pueblo', dx: 0, dy: 0 } },
      lights: [],
      firstCreature: 'sumus-brote',
      boss: 'borron',
    };
    expect(validateStory([test])).toEqual([]);
    expect(validateStory([{ ...test, npcs: {}, next: 'otra' }])).toEqual([
      'region-de-prueba: hablar: bruno no está en el mapa',
      'region-de-prueba: la región siguiente «otra» no existe',
    ]);
  });
});
