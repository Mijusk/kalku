import { hex, newGrid, setPx, type Grid } from './grid.js';

/**
 * Personajes y objetos de la historia en el mapa, dibujados como texto
 * (una letra por píxel, '.' transparente). Personas de 16×16 como el
 * personaje; el Borrón del mapa, de 32×32. Contorno oscuro y luz desde
 * arriba a la izquierda.
 */
export type MapSpriteId = 'tecla' | 'bruno' | 'lina' | 'pedrolo' | 'uni' | 'borron' | 'borroncito' | 'crystal-off' | 'crystal-on' | 'plank' | 'bridge-broken' | 'bridge-fixed';

interface SpriteSpec {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

const K = '#1b2a1f';

export const MAP_SPRITES: Readonly<Record<MapSpriteId, SpriteSpec>> = {
  tecla: {
    rows: [
      '.....kkkk.......',
      '....kggggk......',
      '...kkggggkk.....',
      '...kgggggggk....',
      '...ksksskssk....',
      '...kssssssk.....',
      '....kssssk......',
      '...kmmymmmk.....',
      '..kmmmymmmmk....',
      '..ksmmymmmsk.b..',
      '..kmmmmmmmmkkb..',
      '..kmmmmmmmmk.b..',
      '...kmmmmmmk..b..',
      '...kpppppk...b..',
      '....kk.kk....b..',
      '...kkk.kkk...b..',
    ],
    palette: { k: K, g: '#c9c4d6', s: '#f2c79b', m: '#7a4fa3', y: '#f4c542', p: '#5b3a7a', b: '#8a5a2b' },
  },
  bruno: {
    rows: [
      '....kkkkkkkk....',
      '...krrrrrrrrk...',
      '..kkkkkkkkkkkk..',
      '...kssssssssk...',
      '...kskssssksk...',
      '...kbsssssbbk...',
      '...kbbbbbbbbk...',
      '....kbbbbbbk....',
      '..kooooooooook..',
      '.kooooooooooook.',
      '.ksoooooooooosk.',
      '.ksooyyyyyyoosk.',
      '..koooooooooook.',
      '...kddkkkkddk...',
      '...kddk..kddk...',
      '...kkkk..kkkk...',
    ],
    palette: { k: K, r: '#c8452f', s: '#e8b68a', b: '#6b3e26', o: '#3b6fb6', y: '#8a5a2b', d: '#3b2a20' },
  },
  lina: {
    rows: [
      '......kwk.......',
      '....kkyyykk.....',
      '...kyyyyyyyk....',
      '..kkkkkkkkkkk...',
      '..knsssssssnk...',
      '..knskssksnnk...',
      '..knsssssssnk...',
      '...knsssssnk....',
      '...kggggggggk...',
      '..kggggggggggk..',
      '..ksggggggggsk..',
      '..ksggbbbbggsk..',
      '...kggggggggk...',
      '....kddkkddk....',
      '....kddk.kddk...',
      '....kkkk.kkkk...',
    ],
    palette: { k: K, w: '#fff6c2', y: '#f4c542', n: '#e0782f', s: '#f2c79b', g: '#4f9a5c', b: '#8a5a2b', d: '#3b2a20' },
  },
  pedrolo: {
    rows: [
      '..kkkkkkkkkkkk..',
      '.kmmmllllllllpk.',
      '.kllllllllllppk.',
      '.kllkkllllkklpk.',
      '.kllkyllllkylpk.',
      '.kllllllllllppk.',
      '.klllkkkkklllpk.',
      '.klllllllllllpk.',
      'kkllllllllllllpk',
      'klllllllllllllpk',
      'klllllllllllllpk',
      'kplllllllllllppk',
      '.kpllllllllpppk.',
      '.kpppkkkkkpppk..',
      '.kkkkk...kkkkk..',
      '................',
    ],
    palette: { k: K, l: '#a9a39a', p: '#7d776f', m: '#5fae3f', y: '#ffd84a' },
  },
  uni: {
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.......ww.......',
      '.....kkkkk......',
      '....kwyyyyk.....',
      '....kyykykk.....',
      '....kyyyyyk.....',
      '.....koook......',
      '......kk........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { k: K, w: '#ffffff', y: '#ffd84a', o: '#e8a020' },
  },
  borron: {
    rows: [
      '................................',
      '..........kkkk....kkkk..........',
      '........kkllllkkkkllllkk........',
      '......kkllllgggggggglllkk.......',
      '.....kllgggggggggggggggglk......',
      '....klgggggggggggggggggggk......',
      '...klggggggggggggggggggggk......',
      '..kkgggggggggggggggggggggkk.....',
      '.klgggwwwwkggggggwwwwkggggk.....',
      '.kgggwwwwkkkggggwwwwkkkgggk.....',
      'klgggwwwkkkkggggwwwkkkkgggkk....',
      'kgggwwwwkkkkggggwwwkkkkggggk....',
      'kgggwwwwwkkwggggwwwwkkwggggk....',
      'kgggwwwwwwwwggggwwwwwwwggggk....',
      'kggggwwwwwwgggggggwwwwgggggk....',
      'kgggggggggggggggggggggggggggk...',
      'kggggggkkkkkkkkkkkkkkgggggggk...',
      'kgggggkrrrrrrrrrrrrrrkggggggk...',
      'kgggggkrrwkrrrrrrwkrrkggggggk...',
      'kggggggkrrrrrrrrrrrrkgggggggk...',
      'kgggggggkkkkkkkkkkkkggggggggk...',
      '.kgggggggggggggggggggggggggdk...',
      '.kdggggggggggggggggggggggggdk...',
      '..kdgggggggggggggggggggggddk....',
      '..kddggdggggdggggdgggggdddk.....',
      '...kddddgddddgddddgdddddkk......',
      '....kkddkddkkddkkddkddkk........',
      '......kkkkk.kkkk.kkkkk..........',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
    palette: { k: K, l: '#d6d1e2', g: '#9a94a8', d: '#6c6680', w: '#ffffff', r: '#c0516a' },
  },
  borroncito: {
    rows: [
      '................',
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkllggkk....',
      '...klgggggggk...',
      '..klgwkggwkggk..',
      '..kggkkggkkggk..',
      '..kpgggggggpgk..',
      '..kggkkkkkkggk..',
      '...kdggggggdk...',
      '....kkdkkdkk....',
      '................',
      '................',
      '................',
    ],
    palette: { k: K, l: '#e3dfec', g: '#b4aec2', d: '#7d7790', w: '#ffffff', p: '#ff9fb4' },
  },
  'crystal-off': {
    rows: [
      '................',
      '.......kk.......',
      '......kddk......',
      '.....kdmmdk.....',
      '....kdmmmmdk....',
      '....kdmmmmdk.k..',
      '...kdmmmmmmdkdk.',
      '...kdmmmmmmdkmk.',
      '...kdmmmmmmdkmk.',
      '...kdmmmmmmdkdk.',
      '....kdmmmmdk.k..',
      '..kkkkkkkkkkkkk.',
      '.kppppppppppppk.',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
    ],
    palette: { k: K, d: '#4b4658', m: '#6c6680', p: '#5a5476' },
  },
  'crystal-on': {
    rows: [
      '.......w........',
      '.......kk.......',
      '......kwck......',
      '.....kwcccbk....',
      '....kwccccbk....',
      '....kwccccbk.k..',
      '..w.kwccccccbkwk',
      '...kwccccccbkck.',
      '...kwccccccbkck.',
      '...kwccccccbkbk.',
      '....kccccccbk.k.',
      '..kkkkkkkkkkkkk.',
      '.kppppppppppppk.',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
    ],
    palette: { k: K, w: '#ffffff', c: '#8fe8ff', b: '#3fa8d8', p: '#5a5476' },
  },
  plank: {
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.kkkkkkkkkkkkkk.',
      'kooooooooooooook',
      'kowooooodoooooodk',
      'koooooooooooodok',
      'kddddddddddddddk',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ].map((r) => r.slice(0, 16)),
    palette: { k: K, o: '#c98a4b', w: '#e8b878', d: '#8a5a2b' },
  },
  'bridge-broken': {
    rows: [
      'k..............k',
      'kk............kk',
      'kok..........kok',
      'kok..........kok',
      'kok..........kok',
      'kokk........kkok',
      'kodk........kdok',
      'kodk..kk....kdok',
      'kok...kok....kok',
      'kok...kdk....kok',
      'kok....k.....kok',
      'kok..........kok',
      'kok..........kok',
      'kok..........kok',
      'kok..........kok',
      'kk............kk',
    ],
    palette: { k: K, o: '#c98a4b', d: '#8a5a2b' },
  },
  'bridge-fixed': {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'koooooooooooooook',
      'kddddddddddddddk',
      'kkkkkkkkkkkkkkkk',
      'koooooooooooooook',
      'kddddddddddddddk',
      'kkkkkkkkkkkkkkkk',
      'koooooooooooooook',
      'kddddddddddddddk',
      'kkkkkkkkkkkkkkkk',
      'koooooooooooooook',
      'kddddddddddddddk',
      'kkkkkkkkkkkkkkkk',
      'koooooooooooooook',
      'kddddddddddddddk',
      'kkkkkkkkkkkkkkkk',
    ].map((r) => r.slice(0, 16)),
    palette: { k: K, o: '#c98a4b', d: '#8a5a2b' },
  },
};

/** Dibuja un sprite del mapa. */
export function drawMapSprite(id: MapSpriteId): Grid {
  const spec = MAP_SPRITES[id];
  const width = Math.max(...spec.rows.map((r) => r.length));
  const g = newGrid(width, spec.rows.length);
  spec.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = spec.palette[ch];
      if (color !== undefined) setPx(g, x, y, hex(color));
    });
  });
  return g;
}

/** Errores de los datos: filas del mismo ancho y letras con color. */
export function validateMapSprites(): string[] {
  const errors: string[] = [];
  for (const [id, spec] of Object.entries(MAP_SPRITES)) {
    const width = spec.rows[0]?.length ?? 0;
    spec.rows.forEach((row, y) => {
      if (row.length !== width) errors.push(`${id}: la fila ${y} mide ${row.length} y no ${width}`);
      for (const ch of row) if (ch !== '.' && spec.palette[ch] === undefined) errors.push(`${id}: letra sin color «${ch}»`);
    });
  }
  return errors;
}
