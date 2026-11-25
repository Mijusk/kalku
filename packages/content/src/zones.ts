import { SKILL_IDS, type Localized, type SkillId } from '@kalku/exercises';

/**
 * Zonas cerradas del mapa, como datos. Cada zona se abre con gemas de
 * dominio y/o un nivel mínimo del personaje: nunca con monedas (regla 1) y
 * nunca con la prueba de nivel inicial, que no da gemas ni experiencia.
 * Dónde está cada zona en el mapa se escribe en `regions.ts` de `@kalku/world`
 * (`PlaceSpec.zone` = `id` de aquí). Añadir una zona = una entrada aquí y
 * un lugar allí.
 */
export interface ZoneRequirement {
  /** Gemas (por habilidad) que hay que tener todas. */
  gems?: readonly SkillId[];
  /** Nivel mínimo del personaje. */
  minLevel?: number;
}

/** Premio cosmético del cofre de la zona. No da ventaja en el combate. */
export interface ZoneTreasure {
  id: string;
  name: Localized;
}

export interface ZoneDefinition {
  id: string;
  name: Localized;
  requirement: ZoneRequirement;
  treasure: ZoneTreasure;
}

export const ZONES: readonly ZoneDefinition[] = [
  {
    id: 'puente-roto',
    name: { es: 'Puente roto', ca: 'Pont trencat' },
    requirement: { gems: ['sub-within-20-borrow'] },
    treasure: { id: 'tesoro-puente', name: { es: 'Farol del puente', ca: 'Fanal del pont' } },
  },
  {
    id: 'cueva',
    name: { es: 'Cueva', ca: 'Cova' },
    requirement: { minLevel: 3 },
    treasure: { id: 'tesoro-cueva', name: { es: 'Cristal de la cueva', ca: 'Cristall de la cova' } },
  },
  {
    id: 'puerta-de-piedra',
    name: { es: 'Puerta de piedra', ca: 'Porta de pedra' },
    requirement: { gems: ['add-within-20-carry'], minLevel: 5 },
    treasure: { id: 'tesoro-puerta', name: { es: 'Corona de piedra', ca: 'Corona de pedra' } },
  },
];

export function getZone(id: string): ZoneDefinition | undefined {
  return ZONES.find((z) => z.id === id);
}

/** Lo que cuenta para abrir una zona: gemas y nivel. Adrede no hay monedas. */
export interface ZonePlayer {
  gems: readonly string[];
  level: number;
}

/** Lo que falta para abrir una zona: las gemas que no se tienen y, si no llega, el nivel pedido. */
export interface ZoneMissing {
  gems: SkillId[];
  level?: number;
}

export function missingForZone(requirement: ZoneRequirement, player: ZonePlayer): ZoneMissing {
  const gems = (requirement.gems ?? []).filter((g) => !player.gems.includes(g));
  const missing: ZoneMissing = { gems };
  if (requirement.minLevel !== undefined && player.level < requirement.minLevel) missing.level = requirement.minLevel;
  return missing;
}

/** Una zona se abre si y solo si se cumplen todas las gemas y el nivel mínimo que pide. */
export function isZoneOpen(requirement: ZoneRequirement, player: ZonePlayer): boolean {
  const missing = missingForZone(requirement, player);
  return missing.gems.length === 0 && missing.level === undefined;
}

/** Comprueba los datos: ids únicos, gemas que existen, requisito no vacío y textos en es y ca. */
export function validateZones(zones: readonly ZoneDefinition[] = ZONES): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const treasures = new Set<string>();
  for (const zone of zones) {
    if (ids.has(zone.id)) errors.push(`Zona repetida: ${zone.id}`);
    ids.add(zone.id);
    if (treasures.has(zone.treasure.id)) errors.push(`Tesoro repetido: ${zone.treasure.id}`);
    treasures.add(zone.treasure.id);
    const { gems = [], minLevel } = zone.requirement;
    if (gems.length === 0 && minLevel === undefined) errors.push(`${zone.id}: no pide nada`);
    if (minLevel !== undefined && (!Number.isInteger(minLevel) || minLevel < 2)) errors.push(`${zone.id}: nivel mínimo no válido`);
    for (const g of gems) {
      if (!(SKILL_IDS as readonly string[]).includes(g)) errors.push(`${zone.id}: la gema ${g} no existe`);
    }
    for (const text of [zone.name, zone.treasure.name]) {
      if (text.es.trim() === '' || text.ca.trim() === '') errors.push(`${zone.id}: falta un texto en es o ca`);
    }
  }
  return errors;
}

/** Lee un guardado de ids: se queda solo con los que `known` reconoce y quita repetidos. */
function parseKnownIds(raw: unknown, known: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && known.has(id)))];
}

/** Zonas ya abiertas (ids). Descarta lo desconocido. */
export function parseZonesOpened(raw: unknown): string[] {
  return parseKnownIds(raw, new Set(ZONES.map((z) => z.id)));
}

/** Tesoros ya recogidos (ids). Descarta lo desconocido. */
export function parseTreasures(raw: unknown): string[] {
  return parseKnownIds(raw, new Set(ZONES.map((z) => z.treasure.id)));
}
