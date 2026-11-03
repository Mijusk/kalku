import type { RegionSpec } from './types.js';

/** Pradera Uno: la primera región (1.º: contar, sumas y restas hasta 20). */
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
};

/** Todas las regiones, en orden de currículo. */
export const REGIONS: readonly RegionSpec[] = [PRADERA_UNO];
