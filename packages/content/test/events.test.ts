import { describe, expect, it } from 'vitest';
import { createRng } from '@kalku/exercises';
import { validateLook } from '@kalku/art';
import {
  activeEvent,
  addToCollection,
  advanceMissions,
  albumPages,
  canRescue,
  CREATURES,
  creaturesForSkill,
  damageMultiplier,
  EVENTS,
  EVENTS_ALBUM,
  getCreature,
  missionsFor,
  missionText,
  parseCollection,
  REGION_STORIES,
  refreshMissions,
  rollShiny,
  SHINY_CHANCE,
  shinyLook,
  shinySprite,
  validateEvents,
} from '../src/index.js';

describe('eventos de temporada', () => {
  it('los datos son válidos: fechas, invitadas propias, textos es/ca y sin solaparse', () => {
    expect(validateEvents()).toEqual([]);
  });

  it('un evento fuera de fechas no aparece', () => {
    expect(activeEvent('2026-09-15')).toBeUndefined();
    expect(activeEvent('2026-10-24')).toBeUndefined();
    expect(activeEvent('2026-10-25')?.id).toBe('castanyada');
    expect(activeEvent('2026-11-05')?.id).toBe('castanyada');
    expect(activeEvent('2026-11-06')).toBeUndefined();
    expect(activeEvent('2027-04-23')?.id).toBe('sant-jordi');
    expect(activeEvent('2027-06-30')?.id).toBe('fin-de-curso');
    expect(activeEvent('2027-07-01')).toBeUndefined();
  });

  it('Navidad cruza el año', () => {
    expect(activeEvent('2026-12-14')).toBeUndefined();
    expect(activeEvent('2026-12-31')?.id).toBe('navidad');
    expect(activeEvent('2027-01-07')?.id).toBe('navidad');
    expect(activeEvent('2027-01-08')).toBeUndefined();
  });

  it('la misión del evento solo sale en sus fechas y se cumple ganando a la invitada', () => {
    expect(missionsFor('2026-09-15').some((m) => m.kind === 'guests')).toBe(false);
    const missions = missionsFor('2026-12-20');
    const special = missions.find((m) => m.kind === 'guests');
    expect(special).toBeDefined();
    expect(missionText(special!, 'es')).toContain('Copito');
    expect(missionText(special!, 'ca')).toContain('Floquet');
    const state = refreshMissions(null, '2026-12-20');
    const normal = advanceMissions(state, missions, { type: 'battleWon', rescued: false });
    expect(normal.state.progress[special!.id] ?? 0).toBe(0);
    const guest = advanceMissions(state, missions, { type: 'battleWon', rescued: false, guest: true });
    expect(guest.state.progress[special!.id]).toBe(1);
  });

  it('las invitadas no salen por su habilidad ni fuera de su página del álbum', () => {
    for (const event of EVENTS) {
      const guest = getCreature(event.guest);
      expect(guest.guest).toBe(event.id);
      expect(guest.album).toBe(EVENTS_ALBUM);
      expect(creaturesForSkill(guest.skill).map((c) => c.id)).not.toContain(guest.id);
    }
  });
});

describe('criaturas brillantes', () => {
  it('solo cambia el color: las mismas piezas con otra escala, válida y distinta', () => {
    for (const c of CREATURES) {
      const look = shinyLook(c.look);
      expect(validateLook(look)).toEqual([]);
      expect(look.ramp).not.toBe(c.look.ramp);
      expect({ ...look, ramp: c.look.ramp }).toEqual(c.look);
      expect(shinySprite(c.sprite)).not.toBe(c.sprite);
    }
  });

  it('no dan ventaja en el combate: la criatura es la misma (vida, familia, habilidad, debilidad, rescate)', () => {
    // El brillo solo vive en el mapa (WildData.shiny) y en la textura; el combate usa la definición.
    for (const c of CREATURES) {
      const shiny = { ...c, look: shinyLook(c.look) };
      expect(shiny.hp).toBe(c.hp);
      for (const op of ['+', '-'] as const) expect(damageMultiplier(shiny, op)).toBe(damageMultiplier(c, op));
      expect(canRescue(shiny, 1, c.hp)).toBe(canRescue(c, 1, c.hp));
    }
  });

  it('son poco frecuentes, con semilla', () => {
    const rng = createRng(2026);
    let shiny = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) if (rollShiny(rng)) shiny += 1;
    expect(shiny / n).toBeGreaterThan(SHINY_CHANCE * 0.8);
    expect(shiny / n).toBeLessThan(SHINY_CHANCE * 1.2);
    const again = createRng(2026);
    const first = createRng(2026);
    expect(Array.from({ length: 50 }, () => rollShiny(again))).toEqual(Array.from({ length: 50 }, () => rollShiny(first)));
  });

  it('rescatar una brillante apunta la pegatina sin tocar la fecha del primer rescate', () => {
    let col = addToCollection([], 'sumus-brote', '2026-11-01');
    col = addToCollection(col, 'sumus-brote', '2026-11-20', true);
    expect(col).toEqual([{ id: 'sumus-brote', date: '2026-11-01', shiny: '2026-11-20' }]);
    // La segunda brillante no cambia nada.
    expect(addToCollection(col, 'sumus-brote', '2026-12-01', true)).toBe(col);
    // Rescatarla brillante a la primera apunta las dos fechas.
    expect(addToCollection([], 'restus-gota', '2026-11-02', true)).toEqual([{ id: 'restus-gota', date: '2026-11-02', shiny: '2026-11-02' }]);
    expect(parseCollection(JSON.parse(JSON.stringify(col)))).toEqual(col);
    expect(parseCollection([{ id: 'sumus-brote', date: '2026-11-01', shiny: 5 }])).toEqual([{ id: 'sumus-brote', date: '2026-11-01' }]);
  });
});

describe('álbum por regiones', () => {
  it('una página por región, en orden, y la de eventos al final', () => {
    const pages = albumPages([]);
    expect(pages.map((p) => p.id)).toEqual([...REGION_STORIES.map((r) => r.id), EVENTS_ALBUM]);
    expect(pages.every((p) => !p.complete)).toBe(true);
  });

  it('cada criatura vive en una página que existe', () => {
    const ids = new Set([...REGION_STORIES.map((r) => r.id), EVENTS_ALBUM]);
    for (const c of CREATURES) expect(ids.has(c.album)).toBe(true);
  });

  it('la página se completa (pegatina) al rescatar todas sus criaturas', () => {
    let col = addToCollection([], 'sumus-brote', '2026-11-01');
    expect(albumPages(col)[0]?.complete).toBe(false);
    for (const c of CREATURES.filter((x) => x.album === REGION_STORIES[0]?.id)) col = addToCollection(col, c.id, '2026-11-02');
    expect(albumPages(col)[0]?.complete).toBe(true);
    expect(albumPages(col)[1]?.complete).toBe(false);
  });
});
