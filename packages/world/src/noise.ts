import type { Rng } from '@kalku/exercises';

/**
 * Ruido de valor (value noise) con varias octavas.
 *
 * Se pone un valor aleatorio en cada punto de una rejilla gruesa y se
 * interpola suavemente entre ellos. Sale un campo continuo: casillas
 * vecinas tienen valores parecidos, así que al cortar por un umbral
 * aparecen manchas (lagos, bosques) en vez de casillas sueltas.
 *
 * Devuelve un valor en [0, 1) por casilla, por filas (y * width + x).
 */
export function valueNoise(
  width: number,
  height: number,
  cellSize: number,
  octaves: number,
  rng: Rng,
): Float64Array {
  const out = new Float64Array(width * height);
  let amplitude = 1;
  let totalAmplitude = 0;

  for (let octave = 0; octave < octaves; octave++) {
    const size = Math.max(1, cellSize / 2 ** octave);
    const gridW = Math.floor((width - 1) / size) + 2;
    const gridH = Math.floor((height - 1) / size) + 2;
    const lattice = Array.from({ length: gridW * gridH }, () => rng.next());
    const at = (gx: number, gy: number): number => lattice[gy * gridW + gx] ?? 0;

    for (let y = 0; y < height; y++) {
      const fy = y / size;
      const gy = Math.floor(fy);
      const ty = smoothstep(fy - gy);
      for (let x = 0; x < width; x++) {
        const fx = x / size;
        const gx = Math.floor(fx);
        const tx = smoothstep(fx - gx);
        const top = lerp(at(gx, gy), at(gx + 1, gy), tx);
        const bottom = lerp(at(gx, gy + 1), at(gx + 1, gy + 1), tx);
        const i = y * width + x;
        out[i] = (out[i] ?? 0) + amplitude * lerp(top, bottom, ty);
      }
    }

    totalAmplitude += amplitude;
    amplitude /= 2;
  }

  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / totalAmplitude;
  return out;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
