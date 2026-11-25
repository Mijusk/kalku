import { applyPlacement, createProfile, levelForXp, MAX_LEVEL, SKILL_IDS, type SkillId } from '@kalku/exercises';
import { PRADERA_UNO } from '@kalku/world';
import { describe, expect, it } from 'vitest';
import {
  getZone,
  isZoneOpen,
  missingForZone,
  parseTreasures,
  parseZonesOpened,
  validateZones,
  ZONES,
  type ZoneDefinition,
} from '../src/index.js';

const zone = (id: string): ZoneDefinition => {
  const found = getZone(id);
  if (!found) throw new Error(`Falta la zona ${id}`);
  return found;
};

describe('isZoneOpen', () => {
  it('con gemas: solo se abre con todas las que pide', () => {
    const req = { gems: ['sub-within-20-borrow', 'add-within-20-carry'] as SkillId[] };
    expect(isZoneOpen(req, { gems: [], level: MAX_LEVEL })).toBe(false);
    expect(isZoneOpen(req, { gems: ['sub-within-20-borrow'], level: MAX_LEVEL })).toBe(false);
    expect(isZoneOpen(req, { gems: ['add-within-20-carry'], level: MAX_LEVEL })).toBe(false);
    expect(isZoneOpen(req, { gems: ['add-within-20-carry', 'sub-within-20-borrow'], level: 1 })).toBe(true);
    // Gemas de más no estorban.
    expect(isZoneOpen(req, { gems: [...SKILL_IDS], level: 1 })).toBe(true);
  });

  it('con nivel mínimo: solo desde ese nivel, sin importar las gemas', () => {
    const req = { minLevel: 3 };
    expect(isZoneOpen(req, { gems: [...SKILL_IDS], level: 2 })).toBe(false);
    expect(isZoneOpen(req, { gems: [], level: 3 })).toBe(true);
    expect(isZoneOpen(req, { gems: [], level: 4 })).toBe(true);
  });

  it('con gemas y nivel: hacen falta las dos cosas', () => {
    const req = zone('puerta-de-piedra').requirement;
    expect(isZoneOpen(req, { gems: ['add-within-20-carry'], level: 4 })).toBe(false);
    expect(isZoneOpen(req, { gems: [], level: 5 })).toBe(false);
    expect(isZoneOpen(req, { gems: ['add-within-20-carry'], level: 5 })).toBe(true);
  });

  it('nunca se abre por monedas: el jugador que se le pasa no tiene monedas', () => {
    // Aunque se cuele un campo de más, no cambia nada.
    const rich = { gems: [], level: 1, coins: 1_000_000 };
    for (const z of ZONES) expect(isZoneOpen(z.requirement, rich)).toBe(false);
  });

  it('dice qué falta', () => {
    const req = zone('puerta-de-piedra').requirement;
    expect(missingForZone(req, { gems: [], level: 2 })).toEqual({ gems: ['add-within-20-carry'], level: 5 });
    expect(missingForZone(req, { gems: ['add-within-20-carry'], level: 5 })).toEqual({ gems: [] });
  });
});

describe('la prueba de nivel no abre zonas', () => {
  it('con dominio alto de placement, sin gemas ni XP, todas siguen cerradas', () => {
    const high = createProfile();
    for (const id of SKILL_IDS) high[id] = { mastery: 100, attempts: 20, correct: 20 };
    const profile = applyPlacement(createProfile(), high);
    // Placement solo toca el perfil: no da gemas (`gems` = []) ni XP (nivel 1).
    expect(profile[SKILL_IDS[0] as SkillId].mastery).toBe(100);
    for (const z of ZONES) expect(isZoneOpen(z.requirement, { gems: [], level: levelForXp(0) })).toBe(false);
  });
});

describe('datos de las zonas', () => {
  it('son válidos: ids únicos, gemas que existen, requisito y textos es/ca', () => {
    expect(validateZones()).toEqual([]);
  });

  it('validateZones detecta los errores', () => {
    const bad: ZoneDefinition = {
      id: 'x',
      name: { es: 'X', ca: '' },
      requirement: { gems: ['no-existe' as SkillId] },
      treasure: { id: 't', name: { es: 'T', ca: 'T' } },
    };
    expect(validateZones([bad]).length).toBeGreaterThanOrEqual(2);
    expect(validateZones([{ ...bad, name: { es: 'X', ca: 'X' }, requirement: {} }])).toEqual(['x: no pide nada']);
  });

  it('cada zona de Pradera Uno tiene datos, y cada zona con datos tiene su lugar en el mapa', () => {
    const placed = PRADERA_UNO.places.flatMap((p) => (p.zone === undefined ? [] : [p.zone]));
    expect([...placed].sort()).toEqual(ZONES.map((z) => z.id).sort());
  });

  it('el guardado descarta ids desconocidos y repetidos', () => {
    expect(parseZonesOpened(['cueva', 'cueva', 'no-existe', 3, null])).toEqual(['cueva']);
    expect(parseZonesOpened('cueva')).toEqual([]);
    expect(parseZonesOpened(undefined)).toEqual([]);
    expect(parseTreasures(['tesoro-cueva', 'cueva', 'tesoro-cueva'])).toEqual(['tesoro-cueva']);
    expect(parseTreasures({})).toEqual([]);
  });
});
