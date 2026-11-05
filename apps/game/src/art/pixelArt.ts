import type Phaser from 'phaser';

/**
 * Sprites dibujados como texto: cada carácter es un píxel y la paleta dice
 * su color ('.' = transparente). Solo queda el personaje del jugador, hasta
 * que se haga por capas en su propia tarea; el mundo y las criaturas los
 * genera `@kalku/art`.
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
