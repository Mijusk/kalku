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
  a: 0x3b8fd6, // agua
  l: 0x8fd0f2, // brillo del agua
  e: 0xe3c98a, // arena de la orilla
  d: 0xc49a5a, // tierra del camino
  D: 0xa67c43, // tierra oscura
  n: 0x2e6b34, // copa del árbol
  N: 0x1f4f27, // sombra del árbol
  t: 0x6b4a2b, // tronco
  R: 0xb8432f, // tejado rojo
  W: 0xe9dcc0, // pared
  v: 0x7a3ea0, // marca del jefe
  // Criaturas de Pradera Uno (números para no chocar con las letras del mapa)
  '1': 0x9ad46a, // verde claro (Sumus Brote)
  '2': 0x3f9a4a, // verde trébol (Sumus Trébol)
  '3': 0x8a5a33, // madera (Sumus Roble)
  '4': 0x7cc6e8, // celeste (Restus Gota)
  '5': 0xb7c0c7, // gris niebla (Restus Bruma)
  '6': 0x5b4a7a, // morado oscuro (Restus Sombra)
};

/**
 * Dibuja varios sprites seguidos en una sola textura (una tira), cada píxel
 * de `scale` × `scale`. Sirve de tileset para un tilemap de Phaser: el
 * fotograma i es el sprite i de `frames`.
 */
export function createPixelSheet(
  scene: Phaser.Scene,
  key: string,
  frames: readonly (readonly string[])[],
  palette: Palette,
  scale: number,
): void {
  const size = Math.max(...frames.map((rows) => rows.length));
  const texture = scene.textures.createCanvas(key, frames.length * size * scale, size * scale);
  if (texture === null) throw new Error(`No se pudo crear la textura ${key}`);
  const ctx = texture.getContext();
  frames.forEach((rows, frame) => {
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = palette[ch];
        if (color === undefined) return;
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.fillRect((frame * size + x) * scale, y * scale, scale, scale);
      });
    });
  });
  texture.refresh();
}

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
  'sumus-brote': recolor(CREATURE_ADD, 'y', '1'),
  'sumus-trebol': recolor(CREATURE_ADD, 'y', '2'),
  'sumus-roble': recolor(CREATURE_ADD, 'y', '3'),
  'restus-gota': recolor(CREATURE_SUB, 'b', '4'),
  'restus-bruma': recolor(CREATURE_SUB, 'b', '5'),
  'restus-sombra': recolor(CREATURE_SUB, 'b', '6'),
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

export const TALL_GRASS = [
  'gGggGggg',
  'gGgGGgGg',
  'GgGgGGgG',
  'gggggggg',
  'ggGggGgg',
  'gGGgGGgG',
  'GgGGgGgG',
  'gggggggg',
];

export const TREE = [
  'ggnnnngg',
  'gnnnnnng',
  'nnnNnnnn',
  'nnnnnNnn',
  'gnNnnnng',
  'ggnnnngg',
  'gggttggg',
  'ggGttGgg',
];

/** Casa (provisional): cada casilla es un trozo de tejado sobre pared. */
export const HOUSE = [
  'RRRRRRRR',
  'RkRRRRkR',
  'RRRRRRRR',
  'WWWWWWWW',
  'WkkWWkkW',
  'WkkWWkkW',
  'WWWWWWWW',
  'WWWWWWWW',
];

/** Tienda (provisional): como la casa, con tejado azul. */
export const SHOP = HOUSE.map((row) => row.replace(/R/g, 'b'));

/** Casilla del jefe (provisional): una marca en el suelo. */
export const BOSS = [
  'gggggggg',
  'gvggggvg',
  'ggvggvgg',
  'gggvvggg',
  'gggvvggg',
  'ggvggvgg',
  'gvggggvg',
  'gggggggg',
];
