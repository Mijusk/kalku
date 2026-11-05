import Phaser from 'phaser';
import { creaturesForSkill, getCreature } from '@kalku/content';
import { createRng, pickSkill, randomSeed, type Rng } from '@kalku/exercises';
import {
  createWildlife,
  findCollision,
  generateRegion,
  pathTo,
  PRADERA_UNO,
  step,
  tickWildlife,
  type Direction,
  type Point,
  type RegionMap,
} from '@kalku/world';
import { loadProgress } from '../progress';
import { WORLD_STATE_KEY, type EncounterData, type WildData, type WorldState } from '../worldState';
import { findBuildings, tilemapData } from '@kalku/art';
import { ANIMATION_MS, buildingTexture, TILE_SIZE, TILESET_KEYS } from '../art/textures';

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
  private state!: WorldState;
  private wild = new Map<number, Phaser.GameObjects.Image>();
  private encounterStarted = false;

  constructor() {
    super('world');
  }

  create(): void {
    // El mapa no usa la interfaz HTML (es para los ejercicios).
    document.getElementById('ui')?.replaceChildren();

    this.region = generateRegion(PRADERA_UNO, PRADERA_UNO_SEED);
    this.createGround();
    this.createBuildings();

    this.encounterStarted = false;
    this.wild = new Map();
    const saved = this.registry.get(WORLD_STATE_KEY) as WorldState | undefined;
    if (saved) {
      this.state = saved;
    } else {
      const rng = createRng(randomSeed());
      const entrance = { ...this.region.entrance };
      this.state = {
        tile: entrance,
        rng,
        wildlife: createWildlife(this.region, PRADERA_UNO.wildlife, entrance, rng, (r) => this.assignCreature(r)),
      };
    }
    this.tile = { ...this.state.tile };
    this.hero = this.add.image(this.centerOf(this.tile).x, this.centerOf(this.tile).y, 'hero').setDepth(2);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.region.width * TILE_SIZE, this.region.height * TILE_SIZE);
    camera.startFollow(this.hero, true);
    camera.setRoundPixels(true);

    this.setupKeyboard();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const target = { x: Math.floor(pointer.worldX / TILE_SIZE), y: Math.floor(pointer.worldY / TILE_SIZE) };
      this.route = pathTo(this.region, this.tile, target);
    });
    this.syncWild();
  }

  /**
   * El suelo: un tilemap por fotograma del agua (mismos datos, otro tileset)
   * y solo se ve uno. Cambiar cuál se ve cada rato anima el agua sin tocar
   * ninguna casilla. Con «reducir movimiento» el agua se queda quieta.
   */
  private createGround(): void {
    const data = tilemapData(this.region, PRADERA_UNO_SEED);
    const layers = TILESET_KEYS.map((key, i) => {
      const tilemap = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
      const tileset = tilemap.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0);
      if (tileset === null) throw new Error('No se pudo crear el tileset del mapa');
      const layer = tilemap.createLayer(0, tileset, 0, 0);
      if (layer === null) throw new Error('No se pudo crear la capa del mapa');
      return layer.setVisible(i === 0);
    });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let shown = 0;
    this.time.addEvent({
      delay: ANIMATION_MS * 2,
      loop: true,
      callback: () => {
        layers[shown]?.setVisible(false);
        shown = (shown + 1) % layers.length;
        layers[shown]?.setVisible(true);
      },
    });
  }

  /** Casas y tienda: cada edificio entero encima del suelo (el suelo de debajo es hierba). */
  private createBuildings(): void {
    for (const building of findBuildings(this.region)) {
      this.add
        .image(building.x * TILE_SIZE, building.y * TILE_SIZE, buildingTexture(this, building))
        .setOrigin(0)
        .setDepth(1);
    }
  }

  override update(_time: number, delta: number): void {
    if (this.encounterStarted) return;
    // Las criaturas andan despacio mientras el niño anda o espera.
    this.state.wildlife = tickWildlife(
      this.region,
      PRADERA_UNO.wildlife,
      this.state.wildlife,
      delta,
      this.tile,
      this.state.rng,
      (r) => this.assignCreature(r),
    );
    this.syncWild();
    // El encuentro se comprueba al llegar, para no cortar la animación del paso.
    if (this.moving) return;
    if (this.checkEncounter()) return;
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
        this.checkEncounter();
      },
    });
  }

  /** Qué criatura sale: la habilidad la elige pickSkill, así que esquivarlas no ayuda. */
  private assignCreature(rng: Rng): WildData {
    const pick = pickSkill(loadProgress().profile, rng);
    const creature = rng.pick(creaturesForSkill(pick.skill));
    return { creature: creature.id, skill: pick.skill, slot: pick.slot };
  }

  /** Pone cada criatura en su casilla (con un pequeño paso animado) y quita las que ya no están. */
  private syncWild(): void {
    const alive = new Set<number>();
    for (const w of this.state.wildlife.wanderers) {
      alive.add(w.id);
      const { x, y } = this.centerOf(w.tile);
      const sprite = this.wild.get(w.id);
      if (!sprite) {
        const texture = getCreature(w.data.creature).sprite;
        this.wild.set(w.id, this.add.image(x, y, texture).setDepth(1).setData('dest', `${x},${y}`));
      } else if (sprite.getData('dest') !== `${x},${y}`) {
        // Un tween por cambio de casilla, no uno por frame.
        sprite.setData('dest', `${x},${y}`);
        this.tweens.killTweensOf(sprite);
        this.tweens.add({ targets: sprite, x, y, duration: 300 });
      }
    }
    for (const [id, sprite] of this.wild) {
      if (alive.has(id)) continue;
      sprite.destroy();
      this.wild.delete(id);
    }
  }

  /** Si el personaje y una criatura coinciden, guarda el mapa y empieza el combate. */
  private checkEncounter(): boolean {
    if (this.encounterStarted) return false;
    const hit = findCollision(this.state.wildlife, this.tile);
    if (!hit) return false;
    this.encounterStarted = true;
    this.route = [];
    this.state.tile = { ...this.tile };
    this.registry.set(WORLD_STATE_KEY, this.state);
    const data: EncounterData = { wandererId: hit.id, data: hit.data };
    this.scene.start('battle', data);
    return true;
  }

  private centerOf(p: Point): Point {
    return { x: p.x * TILE_SIZE + TILE_SIZE / 2, y: p.y * TILE_SIZE + TILE_SIZE / 2 };
  }
}
