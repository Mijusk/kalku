/**
 * Tipos de casilla del mapa.
 * `house`, `shop` y `boss` solo salen de piezas escritas a mano (pueblo, arena).
 */
export type TileKind =
  | 'grass'
  | 'tallGrass'
  | 'tree'
  | 'water'
  | 'path'
  | 'flowers'
  | 'house'
  | 'shop'
  | 'boss';

/** Casillas que una región reparte por proporción. La hierba es lo que sobra. */
export type FeatureKind = 'water' | 'tree' | 'tallGrass' | 'flowers';

/** Una casilla del mapa: columna x, fila y, empezando en 0 arriba a la izquierda. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Un mapa ya generado. Las casillas van por filas: índice = y * width + x. */
export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileKind[];
}

/**
 * Terreno de una región como datos: tamaño y qué parte del mapa ocupa
 * cada tipo de casilla (0–1). Lo que no se reparte queda como hierba.
 */
export interface TerrainSpec {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly proportions: Readonly<Record<FeatureKind, number>>;
}

/**
 * Un lugar hecho a mano, escrito como texto: una fila por string y una
 * letra por casilla (ver `PIECE_LEGEND`). `link` es la casilla de la pieza
 * por la que entra y sale el camino: tiene que estar en el borde y ser
 * transitable.
 */
export interface PieceSpec {
  readonly id: string;
  readonly rows: readonly string[];
  readonly link: Point;
}

/** Una pieza colocada en la región, con su esquina de arriba a la izquierda en (x, y). */
export interface PlaceSpec {
  readonly piece: PieceSpec;
  readonly x: number;
  readonly y: number;
}

/**
 * Región completa: terreno, entrada (en el borde del mapa) y lugares.
 * El camino va de la entrada al primer lugar, del primero al segundo… en
 * el orden de `places`. En Pradera Uno: entrada → pueblo → jefe.
 */
export interface RegionSpec extends TerrainSpec {
  readonly entrance: Point;
  readonly places: readonly PlaceSpec[];
  readonly wildlife: WildlifeSpec;
}

/**
 * Criaturas visibles de una región (en la hierba alta). Todos los tiempos
 * son en milisegundos.
 */
export interface WildlifeSpec {
  /** Máximo de criaturas a la vez en el mapa. */
  readonly max: number;
  /** Cada cuánto da un paso una criatura (andan despacio). */
  readonly moveEveryMs: number;
  /** Lo que tarda en salir otra después de un combate. */
  readonly respawnMs: number;
  /** Margen tras volver de un combate en el que no empieza otro. */
  readonly graceMs: number;
  /** Distancia mínima (en casillas, en cruz) al personaje para aparecer. */
  readonly minSpawnDistance: number;
}

/** Un lugar ya colocado en el mapa, con su enlace en coordenadas del mapa. */
export interface PlacedPiece {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly link: Point;
}

/** Mapa de una región con su entrada y sus lugares. */
export interface RegionMap extends WorldMap {
  readonly entrance: Point;
  readonly places: readonly PlacedPiece[];
}
