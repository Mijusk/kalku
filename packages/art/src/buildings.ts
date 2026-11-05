import type { TileKind, WorldMap } from '@kalku/world';
import { newGrid, setPx, shape, tone, type Grid, type Ramp } from './grid.js';
import { GOLD, MATERIAL, OUTLINE, WHITE } from './palette.js';
import { TILE_PX } from './tiles.js';

export type BuildingKind = 'house' | 'shop';

/** Un edificio del mapa: un rectángulo de casillas del mismo tipo. */
export interface Building {
  readonly kind: BuildingKind;
  /** Casilla de la esquina de arriba a la izquierda. */
  readonly x: number;
  readonly y: number;
  /** Tamaño en casillas. */
  readonly width: number;
  readonly height: number;
}

function buildingKind(kind: TileKind | undefined): BuildingKind | undefined {
  return kind === 'house' || kind === 'shop' ? kind : undefined;
}

/**
 * Agrupa las casillas `house` y `shop` en edificios rectangulares, para
 * dibujar cada uno entero en vez de casilla a casilla. Recorre por filas:
 * cada casilla sin usar abre un rectángulo que crece a la derecha y luego
 * hacia abajo mientras todo sea del mismo tipo.
 */
export function findBuildings(map: WorldMap): Building[] {
  const used = new Uint8Array(map.tiles.length);
  const buildings: Building[] = [];
  const kindAt = (x: number, y: number): BuildingKind | undefined =>
    x < map.width && y < map.height && used[y * map.width + x] === 0 ? buildingKind(map.tiles[y * map.width + x]) : undefined;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = kindAt(x, y);
      if (kind === undefined) continue;
      let width = 1;
      while (kindAt(x + width, y) === kind) width++;
      let height = 1;
      while (Array.from({ length: width }, (_, i) => kindAt(x + i, y + height)).every((k) => k === kind)) height++;
      for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) used[(y + dy) * map.width + x + dx] = 1;
      buildings.push({ kind, x, y, width, height });
    }
  }
  return buildings;
}

/** Luz desde la izquierda: tono según la posición horizontal (0 = luz … último = sombra). */
function side(x: number, left: number, right: number, ramp: Ramp): number {
  if (x < left) return tone(ramp, 0);
  if (x > right) return tone(ramp, ramp.length - 1);
  return tone(ramp, 1);
}

/**
 * Dibuja un edificio de `tilesW` × `tilesH` casillas: sombra en el suelo,
 * paredes con vigas, tejado de tejas con chimenea, puerta con arco y escalón,
 * ventanas con postigos y maceta. La tienda lleva tejado azul, toldo a rayas
 * y un cartel con una moneda (sin letras).
 */
