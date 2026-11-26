import { ARENA_BOSQUE, ARENA_PRADERA, CAMPAMENTO_BOSQUE, PUEBLO_PRADERA, ZONA_ARBOL, ZONA_CLARO, ZONA_CUEVA, ZONA_PUENTE, ZONA_PUERTA } from './pieces.js';
import type { RegionSpec } from './types.js';

/**
 * Pradera Uno: la primera región (1.º: contar, sumas y restas hasta 20).
 * Se entra por la izquierda; el pueblo está arriba en el centro, la arena
 * del jefe abajo a la derecha y tres zonas cerradas repartidas por el mapa.
 */
export const PRADERA_UNO: RegionSpec = {
  id: 'pradera-uno',
  seed: 42,
  width: 60,
  height: 40,
  proportions: {
    water: 0.08,
    tree: 0.15,
    tallGrass: 0.2,
    flowers: 0.05,
  },
  entrance: { x: 0, y: 20 },
  places: [
    { piece: PUEBLO_PRADERA, x: 22, y: 6 },
    { piece: ARENA_PRADERA, x: 50, y: 26 },
    // Zonas cerradas: se abren con gemas o nivel (requisitos en `ZONES`, @kalku/content).
    { piece: ZONA_PUENTE, x: 8, y: 28, zone: 'puente-roto' },
    { piece: ZONA_CUEVA, x: 42, y: 8, zone: 'cueva' },
    { piece: ZONA_PUERTA, x: 30, y: 30, zone: 'puerta-de-piedra' },
  ],
  wildlife: {
    max: 3,
    moveEveryMs: 700,
    respawnMs: 6000,
    graceMs: 2000,
    minSpawnDistance: 8,
  },
};

/**
 * Bosque de las Decenas: la segunda región (2.º: números hasta 100). Más
 * árboles y menos agua; el campamento de Olma, dos zonas cerradas y el
 * corazón del bosque, donde espera el Gran Enredo.
 */
export const BOSQUE_DECENAS: RegionSpec = {
  id: 'bosque-decenas',
  seed: 1010,
  width: 60,
  height: 40,
  proportions: {
    water: 0.04,
    tree: 0.3,
    tallGrass: 0.22,
    flowers: 0.03,
  },
  entrance: { x: 0, y: 20 },
  places: [
    { piece: CAMPAMENTO_BOSQUE, x: 14, y: 14 },
    { piece: ARENA_BOSQUE, x: 48, y: 24 },
    { piece: ZONA_CLARO, x: 30, y: 6, zone: 'claro-farolillos' },
    { piece: ZONA_ARBOL, x: 34, y: 30, zone: 'arbol-hueco' },
  ],
  wildlife: PRADERA_UNO.wildlife,
};

/** Todas las regiones, en orden de currículo. */
export const REGIONS: readonly RegionSpec[] = [PRADERA_UNO, BOSQUE_DECENAS];

/** El mapa de una región por su id; si no existe, Pradera Uno. */
export function regionSpec(id: string | undefined): RegionSpec {
  return REGIONS.find((r) => r.id === id) ?? PRADERA_UNO;
}
