import { hex, newGrid, setPx, type Grid } from './grid.js';

/**
 * Retratos de los personajes de la historia (16×16), dibujados como texto:
 * una letra por píxel y una paleta por retrato ('.' = transparente).
 * Contorno oscuro y luz desde arriba a la izquierda, como el resto.
 * Se ven en la caja de diálogo, ampliados sin suavizar.
 */
export const PORTRAIT_SIZE = 16;

export type PortraitId = 'uni' | 'tecla' | 'bruno' | 'lina' | 'pedrolo' | 'borron' | 'borroncito' | 'olma' | 'cuco' | 'enredo' | 'ovillo';

interface PortraitSpec {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

const OUTLINE = '#1b2a1f';

export const PORTRAITS: Readonly<Record<PortraitId, PortraitSpec>> = {
  // Uni: una lucecita amarilla con forma de 1 y ojos grandes.
  uni: {
    rows: [
      '................',
      '......kkkk......',
      '.....kwyyyk.....',
      '....kwyyyyk.....',
      '...kyyyyyyk.....',
      '...kkkyyyyk.....',
      '.....kyyyyk.....',
      '....kyykyykk....',
      '....kyywyywk....',
      '....kyykyykk....',
      '.....koyyook....',
      '.....kyyyyk.....',
      '...kkyyyyyykk...',
      '...kooooooook...',
      '....kkkkkkkk....',
      '................',
    ],
    palette: { k: OUTLINE, y: '#ffd84a', w: '#ffffff', o: '#e8a020' },
  },
  // Abuela Tecla: moño gris, gafas y chal morado.
  tecla: {
    rows: [
      '......kkkk......',
      '.....kggggk.....',
      '....kkggggkk....',
      '...kgggggggkk...',
      '..kggsssssggk...',
      '..kgsssssssgk...',
      '..kskkskkskks...',
      '..kskwskwskss...',
      '..kskkskkskks...',
      '..ksssssssssk...',
      '...kssprrsssk...',
      '....kssssssk....',
      '...kkmmymmmkk...',
      '..kmmmmymmmmmk..',
      '.kmmmmmymmmmmmk.',
      '.kkkkkkkkkkkkkk.',
    ],
    palette: { k: OUTLINE, g: '#c9c4d6', s: '#f2c79b', w: '#ffffff', p: '#e39a7f', r: '#b8432f', m: '#7a4fa3', y: '#f4c542' },
  },
  // Bruno: gorra roja y barba castaña.
  bruno: {
    rows: [
      '................',
      '....kkkkkkkk....',
      '...krrrrrrrrk...',
      '..krrwrrrrrrrk..',
      '..kkkkkkkkkkkkk.',
      '..ksssssssssk...',
      '..ksskksskssk...',
      '..ksskksskssk...',
      '..ksssssssssk...',
      '..kbsssppsssbk..',
      '..kbbbbbbbbbbk..',
      '...kbbbrrbbbk...',
      '....kbbbbbbk....',
      '..kkoookkoookk..',
      '.kooooooooooook.',
      '.kkkkkkkkkkkkkk.',
    ],
    palette: { k: OUTLINE, r: '#c8452f', w: '#ff8a70', s: '#e8b68a', b: '#6b3e26', p: '#c98a5f', o: '#3b6fb6' },
  },
  // Lina: casco amarillo con linterna y pelo naranja.
  lina: {
    rows: [
      '......kkkk......',
      '.....kwwwwk.....',
      '...kkkyyyykkk...',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '.kkkkkkkkkkkkkk.',
      '.knnsssssssnnk..',
      '.knsskssskssnk..',
      '.knsskssskssnk..',
      '.knssssssssnnk..',
      '..knsssrrssnk...',
      '..knnssssssnk...',
      '...kkggggggkk...',
      '..kgggggggggk...',
      '.kgggggggggggk..',
      '.kkkkkkkkkkkkk..',
    ],
    palette: { k: OUTLINE, w: '#fff6c2', y: '#f4c542', n: '#e0782f', s: '#f2c79b', r: '#d9534f', g: '#4f9a5c' },
  },
  // Pedrolo: guardián de piedra con musgo.
  pedrolo: {
    rows: [
      '...kkkkkkkkkk...',
      '..kmmmmllllllk..',
      '.kmmlllllllllpk.',
      '.kllllllllllppk.',
      '.kllkkklkkklppk.',
      '.kllkykllkyklpk.',
      '.kllkkklkkklppk.',
      '.klllllllllllpk.',
      '.kllllkkkllllpk.',
      '.klllllllllllpk.',
      '.kllkkkkkkkllpk.',
      '.klllllllllllpk.',
      '.kplllllllllppk.',
      '.kpplllllllpppk.',
      '.kkkkkkkkkkkkkk.',
      '................',
    ],
    palette: { k: OUTLINE, l: '#a9a39a', p: '#7d776f', m: '#5fae3f', y: '#ffd84a' },
  },
  // Gran Borrón: nube gris de goma de borrar, ojos enormes y boca abierta.
  borron: {
    rows: [
      '................',
      '....kkk..kkk....',
      '...kllgkkglgk...',
      '..kllggggggggk..',
      '.klgggggggggggk.',
      '.kgwwkgggwwkggk.',
      '.kgwkkgggwkkggk.',
      '.kgwkkgggwkkggk.',
      '.kggggggggggggk.',
      '.kggkkkkkkkkggk.',
      '.kggkrrrrrrkggk.',
      '.kgggkwkkwkgggk.',
      '..kgggggggggdk..',
      '..kdgdggdgddk...',
      '...kkdkkdkkk....',
      '................',
    ],
    palette: { k: OUTLINE, l: '#d6d1e2', g: '#9a94a8', d: '#6c6680', w: '#ffffff', r: '#c0516a' },
  },
  // Borroncito: el Borrón pequeño y contento.
  borroncito: {
    rows: [
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkllggkk....',
      '...klgggggggk...',
      '..klggggggggk...',
      '..kgwkggwkgggk..',
      '..kgkkggkkgggk..',
      '..kpgggggggpgk..',
      '..kggkggggkggk..',
      '..kgggkkkkgggk..',
      '...kdggggggdk...',
      '....kkdkkdkk....',
      '................',
      '................',
    ],
    palette: { k: OUTLINE, l: '#e3dfec', g: '#b4aec2', d: '#7d7790', w: '#ffffff', p: '#ff9fb4' },
  },
  // Olma: guardabosques del Bosque de las Decenas, con capucha verde.
  olma: {
    rows: [
      '.....kkkkkk.....',
      '...kkhhhgggkk...',
      '..khhhgggggggk..',
      '..khggggggggggk.',
      '.kgggkkkkkkgggk.',
      '.kggksssssskggk.',
      '.kgksseesseskgk.',
      '.kgksswksswkskk.',
      '.kgkssssssssk...',
      '.kkksssrrsssk...',
      '...kkssssssk....',
      '....kkssssk.....',
      '...kccckkccck...',
      '..kcccbbbbccck..',
      '.kcccccbbcccccck',
      '.kkkkkkkkkkkkkkk',
    ],
    palette: { k: OUTLINE, h: '#6fb55a', g: '#3f7d3a', s: '#b9825a', e: OUTLINE, w: '#ffffff', r: '#8a4a3a', c: '#7a5230', b: '#d9b24a' },
  },
  // Cuco: el búho de los acertijos del bosque.
  cuco: {
    rows: [
      '................',
      '...kk......kk...',
      '...kbk....kbk...',
      '...kbbkkkkbbk...',
      '..kbbbbbbbbbbk..',
      '..kbwwkbbkwwbk..',
      '..kbwkwbbwkwbk..',
      '..kbwwkoowwwbk..',
      '..kbbbkookbbbk..',
      '..kblllllllbbk..',
      '..kbllkllklbbk..',
      '..kblllllllbbk..',
      '...kbllkllbbk...',
      '....kbbbbbbk....',
      '....kokkkkok....',
      '...kokk..kkok...',
    ],
    palette: { k: OUTLINE, b: '#8a6a4a', w: '#fff6d8', o: '#f2a33a', l: '#d9c09a' },
  },
  // Gran Enredo: una maraña de lianas que lía las decenas con las unidades.
  enredo: {
    rows: [
      '................',
      '................',
      '................',
      '.....kkkkkkk....',
      '....klllgdggk...',
      '...kldkggkdggk..',
      '..kdkkdggkkgdgk.',
      '..klwwwgdwwwddk.',
      '.kllwwkgdwwkgggk',
      '.klgwwkggwwkggdk',
      '.kgggggdggggdggk',
      '..kdggggdggggdk.',
      '..kgdrdrgrggggk.',
      '...kgdrgrgrdgk..',
      '....kgggdggdk...',
      '.....kkkkkkk....',
    ],
    palette: { k: OUTLINE, g: '#5fa046', d: '#32642d', l: '#aadc78', w: '#ffffff', r: '#c0516a', f: '#8cd264' },
  },
  // Ovillo: el Gran Enredo, ya desenredado.
  ovillo: {
    rows: [
      '................',
      '................',
      '........ff......',
      '.....kkkkkkk....',
      '....klllgdggk...',
      '...kldlgggdggk..',
      '..kdlldgggggdgk.',
      '..kllwwwdwwwddk.',
      '.kllgwkwdwkwgggk',
      '.klggwkwgwkwggdk',
      '.kgggggdggggdggk',
      '..kdggrgdgrggdk.',
      '..kgdgdrrrggggk.',
      '...kgdgggggdgk..',
      '....kgggdggdk...',
      '.....kkkkkkk....',
    ],
    palette: { k: OUTLINE, g: '#96cd78', d: '#5fa055', l: '#cdf0aa', w: '#ffffff', r: '#ff9fb4', f: '#8cd264' },
  },
};

/** Dibuja un retrato en una rejilla de 16×16. */
export function drawPortrait(id: PortraitId): Grid {
  const spec = PORTRAITS[id];
  const g = newGrid(PORTRAIT_SIZE, PORTRAIT_SIZE);
  spec.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = spec.palette[ch];
      if (color !== undefined) setPx(g, x, y, hex(color));
    });
  });
  return g;
}

/** Errores de los datos: filas de 16, letras con color. */
export function validatePortraits(): string[] {
  const errors: string[] = [];
  for (const [id, spec] of Object.entries(PORTRAITS)) {
    if (spec.rows.length !== PORTRAIT_SIZE) errors.push(`${id}: tiene ${spec.rows.length} filas`);
    spec.rows.forEach((row, y) => {
      if (row.length !== PORTRAIT_SIZE) errors.push(`${id}: la fila ${y} mide ${row.length}`);
      for (const ch of row) if (ch !== '.' && spec.palette[ch] === undefined) errors.push(`${id}: letra sin color «${ch}»`);
    });
  }
  return errors;
}
