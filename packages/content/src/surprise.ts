import { createRng } from '@kalku/exercises';
import type { Point, RegionMap } from '@kalku/world';
import { OUTFIT_PIECES, type OutfitPiece } from './outfit.js';
import { textSeed } from './missions.js';

/**
 * Cofre sorpresa del día (docs/DECISIONS.md, 27 nov 2026).
 *
 * Cada día aparece un cofre en el mapa. Para abrirlo hay que resolver un
 * ejercicio. Pensado para que un colegio no lo vea como una apuesta:
 * - No se compra ni se consigue con Cifras, ni da más cofres por pagar o por jugar más.
 * - No hay rarezas ni probabilidades: dentro está siempre la siguiente pieza
 *   de la lista de regalos que el niño aún no tiene (nunca repetida). Cuando
 *   ya las tiene todas, da unas pocas Cifras fijas.
 * - Uno al día, igual para todos (la fecha de Madrid fija el sitio); no se acumulan
 *   ni se pierde nada por no entrar.
 */
export const SURPRISE = {
  /** Cifras del cofre cuando ya se tienen todos los regalos. */
  coinsWhenComplete: 30,
  /** Distancia mínima (en cruz) del cofre a la entrada del mapa, para que haya que buscarlo un poco. */
  minDistance: 6,
} as const;

/** Los regalos del cofre, en el orden en que salen. */
export function giftPieces(): OutfitPiece[] {
  return OUTFIT_PIECES.filter((p) => p.get?.kind === 'gift');
}

/** El siguiente regalo que no tiene (o `undefined` si ya los tiene todos). */
export function nextGift(owned: readonly string[]): OutfitPiece | undefined {
  return giftPieces().find((p) => !owned.includes(p.id));
}

/** ¿Queda cofre hoy? `lastDay` es el día (AAAA-MM-DD) del último que abrió. */
export function surpriseAvailable(lastDay: string | null, today: string): boolean {
  return lastDay !== today;
}

export type SurpriseResult =
  | { readonly gift: OutfitPiece; readonly coins: 0; readonly owned: string[] }
  | { readonly gift: undefined; readonly coins: number; readonly owned: string[] };

/**
 * Lo que da el cofre al abrirlo. No muta: devuelve la lista nueva de piezas.
 * `undefined` si hoy ya lo abrió.
 */
export function openSurprise(owned: readonly string[], lastDay: string | null, today: string): SurpriseResult | undefined {
  if (!surpriseAvailable(lastDay, today)) return undefined;
  const gift = nextGift(owned);
  if (gift) return { gift, coins: 0, owned: [...owned, gift.id] };
  return { gift: undefined, coins: SURPRISE.coinsWhenComplete, owned: [...owned] };
}

const FREE: ReadonlySet<string> = new Set(['grass', 'flowers']);

/**
 * Dónde está el cofre hoy en esta región: una casilla de hierba o flores a la
 * que se llega andando desde la entrada (sin abrir zonas), fuera de los lugares
 * hechos a mano y lejos de la entrada. Misma región y día → misma casilla.
 */
export function surpriseSpot(map: RegionMap, regionId: string, day: string): Point | undefined {
  const { width, height, tiles } = map;
  const walk = new Set(['grass', 'tallGrass', 'flowers', 'path', 'chest', 'boss']);
  const inPlace = (x: number, y: number): boolean => map.places.some((p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height);
  // Casillas a las que se llega desde la entrada.
  const seen = new Uint8Array(tiles.length);
  const start = map.entrance.y * width + map.entrance.x;
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head] as number;
    const x = i % width;
    const y = Math.floor(i / width);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (seen[n] || !walk.has(tiles[n] ?? '')) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  const candidates: Point[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (!seen[i] || !FREE.has(tiles[i] ?? '')) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    if (inPlace(x, y)) continue;
    if (Math.abs(x - map.entrance.x) + Math.abs(y - map.entrance.y) < SURPRISE.minDistance) continue;
    candidates.push({ x, y });
  }
  if (candidates.length === 0) return undefined;
  return createRng(textSeed(`cofre:${regionId}:${day}`)).pick(candidates);
}

/** Lee el día del último cofre abierto (AAAA-MM-DD) o `null`. */
export function parseSurpriseDay(raw: unknown): string | null {
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
