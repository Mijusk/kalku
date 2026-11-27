import type { FurnitureArt, RampName } from '@kalku/art';
import type { PieceSource } from './outfit.js';
import { lockReason, ownsPiece, type WardrobeState } from './wardrobe.js';

/**
 * La casa del niño (27 nov 2026): una habitación propia en Pradera Uno que se
 * decora con muebles. Todo es estética, como la ropa: nada de aquí cambia el
 * combate, y los muebles se consiguen con Cifras (que solo se ganan
 * resolviendo), subiendo de nivel o con gemas de dominio.
 */

export interface FurniturePiece {
  readonly id: string;
  readonly name: { readonly es: string; readonly ca: string };
  readonly art: FurnitureArt;
  readonly color: RampName;
  /** Ancho en casillas. */
  readonly width: 1 | 2;
  /** Sin `get`, se tiene desde el principio. */
  readonly get?: PieceSource;
}

const f = (id: string, es: string, ca: string, art: FurnitureArt, color: RampName, width: 1 | 2, get?: PieceSource): FurniturePiece => ({
  id,
  name: { es, ca },
  art,
  color,
  width,
  ...(get ? { get } : {}),
});

/** Todos los muebles, en el orden del catálogo (los del principio y luego de más barato a más caro). */
export const FURNITURE: readonly FurniturePiece[] = [
  f('cama', 'Cama', 'Llit', 'bed', 'azul', 2),
  f('mesa', 'Mesa', 'Taula', 'table', 'rosa', 1),
  f('silla', 'Silla', 'Cadira', 'chair', 'verde', 1, { kind: 'shop', price: 60 }),
  f('planta', 'Planta', 'Planta', 'plant', 'naranja', 1, { kind: 'shop', price: 80 }),
  f('cojin', 'Cojín', 'Coixí', 'cushion', 'morado', 1, { kind: 'shop', price: 90 }),
  f('lampara', 'Lámpara', 'Llum', 'lamp', 'amarillo', 1, { kind: 'shop', price: 100 }),
  f('alfombra', 'Alfombra', 'Catifa', 'rug', 'rosa', 2, { kind: 'shop', price: 120 }),
  f('estanteria', 'Estantería', 'Prestatgeria', 'bookcase', 'naranja', 1, { kind: 'shop', price: 180 }),
  f('baul', 'Baúl de juguetes', 'Bagul de joguines', 'toybox', 'azul', 1, { kind: 'shop', price: 220 }),
  f('caballete', 'Caballete de pintar', 'Cavallet de pintar', 'easel', 'verde', 1, { kind: 'shop', price: 250, minLevel: 4 }),
  f('sofa', 'Sofá', 'Sofà', 'sofa', 'naranja', 2, { kind: 'shop', price: 300 }),
  f('alfombra-estrellas', 'Alfombra de estrellas', "Catifa d'estrelles", 'rug', 'morado', 2, { kind: 'shop', price: 350, minLevel: 6 }),
  f('acuario', 'Acuario', 'Aquari', 'aquarium', 'naranja', 1, { kind: 'shop', price: 400, minLevel: 5 }),
  f('trofeo-suma', 'Copa de las sumas', 'Copa de les sumes', 'trophy', 'verde', 1, { kind: 'gem', gem: 'add-within-10' }),
  f('trofeo-resta', 'Copa de las restas', 'Copa de les restes', 'trophy', 'azul', 1, { kind: 'gem', gem: 'sub-within-10' }),
  f('telescopio', 'Telescopio', 'Telescopi', 'telescope', 'morado', 1, { kind: 'level', level: 8 }),
];

export function getFurniture(id: string): FurniturePiece | undefined {
  return FURNITURE.find((p) => p.id === id);
}

/** Medidas del suelo de la habitación, en casillas. */
export const HOME = {
  width: 10,
  height: 4,
  /** Casillas junto a la puerta donde están el niño y su compañero: ahí no se pone nada. */
  reserved: [
    { x: 0, y: 3 },
    { x: 1, y: 3 },
  ],
} as const;

