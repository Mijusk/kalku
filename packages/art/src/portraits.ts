import { hex, newGrid, setPx, type Grid } from './grid.js';

/**
 * Retratos de los personajes de la historia (16×16), dibujados como texto:
 * una letra por píxel y una paleta por retrato ('.' = transparente).
 * Contorno oscuro y luz desde arriba a la izquierda, como el resto.
 * Se ven en la caja de diálogo, ampliados sin suavizar.
 */
export const PORTRAIT_SIZE = 16;

export type PortraitId = 'uni' | 'tecla' | 'bruno' | 'lina' | 'pedrolo' | 'borron' | 'borroncito';

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
