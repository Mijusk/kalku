import { ARENA_PRADERA, PUEBLO_PRADERA } from './pieces.js';
import type { RegionSpec } from './types.js';

/**
 * Pradera Uno: la primera región (1.º: contar, sumas y restas hasta 20).
 * Se entra por la izquierda; el pueblo está arriba en el centro y la arena
 * del jefe abajo a la derecha.
 */
export const PRADERA_UNO: RegionSpec = {
  id: 'pradera-uno',
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
  ],
};

/** Todas las regiones, en orden de currículo. */
export const REGIONS: readonly RegionSpec[] = [PRADERA_UNO];
