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
  a: 0x3b8fd6, // agua
  l: 0x8fd0f2, // brillo del agua
  e: 0xe3c98a, // arena de la orilla
  d: 0xc49a5a, // tierra del camino
  D: 0xa67c43, // tierra oscura
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

export const WATER = [
  'aaaaaaaa',
  'aalaaaaa',
  'aaaaaala',
  'aaaaaaaa',
  'alaaaaaa',
  'aaaaalaa',
  'aaaaaaaa',
  'aaalaaaa',
];

export const PATH = [
  'dddddddd',
  'ddDddddd',
  'dddddDdd',
  'dddddddd',
  'dDdddddd',
  'ddddddDd',
  'dddDdddd',
  'dddddddd',
];

/**
 * Variante de una casilla con orilla (autotiling provisional). `mask` es la
 * máscara de lados de `@kalku/world` (N=1, E=2, S=4, W=8): en cada lado que
 * NO está unido se pinta una franja de `edge`. Así, de un solo dibujo salen
 * las 16 variantes. Con el pack de gráficos esto se sustituye por sus PNG.
 */
export function edgedTile(mask: number, fill: readonly string[], edge: string): string[] {
  const open = { n: (mask & 1) === 0, e: (mask & 2) === 0, s: (mask & 4) === 0, w: (mask & 8) === 0 };
  const last = fill.length - 1;
  return fill.map((row, y) =>
    [...row]
      .map((ch, x) => {
        const onEdge = (open.n && y === 0) || (open.s && y === last) || (open.w && x === 0) || (open.e && x === row.length - 1);
        return onEdge ? edge : ch;
      })
      .join(''),
  );
}
