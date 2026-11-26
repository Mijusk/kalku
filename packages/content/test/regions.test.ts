import { MAP_SPRITES } from '@kalku/art';
import { generateRegion, isWalkable, REGIONS } from '@kalku/world';
import { describe, expect, it } from 'vitest';
import {
  advanceStory,
  currentStep,
  isStoryDone,
  NEW_STORY,
  parseAt,
  parseStory,
  regionOpen,
  storyIn,
  travel,
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
      const map = generateRegion(spec, spec.seed);
      const resolve = (a: Anchor) =>
        a.entrance
          ? map.entrance
          : a.place
            ? map.places.find((p) => p.id === a.place)
            : a.zone
              ? map.places.find((p) => p.zone === a.zone)
              : map.places.find((p) => p.zone === a.gate)?.gate;
      // Todo lo que hay que pisar (personajes, luces, carteles) está en una casilla por la que se anda.
      const walkable = (a: Anchor, what: string) => {
        const base = resolve(a);
        expect(base, `${story.id}: ${what}`).toBeDefined();
        if (!base) return;
        const x = base.x + a.dx;
        const y = base.y + a.dy;
        expect(isWalkable(map.tiles[y * map.width + x]), `${story.id}: ${what} en (${x}, ${y})`).toBe(true);
      };
      for (const [npc, anchor] of Object.entries(story.npcs)) {
        walkable(anchor, npc);
        expect(npc in MAP_SPRITES, `${npc} no tiene dibujo en el mapa`).toBe(true);
      }
      if (story.riddler) expect(story.riddler.npc in MAP_SPRITES).toBe(true);
      for (const light of story.lights) walkable(light, 'luz');
      for (const path of story.paths) walkable(path, `camino a ${path.to}`);
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
      lightSprites: { off: 'crystal-off', on: 'crystal-on' },
      boss: { character: 'borron', sprite: 'borron', becomes: 'borroncito', appears: 'borron-appears', shrinks: 'borron-shrinks' },
      afterEnding: 'after-ending',
      paths: [],
    };
    expect(validateStory([test])).toEqual([]);
    expect(validateStory([{ ...test, npcs: {}, next: 'otra' }])).toEqual([
      'region-de-prueba: hablar: bruno no está en el mapa',
      'region-de-prueba: falta el camino a la región siguiente «otra»',
      'region-de-prueba: la región siguiente «otra» no existe',
    ]);
    expect(validateStory([{ ...test, steps: [...test.steps, { id: 'acertijos', chapter: 1, kind: 'riddles', count: 2, objective: { es: 'A', ca: 'A' } }] }])).toEqual([
      'region-de-prueba: acertijos: no hay guardián de acertijos en el mapa',
    ]);
  });
});

describe('viajar entre regiones', () => {
  const praderaDone = { region: 'pradera-uno', step: PRADERA_UNO_STORY.steps.length, count: 0, crystals: [] };

  it('el bosque se abre al terminar Pradera Uno, nunca antes (ni con Cifras)', () => {
    expect(regionOpen(NEW_STORY, 'bosque-decenas')).toBe(false);
    expect(regionOpen({ ...NEW_STORY, step: stepIndex('boss') }, 'bosque-decenas')).toBe(false);
    expect(regionOpen(praderaDone, 'bosque-decenas')).toBe(true);
    expect(travel(NEW_STORY, 'pradera-uno', 'bosque-decenas')).toBeUndefined();
  });

  it('ir al bosque por primera vez empieza su historia; volver a la pradera no la pierde', () => {
    const go = travel(praderaDone, 'pradera-uno', 'bosque-decenas');
    expect(go).toEqual({ story: { region: 'bosque-decenas', step: 0, count: 0, crystals: [] }, at: 'bosque-decenas', first: true });
    if (!go) return;
    const forest = { ...go.story, step: 2, count: 0 };
    const back = travel(forest, 'bosque-decenas', 'pradera-uno');
    expect(back).toEqual({ story: forest, at: 'pradera-uno', first: false });
    // En la pradera, la historia se ve terminada (con Borroncito y encargos).
    expect(isStoryDone(storyIn(forest, 'pradera-uno'))).toBe(true);
    expect(storyIn(forest, 'bosque-decenas')).toBe(forest);
    // Y volver al bosque sigue donde estaba.
    expect(travel(forest, 'pradera-uno', 'bosque-decenas')).toEqual({ story: forest, at: 'bosque-decenas', first: false });
  });

  it('el sitio guardado solo vale si esa región ya está empezada', () => {
    expect(parseAt('bosque-decenas', NEW_STORY)).toBe('pradera-uno');
    expect(parseAt('bosque-decenas', { region: 'bosque-decenas', step: 0, count: 0, crystals: [] })).toBe('bosque-decenas');
    expect(parseAt('pradera-uno', { region: 'bosque-decenas', step: 0, count: 0, crystals: [] })).toBe('pradera-uno');
    expect(parseAt('no-existe', praderaDone)).toBe('pradera-uno');
    expect(parseAt(undefined, praderaDone)).toBe('pradera-uno');
  });

  it('la historia del bosque se juega entera solo aprendiendo', () => {
    let state = { region: 'bosque-decenas', step: 0, count: 0, crystals: [] as number[] };
    const events = [
      { type: 'talked', npc: 'olma' },
      { type: 'battleWon', where: 'wild' },
      { type: 'battleWon', where: 'wild' },
      { type: 'battleWon', where: 'wild' },
      { type: 'talked', npc: 'olma' },
      { type: 'battleWon', where: 'crystal', crystal: 0 },
      { type: 'battleWon', where: 'crystal', crystal: 1 },
      { type: 'battleWon', where: 'crystal', crystal: 2 },
      { type: 'talked', npc: 'olma' },
      { type: 'talked', npc: 'cuco' },
      { type: 'riddleSolved' },
      { type: 'riddleSolved' },
      { type: 'riddleSolved' },
      { type: 'battleWon', where: 'boss' },
    ] as const;
    const opened: string[] = [];
    for (const event of events) {
      const out = advanceStory(state, event);
      expect(out.changed, JSON.stringify(event)).toBe(true);
      if (out.zoneOpened) opened.push(out.zoneOpened);
      state = { ...out.state, region: out.state.region ?? 'bosque-decenas' };
    }
    expect(isStoryDone(state)).toBe(true);
    expect(opened).toEqual(['claro-farolillos', 'arbol-hueco']);
  });
});
