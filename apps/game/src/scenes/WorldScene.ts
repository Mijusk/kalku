import Phaser from 'phaser';
import { generateRegion, pathTo, PRADERA_UNO, step, type Direction, type Point, type RegionMap } from '@kalku/world';
import { TILE_SIZE, TILESET_KEY, tilemapData } from '../art/tiles';

/** Semilla fija de Pradera Uno: todos los niños ven el mismo mapa. */
const PRADERA_UNO_SEED = 42;

/** Lo que tarda el personaje en pasar de una casilla a la siguiente (ms). */
const STEP_MS = 150;

/**
 * Mapa de la región: dibuja Pradera Uno con un tilemap creado por código y
 * mueve al personaje casilla a casilla, con teclado (flechas o WASD) o
 * tocando la pantalla (va andando hasta donde se toca).
 */
export class WorldScene extends Phaser.Scene {
  private region!: RegionMap;
  private hero!: Phaser.GameObjects.Image;
  private tile!: Point;
  private route: Point[] = [];
  private moving = false;
  private keys!: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  /** Última dirección pulsada, para que un toque rápido de tecla dé al menos un paso. */
  private queued: Direction | undefined;

  constructor() {
    super('world');
  }

  create(): void {
    // El mapa no usa la interfaz HTML (es para los ejercicios).
    document.getElementById('ui')?.replaceChildren();

    this.region = generateRegion(PRADERA_UNO, PRADERA_UNO_SEED);
    const tilemap = this.make.tilemap({ data: tilemapData(this.region), tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = tilemap.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0);
    if (tileset === null) throw new Error('No se pudo crear el tileset del mapa');
    tilemap.createLayer(0, tileset, 0, 0);

    this.tile = { ...this.region.entrance };
    this.hero = this.add.image(this.centerOf(this.tile).x, this.centerOf(this.tile).y, 'hero');

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.region.width * TILE_SIZE, this.region.height * TILE_SIZE);
    camera.startFollow(this.hero, true);
    camera.setRoundPixels(true);

    this.setupKeyboard();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const target = { x: Math.floor(pointer.worldX / TILE_SIZE), y: Math.floor(pointer.worldY / TILE_SIZE) };
      this.route = pathTo(this.region, this.tile, target);    });
  }

  override update(): void {
    if (this.moving) return;
    const pressed = this.pressedDirection() ?? this.queued;
    this.queued = undefined;
    if (pressed !== undefined) {
      // El teclado manda sobre un camino tocado a medias.
      this.route = [];
      this.walkTo(step(this.region, this.tile, pressed), pressed);
      return;
    }
    const next = this.route.shift();
    if (next !== undefined) this.walkTo(next);
  }

  private setupKeyboard(): void {
    const keyboard = this.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = (...codes: number[]): Phaser.Input.Keyboard.Key[] => (keyboard ? codes.map((c) => keyboard.addKey(c)) : []);
    this.keys = {
      up: add(K.UP, K.W),
      down: add(K.DOWN, K.S),
      left: add(K.LEFT, K.A),
      right: add(K.RIGHT, K.D),
    };
    for (const direction of Object.keys(this.keys) as Direction[]) {
      for (const key of this.keys[direction]) key.on('down', () => (this.queued = direction));
    }
  }

  private pressedDirection(): Direction | undefined {
    return (Object.keys(this.keys) as Direction[]).find((d) => this.keys[d].some((key) => key.isDown));
  }

  /** Anda una casilla hasta `to` (si es la misma, solo se gira). */
  private walkTo(to: Point, facing?: Direction): void {
    const left = facing === 'left' || to.x < this.tile.x;
    const right = facing === 'right' || to.x > this.tile.x;
    if (left) this.hero.setFlipX(true);
    if (right) this.hero.setFlipX(false);
    if (to.x === this.tile.x && to.y === this.tile.y) return;

    this.tile = to;
    this.moving = true;
    const { x, y } = this.centerOf(to);
    this.tweens.add({
      targets: this.hero,
      x,
      y,
      duration: STEP_MS,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  private centerOf(p: Point): Point {
    return { x: p.x * TILE_SIZE + TILE_SIZE / 2, y: p.y * TILE_SIZE + TILE_SIZE / 2 };
  }
}
