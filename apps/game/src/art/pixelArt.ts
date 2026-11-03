import type { CreatureId } from '@kalku/content';
import type Phaser from 'phaser';

/**
 * Sprites provisionales dibujados como texto: cada carácter es un píxel y
 * la paleta dice su color ('.' = transparente). Sirven para el prototipo
 * hasta que elijamos el pack de pixel art; entonces se cargan PNG en
 * BootScene con las mismas claves y el resto del juego no cambia.
 */
export type Palette = Record<string, number>;

export function createPixelTexture(scene: Phaser.Scene, key: string, rows: readonly string[], palette: Palette): void {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color === undefined) return;
      g.fillStyle(color, 1);
      g.fillRect(x, y, 1, 1);
    });
  });
  g.generateTexture(key, width, height);
  g.destroy();
}

export const PALETTE: Palette = {
  k: 0x1b2a1f, // contorno
  s: 0xf2c79b, // piel
  h: 0x6b3e26, // pelo
  r: 0xd9534f, // ropa roja
  b: 0x3b6fb6, // azul
  w: 0xffffff,
  y: 0xf4c542, // amarillo
  o: 0xe08a2c, // naranja
  g: 0x5fa84f, // hierba
  G: 0x4a8f3e, // hierba oscura
  f: 0xf7e26b, // flor
  p: 0xd77bba, // flor rosa
  l: 0x9ad46a, // verde claro (Sumus Brote)
  t: 0x3f9a4a, // verde trébol
  d: 0x8a5a33, // madera (Sumus Roble)
  c: 0x7cc6e8, // celeste (Restus Gota)
  a: 0xb7c0c7, // gris niebla (Restus Bruma)
  n: 0x5b4a7a, // morado oscuro (Restus Sombra)
};

export const HERO = [
  '....kkkkkk....',
  '...khhhhhhk...',
  '..khhhhhhhhk..',
  '..khsssssshk..',
  '..kskssssksk..',
  '..kssssssssk..',
  '...kssrrssk...',
  '....kkkkkk....',
  '...krrrrrrk...',
  '..krrrrrrrrk..',
  '..ksrrrrrrsk..',
  '..ksrrrrrrsk..',
  '...kbbbbbbk...',
  '...kbbkkbbk...',
  '...kbbk.kbbk..',
  '...kkk...kkk..',
];

/** Criatura de tipo Suma (provisional): un bichito amarillo con un «+». */
export const CREATURE_ADD = [
  '.....kkkkkk.....',
  '...kkyyyyyykk...',
  '..kyyyyyyyyyyk..',
  '.kyyyyyyyyyyyyk.',
  '.kyykwyyyykwyyk.',
  'kyyykkyyyykkyyyk',
  'kyyyyyyoyyyyyyyk',
  'kyyyyyoooyyyyyyk',
  'kyyyyyyoyyyyyyyk',
  'kyyyyyyyyyyyyyyk',
  '.kyykyyyyyykyyk.',
  '.kyyykkkkkkyyyk.',
  '..kyyyyyyyyyyk..',
  '...kkyyyyyykk...',
  '...kyk....kyk...',
  '...kk......kk...',
];

/** Criatura de tipo Resta (provisional): azul con un «−». */
export const CREATURE_SUB = CREATURE_ADD.map((row) => row.replace(/y/g, 'b')).map((row, i) =>
  i === 7 ? 'kbbbbooooobbbbbk' : i === 6 || i === 8 ? row.replace(/o/g, 'b') : row,
);

/** Cambia un color del sprite por otro. */
function recolor(rows: readonly string[], from: string, to: string): string[] {
  return rows.map((row) => row.split(from).join(to));
}

/**
 * Sprites provisionales de las criaturas de Pradera Uno (`@kalku/content`):
 * los sumus llevan el «+» y los restus el «−», cada uno de su color.
 * El tipo obliga a que toda criatura tenga su sprite.
 */
export const CREATURE_SPRITES: Record<CreatureId, readonly string[]> = {
  'sumus-brote': recolor(CREATURE_ADD, 'y', 'l'),
  'sumus-trebol': recolor(CREATURE_ADD, 'y', 't'),
  'sumus-roble': recolor(CREATURE_ADD, 'y', 'd'),
  'restus-gota': recolor(CREATURE_SUB, 'b', 'c'),
  'restus-bruma': recolor(CREATURE_SUB, 'b', 'a'),
  'restus-sombra': recolor(CREATURE_SUB, 'b', 'n'),
};

export const GRASS = [
  'gggggggg',
  'ggGggggg',
  'gggggGgg',
  'gggggggg',
  'gGgggggg',
  'ggggggGg',
  'gggGgggg',
  'gggggggg',
];

export const FLOWERS = [
  'gggggggg',
  'ggfggggg',
  'gfyfgggg',
  'ggfggpgg',
  'gggggpgg',
  'gggpgpgg',
  'ggpppggg',
  'gggpgggg',
];