/** Un mueble colocado: su casilla de la izquierda. */
export interface PlacedFurniture {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface Home {
  /** Muebles comprados (ids). Los del principio y los ganados no hace falta guardarlos. */
  readonly owned: readonly string[];
  readonly placed: readonly PlacedFurniture[];
}

export const DEFAULT_HOME: Home = {
  owned: [],
  placed: [
    { id: 'cama', x: 7, y: 0 },
    { id: 'mesa', x: 4, y: 1 },
  ],
};

/** El estado para saber qué muebles se tienen: el del armario, pero con la lista de muebles comprados. */
export function homeState(wardrobe: WardrobeState, home: Home): WardrobeState {
  return { ...wardrobe, owned: home.owned };
}

export function ownsFurniture(piece: FurniturePiece, state: WardrobeState): boolean {
  return ownsPiece(piece, state);
}

export { lockReason as furnitureLock };

export type FurnitureBuyResult =
  | { readonly ok: true; readonly coins: number; readonly home: Home }
  | { readonly ok: false; readonly reason: 'not-for-sale' | 'owned' | 'locked' | 'coins' };

/** Compra un mueble con Cifras. No muta: devuelve las Cifras que quedan y la casa nueva. */
export function buyFurniture(home: Home, wardrobe: WardrobeState, coins: number, id: string): FurnitureBuyResult {
  const piece = getFurniture(id);
  if (piece?.get?.kind !== 'shop') return { ok: false, reason: 'not-for-sale' };
  const state = homeState(wardrobe, home);
  if (ownsPiece(piece, state)) return { ok: false, reason: 'owned' };
  const lock = lockReason(piece, state);
  if (lock?.kind !== 'price') return { ok: false, reason: 'locked' };
  if (coins < lock.price) return { ok: false, reason: 'coins' };
  return { ok: true, coins: coins - lock.price, home: { ...home, owned: [...home.owned, id] } };
}

const isRug = (id: string): boolean => getFurniture(id)?.art === 'rug';

/** Casillas que ocupa un mueble puesto en (x, y). */
export function cellsOf(piece: FurniturePiece, x: number, y: number): { x: number; y: number }[] {
  return Array.from({ length: piece.width }, (_, i) => ({ x: x + i, y }));
}

/**
 * ¿Cabe aquí? Dentro del suelo, fuera de las casillas del niño y sin pisar
 * otro mueble. Las alfombras van debajo: solo chocan con otras alfombras.
 * El propio mueble no cuenta (para poder moverlo un poco).
 */
export function canPlace(home: Home, id: string, x: number, y: number): boolean {
  const piece = getFurniture(id);
  if (!piece) return false;
  const rug = piece.art === 'rug';
  for (const c of cellsOf(piece, x, y)) {
    if (c.x < 0 || c.y < 0 || c.x >= HOME.width || c.y >= HOME.height) return false;
    if (HOME.reserved.some((r) => r.x === c.x && r.y === c.y)) return false;
    for (const other of home.placed) {
      if (other.id === id || isRug(other.id) !== rug) continue;
      const op = getFurniture(other.id);
      if (op && cellsOf(op, other.x, other.y).some((o) => o.x === c.x && o.y === c.y)) return false;
    }
  }
  return true;
}

/** Pone (o mueve) un mueble. `undefined` si no cabe ahí. */
export function placeFurniture(home: Home, id: string, x: number, y: number): Home | undefined {
  if (!canPlace(home, id, x, y)) return undefined;
  return { ...home, placed: [...home.placed.filter((p) => p.id !== id), { id, x, y }] };
}

/** Quita un mueble de la habitación (vuelve a la caja de muebles; no se pierde). */
export function removeFurniture(home: Home, id: string): Home {
  return { ...home, placed: home.placed.filter((p) => p.id !== id) };
}

/** El mueble que se toca en una casilla: primero lo que está encima de las alfombras. */
export function furnitureAt(home: Home, x: number, y: number): PlacedFurniture | undefined {
  const hits = home.placed.filter((p) => {
    const piece = getFurniture(p.id);
    return piece !== undefined && cellsOf(piece, p.x, p.y).some((c) => c.x === x && c.y === y);
  });
  return hits.find((p) => !isRug(p.id)) ?? hits[0];
}

/**
 * Lee la casa guardada. Solo muebles que existen; comprados solo si se venden;
 * colocados solo si se tienen y caben (lo que no cabe vuelve a la caja).
 */
export function parseHome(raw: unknown, wardrobe: WardrobeState): Home {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_HOME;
  const r = raw as { owned?: unknown; placed?: unknown };
  const owned: string[] = [];
  if (Array.isArray(r.owned)) {
    for (const id of r.owned) {
      if (typeof id === 'string' && !owned.includes(id) && getFurniture(id)?.get?.kind === 'shop') owned.push(id);
    }
  }
  let home: Home = { owned, placed: [] };
  const state = homeState(wardrobe, home);
  if (Array.isArray(r.placed)) {
    for (const p of r.placed) {
      if (typeof p !== 'object' || p === null) continue;
      const { id, x, y } = p as { id?: unknown; x?: unknown; y?: unknown };
      if (typeof id !== 'string' || !Number.isInteger(x) || !Number.isInteger(y)) continue;
      const piece = getFurniture(id);
      if (!piece || !ownsPiece(piece, state)) continue;
      home = placeFurniture(home, id, x as number, y as number) ?? home;
    }
  }
  return home;
}
