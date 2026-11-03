/** Tipos de casilla del terreno. */
export type TileKind = 'grass' | 'tallGrass' | 'tree' | 'water' | 'path' | 'flowers';

/** Casillas que una región reparte por proporción. La hierba es lo que sobra. */
export type FeatureKind = 'water' | 'tree' | 'tallGrass' | 'flowers';

/** Un mapa ya generado. Las casillas van por filas: índice = y * width + x. */
export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileKind[];
}

/**
 * Descripción de una región como datos: tamaño y qué parte del mapa ocupa
 * cada tipo de casilla (0–1). Lo que no se reparte queda como hierba.
 */
export interface RegionSpec {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly proportions: Readonly<Record<FeatureKind, number>>;
}
