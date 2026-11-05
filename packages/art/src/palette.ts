import { hex, type Ramp } from './grid.js';

/**
 * Reglas de estilo como datos (ver docs/maquetas/dibujos-por-codigo.html):
 * pocos colores, una escala de 4–5 tonos por material, luz desde arriba a la
 * izquierda y contorno oscuro. Todos los dibujos salen de estas escalas.
 */
const ramp = (...colors: string[]): Ramp => colors.map(hex);

export const OUTLINE = hex('#1c2430');
export const FOAM = hex('#eefbff');
export const WHITE = hex('#ffffff');
export const GOLD = hex('#ffd84d');

/** Materiales del mundo. */
export const MATERIAL = {
  hierba: ramp('#a6e264', '#72c24c', '#4f9d3e', '#357343'),
  agua: ramp('#c6efff', '#7cc8f2', '#3f93d8', '#2c64a8'),
  arena: ramp('#f6e6b0', '#e4c98a'),
  tierra: ramp('#e2bd86', '#c99d5e', '#a87d45', '#7d5a32'),
  hoja: ramp('#8fd96d', '#52b350', '#2f8340', '#1f5a2f'),
  corteza: ramp('#a8763f', '#7c5530', '#563a20'),
  piedra: ramp('#e1e4e8', '#b2b8c0', '#848c96', '#5b636d'),
  tejadoRojo: ramp('#f58b6c', '#de5a4c', '#ad3c36', '#742a28'),
  tejadoAzul: ramp('#8fd0f7', '#4f9fe0', '#3274b9', '#1f4a80'),
  pared: ramp('#fbf0d6', '#ecdab2', '#cdb98e'),
  runa: ramp('#ecdcff', '#c6a4f3', '#9a74d8', '#6c4caa'),
} as const;

/** Colores de las criaturas: cada una usa una escala de 5 tonos (el último es el contorno). */
export const CREATURE_RAMPS = {
  verde: ramp('#d6f69c', '#9fdc5e', '#66b244', '#428635', '#1f4a22'),
  azul: ramp('#daf4ff', '#92d4f7', '#53a8e4', '#3274b9', '#1a3d6b'),
  gris: ramp('#f6f8fb', '#d4d9e1', '#a6afbc', '#788291', '#3b4250'),
  rosa: ramp('#ffe2ee', '#ffb0cb', '#f07ea6', '#c4517e', '#6b2442'),
  naranja: ramp('#ffe9bc', '#ffc062', '#f29233', '#c26722', '#5e2e10'),
  morado: ramp('#ecdcff', '#c6a4f3', '#9a74d8', '#6c4caa', '#33215a'),
  amarillo: ramp('#fff8c6', '#ffe470', '#f3c435', '#c99b20', '#5c4410'),
  marron: ramp('#f1d9b5', '#c99a64', '#9a6a3c', '#6e4527', '#35200f'),
} as const;

export type RampName = keyof typeof CREATURE_RAMPS;
export const RAMP_NAMES = Object.keys(CREATURE_RAMPS) as RampName[];
