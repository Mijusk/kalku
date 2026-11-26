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

/** De dónde sale un combate de la historia (docs/HISTORIA.md). */
export interface StoryBattle {
  /** first = primer rescate guiado (con las explicaciones de Uni). */
  where: 'wild' | 'first' | 'crystal' | 'boss';
  crystal?: number;
}

/** Datos con los que el mapa lanza un combate. `wandererId` −1 = no es una criatura del mapa. */
export interface EncounterData {
  wandererId: number;
  data: WildData;
  story?: StoryBattle;
}

/** Cómo acabó el último combate, para que el mapa lo cuente en la historia al volver. */
export interface BattleResult {
  won: boolean;
  rescued: boolean;
  story: StoryBattle;
}

export const BATTLE_RESULT_KEY = 'battleResult';

/** Un resultado de la historia que el mapa tiene que enseñar al volver (por ejemplo, la puerta abriéndose tras los acertijos). */
export const PENDING_OUTCOME_KEY = 'pendingOutcome';

export const WORLD_STATE_KEY = 'worldState';

/** Un encargo que avanzó fuera del mapa (los acertijos de Pedrolo) y que el mapa tiene que enseñar al volver. */
export const PENDING_QUEST_KEY = 'pendingQuest';
