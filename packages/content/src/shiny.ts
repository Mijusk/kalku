import type { CreatureLook, RampName } from '@kalku/art';
import type { Rng } from '@kalku/exercises';

/**
 * Criaturas brillantes (#101): de vez en cuando una criatura del mapa sale con
 * otros colores. Solo cambia el color: misma vida, misma familia, mismos
 * ejercicios y mismo daño (regla 1). Se decide con el rng con semilla del mapa.
 */
export const SHINY_CHANCE = 1 / 25;

/** Cada escala de color pasa a otra que no se confunda con la normal. */
export const SHINY_RAMP: Readonly<Record<RampName, RampName>> = {
  verde: 'amarillo',
  azul: 'morado',
  gris: 'amarillo',
  rosa: 'azul',
  naranja: 'rosa',
  morado: 'verde',
  amarillo: 'azul',
  marron: 'gris',
};

/** Las mismas piezas con la escala de color brillante. */
export function shinyLook(look: CreatureLook): CreatureLook {
  return { ...look, ramp: SHINY_RAMP[look.ramp] };
}

/** Clave de la textura de la versión brillante. */
export function shinySprite(sprite: string): string {
  return `${sprite}-brillo`;
}

export function rollShiny(rng: Rng): boolean {
  return rng.chance(SHINY_CHANCE);
}