export function drawBuilding(kind: BuildingKind, tilesW: number, tilesH: number): Grid {
  if (!Number.isInteger(tilesW) || !Number.isInteger(tilesH) || tilesW < 2 || tilesH < 2) {
    throw new RangeError(`Un edificio mide al menos 2×2 casillas, no ${tilesW}×${tilesH}`);
  }
  const W = tilesW * TILE_PX;
  const H = tilesH * TILE_PX;
  const g = newGrid(W, H);
  const roof = kind === 'shop' ? MATERIAL.tejadoAzul : MATERIAL.tejadoRojo;
  const wall = MATERIAL.pared;
  const wood = MATERIAL.corteza;
  const stone = MATERIAL.piedra;
  const cx = W / 2;

  const x0 = 3;
  const x1 = W - 4;
  const wallTop = Math.round(H * 0.42);
  const wallBottom = H - 3;
  const roofTop = 2;
  const eave = wallTop + 3;

  // Sombra en el suelo, hacia abajo a la derecha.
  for (let y = H - 6; y < H; y++) {
    for (let x = 2; x < W; x++) {
      const u = (x + 0.5 - (cx + 2)) / (W / 2 - 1);
      const v = (y + 0.5 - (H - 2.5)) / 3.3;
      if (u * u + v * v <= 1) setPx(g, x, y, tone(MATERIAL.hierba, 3));
    }
  }

  // Paredes: luz a la izquierda, sombra a la derecha, zócalo de piedra y vigas de madera.
  shape(g, 0, 0, W, H, (x, y) => x >= x0 && x <= x1 + 1 && y >= wallTop && y <= wallBottom,
    (x, y) => {
      if (y > wallBottom - 3) return tone(stone, x > x1 - 3 ? 3 : 2);
      if (x < x0 + 3 || x > x1 - 2) return tone(wood, x < cx ? 0 : 1);
      const plaster = side(x, x0 + 7, x1 - 5, wall);
      return (Math.floor(x) * 5 + Math.floor(y) * 3) % 11 === 0 ? tone(wall, 2) : plaster;
    }, OUTLINE);
  // Sombra del alero sobre la pared.
  for (let x = x0 + 1; x <= x1; x++) setPx(g, x, eave + 1, tone(wall, 2));

  // Puerta con arco, tablones, pomo y escalón.
  const doorW = 8;
  const doorH = 11;
  const doorX = Math.round(cx - doorW / 2) + (tilesW >= 3 ? 0 : 3);
  const doorY = wallBottom - doorH;
  shape(g, doorX, doorY, doorW, doorH + 1,
    (x, y) => y >= 3 || ((x - doorW / 2) / (doorW / 2)) ** 2 + ((y - 3) / 3) ** 2 <= 1,
    (x, _y, px) => (px === 3 || px === 4 ? tone(wood, 1) : x < doorW / 2 ? tone(wood, 0) : tone(wood, 1)), OUTLINE);
  setPx(g, doorX + doorW - 3, doorY + 7, GOLD);
  for (let x = doorX - 1; x <= doorX + doorW; x++) setPx(g, x, wallBottom, tone(stone, 0));

  // Ventanas con postigos y maceta con flores. Una a cada lado de la puerta si cabe.
  const windows: number[] = [];
  const leftSpace = doorX - (x0 + 3);
  const rightSpace = x1 - 2 - (doorX + doorW);
  if (leftSpace >= 12) windows.push(Math.round((x0 + 3 + doorX) / 2) - 4);
  if (rightSpace >= 12) windows.push(Math.round((doorX + doorW + x1 - 2) / 2) - 4);
  for (const wx of windows) drawWindow(g, wx, wallTop + 4, kind, roof);

  // Tienda: toldo a rayas sobre la puerta y cartel con una moneda.
  if (kind === 'shop') {
    for (let y = wallTop + 1; y <= wallTop + 3; y++) {
      for (let x = doorX - 2; x < doorX + doorW + 2; x++) {
        setPx(g, x, y, Math.floor((x - doorX) / 2) % 2 === 0 ? tone(roof, 1) : WHITE);
      }
    }
    for (let x = doorX - 2; x < doorX + doorW + 2; x++) setPx(g, x, wallTop + 4, tone(roof, 3));
    // El cartel solo se dibuja si cabe dentro de la pared, a la derecha de la puerta.
    const sx = x1 - 3;
    const sy = wallTop + 6;
    if (rightSpace >= 11) shape(g, sx - 5, sy, 7, 7, (x, y) => (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 11, (x, y, px, py) => (px + py < 5 ? tone(MATERIAL.tierra, 0) : GOLD), OUTLINE);
  }

  // Tejado: tejas en filas con costuras alternas, claro a la izquierda y oscuro a la derecha.
  const halfTop = Math.max(5, Math.round(W * 0.22));
  const halfBottom = W / 2 - 1.5;
  shape(g, 0, 0, W, H,
    (x, y) => {
      if (y < roofTop || y > eave) return false;
      const half = halfTop + ((y - roofTop) / (eave - roofTop)) * (halfBottom - halfTop);
      return Math.abs(x - cx) <= half;
    },
    (x, y) => {
      const row = Math.floor((y - roofTop) / 3);
      const seam = (Math.floor(x) + (row % 2) * 2) % 4 === 0;
      const lastRow = y > eave - 1.5;
      const base = x < cx - 6 ? 0 : x > cx + 7 ? 2 : 1;
      if (lastRow) return tone(roof, base + 2);
      if ((y - roofTop) % 3 >= 2) return tone(roof, base + 1);
      if (y < roofTop + 1.5) return tone(roof, 0);
      return seam ? tone(roof, base + 1) : tone(roof, base);
    }, OUTLINE);

  // Chimenea, detrás del tejado a la derecha.
  const chX = Math.round(cx + halfTop * 0.9);
  shape(g, 0, 0, W, H, (x, y) => x >= chX && x <= chX + 4 && y >= roofTop - 1 && y <= roofTop + 6, (x) => (x < chX + 2 ? tone(stone, 1) : tone(stone, 2)), OUTLINE);
  for (let x = chX; x <= chX + 4; x++) setPx(g, x, roofTop - 1, OUTLINE);

  // Arbustos en las esquinas.
  for (const bx of [x0 - 1, x1 + 1]) {
    shape(g, 0, 0, W, H, (x, y) => (x - bx) ** 2 / 9 + (y - (wallBottom - 2)) ** 2 / 6 <= 1,
      (x, y, px, py) => tone(MATERIAL.hoja, bushTone((x - bx) / 3, (y - (wallBottom - 2)) / 2.4, px, py)), OUTLINE);
  }
  return g;
}

function bushTone(u: number, v: number, px: number, py: number): number {
  const d = -0.5 * u - 0.6 * v + ((px + py) % 2 !== 0 ? 0.05 : -0.05);
  return d > 0.5 ? 0 : d > 0 ? 1 : 2;
}

function drawWindow(g: Grid, wx: number, wy: number, kind: BuildingKind, shutter: Ramp): void {
  // Postigos a los lados.
  for (const sx of [wx - 2, wx + 8]) {
    for (let y = wy; y < wy + 8; y++) {
      setPx(g, sx, y, tone(shutter, sx < wx ? 1 : 2));
      setPx(g, sx + 1, y, tone(shutter, sx < wx ? 1 : 2));
    }
  }
  // Cristal con cruz y reflejo.
  shape(g, wx, wy, 8, 8, () => true,
    (_x, _y, px, py) => (px === 3 || px === 4 || py === 3 || py === 4 ? OUTLINE : px + py < 5 ? tone(MATERIAL.agua, 0) : tone(MATERIAL.agua, 1)),
    OUTLINE);
  // Maceta con flores.
  for (let x = wx - 1; x <= wx + 8; x++) setPx(g, x, wy + 9, tone(MATERIAL.corteza, 1));
  const blooms = kind === 'shop' ? [0xffd84d, WHITE, 0xff9ed2] : [0xff9ed2, 0xffd84d, 0xff9ed2];
  blooms.forEach((color, i) => {
    setPx(g, wx + i * 3, wy + 8, color);
    setPx(g, wx + i * 3 + 1, wy + 8, tone(MATERIAL.hoja, 1));
  });
}
