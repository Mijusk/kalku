import type { CreatureId } from '@kalku/content';
import type { Rng, Slot, SkillId } from '@kalku/exercises';
import type { Point, WildlifeState } from '@kalku/world';

/** Lo que lleva cada criatura visible del mapa: qué es y qué ejercicios hay que resolver. */
export interface WildData {
  creature: CreatureId;
  skill: SkillId;
  slot: Slot;
}

/**
 * Estado del mapa que sobrevive al combate: la escena del mapa se recrea al
 * volver, así que posición, criaturas y semilla se guardan en el registro
 * de Phaser (solo en memoria, no se persiste).
 */
export interface WorldState {
  tile: Point;
  wildlife: WildlifeState<WildData>;
  rng: Rng;
}

/** Datos con los que el mapa lanza un combate. */
export interface EncounterData {
  wandererId: number;
  data: WildData;
}

export const WORLD_STATE_KEY = 'worldState';
