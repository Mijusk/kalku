import { newGrid, setPx, shape, tone, light, type Grid } from './grid.js';
import { CREATURE_RAMPS, OUTLINE, RAMP_NAMES, WHITE, type RampName } from './palette.js';

/** Tamaño de una criatura, en píxeles (dos casillas de alto). */
export const CREATURE_PX = 32;

/** Fotogramas de la animación (respirar y parpadear). */
export const CREATURE_FRAMES = 8;

export const BODIES = ['round', 'drop', 'pear', 'bean'] as const;
export const TOPS = ['sprout', 'droplet', 'puff', 'ears', 'horns', 'antenna', 'none'] as const;
export const EYES = ['big', 'small', 'sleepy'] as const;

export type BodyPiece = (typeof BODIES)[number];
export type TopPiece = (typeof TOPS)[number];
export type EyesPiece = (typeof EYES)[number];

/**
 * Las piezas de una criatura, como datos: cuerpo, algo en la cabeza, ojos,
 * escala de color y el símbolo de su familia en la tripa. Añadir una criatura
 * es escribir otro `CreatureLook`; no toca lógica.
 */
export interface CreatureLook {
  readonly ramp: RampName;
  readonly body: BodyPiece;
  readonly top: TopPiece;
  readonly eyes: EyesPiece;
  /** Mofletes rosas. */
  readonly cheeks?: boolean;
  /** Manchas oscuras en el cuerpo. */
  readonly spots?: boolean;
  /** «+» para los sumus, «−» para los restus y «±» para los problemus. */
  readonly sign: '+' | '-' | '±';
}

/** Comprueba que el look usa piezas que existen (por si viene de datos externos). */
export function validateLook(look: CreatureLook): string[] {
  const errors: string[] = [];
  if (!RAMP_NAMES.includes(look.ramp)) errors.push(`la escala de color «${look.ramp}» no existe`);
  if (!BODIES.includes(look.body)) errors.push(`el cuerpo «${look.body}» no existe`);
  if (!TOPS.includes(look.top)) errors.push(`la pieza de cabeza «${look.top}» no existe`);
  if (!EYES.includes(look.eyes)) errors.push(`los ojos «${look.eyes}» no existen`);
  if (look.sign !== '+' && look.sign !== '-' && look.sign !== '±') errors.push(`el símbolo «${String(look.sign)}» no existe`);
  return errors;
}

const BREATH = [1, 0.97, 0.94, 0.97, 1, 1.02, 1.03, 1.02] as const;
const SWAY = [0, 0, 1, 1, 0, 0, -1, -1] as const;
const BOB = [0, 0, -1, -1, -1, 0, 0, 0] as const;
const BLINK_FRAME = 6;
const CHEEK = 0xff8fab;
const SPROUT_STEM = 0x2f6b2a;

type Inside = (x: number, y: number) => boolean;

function triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): Inside {
  return (x, y) => {
    const s = (p1x: number, p1y: number, p2x: number, p2y: number): number => (x - p2x) * (p1y - p2y) - (p1x - p2x) * (y - p2y);
    const d1 = s(ax, ay, bx, by);
    const d2 = s(bx, by, cx, cy);
    const d3 = s(cx, cy, ax, ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
}

/** Un fotograma (0–7) de la criatura, de 32×32. Mismo look y fotograma → mismo dibujo. */
export function drawCreatureFrame(look: CreatureLook, frame: number): Grid {
  const f = ((Math.floor(frame) % CREATURE_FRAMES) + CREATURE_FRAMES) % CREATURE_FRAMES;
  const R = CREATURE_RAMPS[look.ramp];
  const outline = tone(R, 4);
  const g = newGrid(CREATURE_PX, CREATURE_PX);
  const sy = BREATH[f] ?? 1;
  const blink = f === BLINK_FRAME;

  const bodyH = (look.body === 'drop' ? 21 : look.body === 'bean' ? 17 : 19) * sy;
  const bodyW = (look.body === 'bean' ? 25 : look.body === 'drop' ? 20 : 22) / Math.sqrt(sy);
  const cx = 16;
  const bottom = 29;
  const cy = bottom - bodyH / 2;
  const top = Math.round(cy - bodyH / 2);

  const widthAt = (v: number): number => {
    if (look.body === 'drop') return v < 0 ? 0.12 + 0.88 * Math.sqrt(1 + v) : 1;
    if (look.body === 'pear') return v < 0 ? 0.78 + 0.22 * (1 + v) : 1;
    return 1;
  };
  const uv = (x: number, y: number): [number, number, number] => {
    const u = (x - cx) / (bodyW / 2);
    const v = (y - cy) / (bodyH / 2);
    return [u / widthAt(v), v, u];
  };

  // Pies.
  for (const fx of [cx - 5.5, cx + 5.5]) {
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => ((x - fx) / 3.4) ** 2 + ((y - 29.5) / 2.2) ** 2 <= 1, () => tone(R, 2), outline);
  }

  // Piezas que van detrás del cuerpo.
  if (look.top === 'puff') {
    for (const [px, dy, r] of [[9.5, 3, 4.2], [16, 0.5, 5], [22.5, 3, 4.2]] as const) {
      shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => (x - px) ** 2 + (y - (top + dy)) ** 2 <= r * r,
        (x, y, qx, qy) => tone(R, Math.max(0, light((x - px) / r, (y - top - dy) / r, qx, qy) - 1)), outline);
    }
  }
  if (look.top === 'ears') {
    const left = triangle(7, top - 4, 8, top + 7, 14, top + 3);
    const right = triangle(25, top - 4, 24, top + 7, 18, top + 3);
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => left(x, y) || right(x, y), (x) => (x < 16 ? tone(R, 1) : tone(R, 2)), outline);
    const innerLeft = triangle(8.5, top - 0.5, 9.5, top + 5, 12, top + 3);
    const innerRight = triangle(23.5, top - 0.5, 22.5, top + 5, 20, top + 3);
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => innerLeft(x, y) || innerRight(x, y), () => 0xff9bb5, null);
  }
  if (look.top === 'horns') {
    const left = triangle(9, top - 4, 9, top + 4, 14, top + 3);
    const right = triangle(23, top - 4, 23, top + 4, 18, top + 3);
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => left(x, y) || right(x, y), (_x, y) => (y < top ? 0xfff6dc : 0xead7a4), OUTLINE);
  }

  // Cuerpo, con la tripa clara y manchas opcionales.
  const spots: readonly (readonly [number, number])[] = [[-0.55, -0.15], [0.55, 0.05], [0.15, -0.6]];
  shape(g, 0, 0, CREATURE_PX, CREATURE_PX,
    (x, y) => {
      const [u, v] = uv(x, y);
      return u * u + v * v <= 1;
    },
    (x, y, px, py) => {
      const [u, v, rawU] = uv(x, y);
      if ((rawU * rawU) / 0.3 + (v - 0.45) ** 2 / 0.17 <= 1) return v > 0.78 ? tone(R, 1) : tone(R, 0);
      if (look.spots === true && spots.some(([a, b]) => (u - a) ** 2 + (v - b) ** 2 < 0.03)) return tone(R, 3);
      return tone(R, light(u, v, px, py));
    }, outline);

  // Símbolo de la familia en la tripa.
  const signY = Math.round(cy + bodyH * 0.25);
  for (let i = -2; i <= 2; i++) setPx(g, 16 + i, signY, outline);
  if (look.sign === '+') for (let i = -2; i <= 2; i++) setPx(g, 16, signY + i, outline);
  // «±»: un más pequeño con la raya de abajo.
  if (look.sign === '±') {
    for (let i = -1; i <= 1; i++) setPx(g, 16, signY - 2 + i, outline);
    for (let i = -2; i <= 2; i++) setPx(g, 16 + i, signY + 2, outline);
    setPx(g, 15, signY - 2, outline);
    setPx(g, 17, signY - 2, outline);
  }

  // Ojos y mejillas.
  const eyeY = Math.round(cy - bodyH * 0.12);
  for (const x0 of [11, 20]) {
    if (blink || look.eyes === 'sleepy') {
      for (let i = 0; i < 3; i++) setPx(g, x0 + i, eyeY + 1, OUTLINE);
      if (!blink) {
        setPx(g, x0 - 1, eyeY, OUTLINE);
        setPx(g, x0 + 3, eyeY, OUTLINE);
      }
    } else if (look.eyes === 'big') {
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) setPx(g, x0 + dx, eyeY - 1 + dy, OUTLINE);
      setPx(g, x0, eyeY - 1, WHITE);
      setPx(g, x0 + 2, eyeY + 2, 0x5d6b80);
    } else {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) setPx(g, x0 + 1 + dx, eyeY + dy, OUTLINE);
      setPx(g, x0 + 1, eyeY, WHITE);
    }
    if (look.cheeks === true) {
      setPx(g, x0 + (x0 < 16 ? -2 : 3), eyeY + 3, CHEEK);
      setPx(g, x0 + (x0 < 16 ? -1 : 4), eyeY + 3, CHEEK);
    }
  }

  // Boca.
  setPx(g, 15, eyeY + 4, outline);
  setPx(g, 16, eyeY + 5, outline);
  setPx(g, 17, eyeY + 4, outline);

  // Piezas que van delante.
  const sway = SWAY[f] ?? 0;
  if (look.top === 'sprout') {
    for (let i = 0; i < 4; i++) setPx(g, 16 + (i > 2 ? sway : 0), top - i, SPROUT_STEM);
    const leaf = CREATURE_RAMPS.verde;
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => ((x - (12.5 + sway)) / 3.2) ** 2 + ((y - (top - 4.5)) / 1.7) ** 2 <= 1, () => tone(leaf, 1), tone(leaf, 4));
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => ((x - (19.5 + sway)) / 3.2) ** 2 + ((y - (top - 5.5)) / 1.7) ** 2 <= 1, () => tone(leaf, 2), tone(leaf, 4));
  }
  if (look.top === 'antenna') {
    for (let i = 1; i < 5; i++) setPx(g, 16 + (i > 3 ? sway : 0), top - i, outline);
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX, (x, y) => (x - (16 + sway)) ** 2 + (y - (top - 6)) ** 2 <= 3.2, () => tone(CREATURE_RAMPS.amarillo, 1), OUTLINE);
  }
  if (look.top === 'droplet') {
    const dx = 25;
    const dy = top + 1 + (BOB[f] ?? 0);
    const blue = CREATURE_RAMPS.azul;
    shape(g, 0, 0, CREATURE_PX, CREATURE_PX,
      (x, y) => {
        const u = (x - dx) / 2.6;
        const v = (y - dy) / 3.4;
        const w = v < 0 ? 0.15 + 0.85 * Math.sqrt(Math.max(0, 1 + v)) : 1;
        return (u / w) ** 2 + v * v <= 1;
      },
      (x, y) => (x < dx && y < dy + 1 ? tone(blue, 0) : tone(blue, 1)), tone(blue, 4));
  }
  return g;
}

/** Los 8 fotogramas de la animación. */
export function drawCreature(look: CreatureLook): Grid[] {
  return Array.from({ length: CREATURE_FRAMES }, (_, f) => drawCreatureFrame(look, f));
}
