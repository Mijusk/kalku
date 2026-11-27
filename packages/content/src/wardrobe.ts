import { levelForXp, type SkillId } from '@kalku/exercises';
import { getPiece, OUTFIT_PIECES, setPiece, type Outfit, type OutfitPiece } from './outfit.js';
import { ZONES } from './zones.js';

/**
 * El armario del niño: qué piezas tiene, cuáles puede comprar y por qué no
 * puede ponerse otras. Todo es estética: nada de aquí cambia el combate
 * (regla 1), y las Cifras se ganan solo resolviendo ejercicios.
 */

/** Lo que hace falta del progreso para saber qué piezas tiene. */
export interface WardrobeState {
  /** Piezas compradas en la tienda o sacadas del cofre sorpresa (ids). */
  owned: readonly string[];
  /** Tesoros de los cofres de las zonas (ids de `zones.ts`). */
  treasures: readonly string[];
  /** Gemas de dominio ganadas (ids de habilidad). */
  gems: readonly string[];
  xp: number;
}

/** Por qué una pieza aún no se tiene, para el candado de la tarjeta. */
export type LockReason =
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'gem'; readonly gem: SkillId }
  | { readonly kind: 'treasure'; readonly zone: string }
  | { readonly kind: 'gift' }
  /** Se puede comprar ya: solo falta pagarla. */
  | { readonly kind: 'price'; readonly price: number };

/** Lo que hace falta de una pieza (de ropa o un mueble) para saber si se tiene. */
export type Ownable = Pick<OutfitPiece, 'id' | 'get'>;

/** ¿Tiene ya esta pieza? Las del principio, siempre; las demás según cómo se consiguen. */
export function ownsPiece(piece: Ownable, state: WardrobeState): boolean {
  const get = piece.get;
  if (!get) return true;
  switch (get.kind) {
    case 'shop':
    case 'gift':
      return state.owned.includes(piece.id);
    case 'treasure':
      return state.treasures.includes(get.treasure);
    case 'level':
      return levelForXp(state.xp) >= get.level;
    case 'gem':
      return state.gems.includes(get.gem);
  }
}

/** Lo que falta para tener la pieza (o `undefined` si ya se tiene). En la tienda, primero el nivel y la gema. */
export function lockReason(piece: Ownable, state: WardrobeState): LockReason | undefined {
  if (ownsPiece(piece, state)) return undefined;
  const get = piece.get;
  if (!get) return undefined;
  switch (get.kind) {
    case 'shop':
      if (get.minLevel !== undefined && levelForXp(state.xp) < get.minLevel) return { kind: 'level', level: get.minLevel };
      if (get.gem !== undefined && !state.gems.includes(get.gem)) return { kind: 'gem', gem: get.gem };
      return { kind: 'price', price: get.price };
    case 'treasure': {
      const zone = ZONES.find((z) => z.treasure.id === get.treasure);
      return { kind: 'treasure', zone: zone?.id ?? get.treasure };
    }
    case 'level':
      return { kind: 'level', level: get.level };
    case 'gem':
      return { kind: 'gem', gem: get.gem };
    case 'gift':
      return { kind: 'gift' };
  }
}

/** Las piezas de la tienda, en el orden de los datos (de más barata a más cara). */
export function shopPieces(): OutfitPiece[] {
  return OUTFIT_PIECES.filter((p) => p.get?.kind === 'shop');
}

export type BuyResult =
  | { readonly ok: true; readonly coins: number; readonly owned: string[] }
  | { readonly ok: false; readonly reason: 'not-for-sale' | 'owned' | 'locked' | 'coins' };

/**
 * Compra una pieza de la tienda. No muta nada: devuelve las Cifras que quedan y
 * la lista nueva. No se puede comprar dos veces, sin Cifras suficientes ni antes
 * de cumplir el nivel o la gema que pide.
 */
export function buyPiece(state: WardrobeState, coins: number, id: string): BuyResult {
  const piece = getPiece(id);
  if (piece?.get?.kind !== 'shop') return { ok: false, reason: 'not-for-sale' };
  if (ownsPiece(piece, state)) return { ok: false, reason: 'owned' };
  const lock = lockReason(piece, state);
  if (lock?.kind !== 'price') return { ok: false, reason: 'locked' };
  if (coins < lock.price) return { ok: false, reason: 'coins' };
  return { ok: true, coins: coins - lock.price, owned: [...state.owned, id] };
}

/** Se pone una pieza que tiene. Las que no tiene no se pueden poner. */
export function wearPiece(outfit: Outfit, state: WardrobeState, id: string): Outfit | undefined {
  const piece = getPiece(id);
  if (!piece || !ownsPiece(piece, state)) return undefined;
  return setPiece(outfit, piece.layer, id);
}

/**
 * Un atuendo guardado con piezas que ya no tiene (datos tocados a mano) se
 * queda con la pieza de por defecto en esa capa.
 */
export function ownedOutfit(outfit: Outfit, state: WardrobeState, fallback: Outfit): Outfit {
  let out = outfit;
  for (const [layer, id] of Object.entries(outfit) as [keyof Outfit, string][]) {
    const piece = getPiece(id);
    if (!piece || !ownsPiece(piece, state)) out = setPiece(out, layer, fallback[layer]);
  }
  return out;
}

/** Piezas nuevas que se han ganado entre dos estados (al subir de nivel, ganar una gema o abrir un cofre). */
export function newlyEarned(before: WardrobeState, after: WardrobeState): OutfitPiece[] {
  return OUTFIT_PIECES.filter((p) => p.get !== undefined && !ownsPiece(p, before) && ownsPiece(p, after));
}

/** Lee la lista guardada de piezas: solo ids que existen, sin repetir y que se compran o se regalan. */
export function parseOwned(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== 'string' || out.includes(id)) continue;
    const kind = getPiece(id)?.get?.kind;
    if (kind === 'shop' || kind === 'gift') out.push(id);
  }
  return out;
}
