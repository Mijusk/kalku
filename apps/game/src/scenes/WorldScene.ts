import Phaser from 'phaser';
import { creaturesForSkill, getCreature, getZone, isZoneOpen, missingForZone, type ZoneDefinition } from '@kalku/content';
import { currentSkill, challengeSkill, createRng, getSkill, levelForXp, pickSkill, randomSeed, type Rng } from '@kalku/exercises';
import {
  createWildlife,
  findCollision,
  generateRegion,
  openGate,
  pathTo,
  PRADERA_UNO,
  step,
  tickWildlife,
  zoneInterior,
  type Direction,
  type PlacedPiece,
  type Point,
  type RegionMap,
} from '@kalku/world';
import { tr } from '../i18n';
import { loadProgress, saveProgress } from '../progress';
import { gemCanvas } from '../ui/gemCanvas';
import { WORLD_STATE_KEY, type EncounterData, type WildData, type WorldState } from '../worldState';
import { findBuildings, tilemapData } from '@kalku/art';
import { ANIMATION_MS, buildingTexture, CHEST_TEXTURES, GATE_TEXTURE, TILE_SIZE, TILESET_KEYS } from '../art/textures';

/** Semilla fija de Pradera Uno: todos los niños ven el mismo mapa. */
const PRADERA_UNO_SEED = 42;

/**
 * Tamaño de las criaturas en el mapa: se dibujan a 32 px para el combate y
 * aquí se ven a 3/4 (24 px): algo más grandes que el personaje, pero sin
 * perder el contorno, que a la mitad se pierde en la hierba alta.
 */
const WILD_SCALE = 0.75;

/** Lo que tarda el personaje en pasar de una casilla a la siguiente (ms). */
const STEP_MS = 150;

/** A cuántas casillas de la puerta (en cruz) se ve el cartel y se abre la zona. */
const ZONE_NEAR = 2;

/** Cuánto dura la animación de apertura de una puerta (ms). */
const GATE_OPEN_MS = 700;

/** Una zona cerrada del mapa: su lugar, sus datos y lo que se ve de ella. */
interface ZoneState {
  place: PlacedPiece;
  gate: Point;
  chest: Point;
  def: ZoneDefinition;
  /** Casillas del interior ("x,y"), calculadas con la puerta cerrada. */
  interior: Set<string>;
  opened: boolean;
  gateSprite: Phaser.GameObjects.Image | undefined;
  chestSprite: Phaser.GameObjects.Image;
}

const tileKey = (p: Point): string => `${p.x},${p.y}`;
const near = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= ZONE_NEAR;

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
  private zones: ZoneState[] = [];
  private sign: HTMLElement | undefined;
  private signZone: string | undefined;
  private signTimer: Phaser.Time.TimerEvent | undefined;

  constructor() {
    super('world');
  }

  create(): void {
    // El mapa solo usa la interfaz HTML para el botón de la colección.
    this.createCollectionButton();

    this.region = generateRegion(PRADERA_UNO, PRADERA_UNO_SEED);
    this.createGround();
    this.createBuildings();
    this.createZones();

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
        wildlife: createWildlife(this.region, PRADERA_UNO.wildlife, entrance, rng, (r, tile) => this.assignCreature(r, tile), this.allowTile),
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
    this.refreshZones();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeSign());
  }

  /** Botón «Colección» arriba a la derecha. Se abre desde el mapa, no desde el combate. */
  private createCollectionButton(): void {
    const ui = document.getElementById('ui');
    if (!ui) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-small world-button';
    button.textContent = tr('collection', loadProgress().locale);
    // El toque en el botón no debe mover al personaje.
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', () => this.openCollection());
    ui.replaceChildren(button);
  }

  private openCollection(): void {
    if (this.encounterStarted) return;
    // Se guarda dónde está el personaje y las criaturas para volver al mismo sitio.
    this.state.tile = { ...this.tile };
    this.registry.set(WORLD_STATE_KEY, this.state);
    this.encounterStarted = true;
    this.scene.start('collection');
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
      (r, tile) => this.assignCreature(r, tile),
      this.allowTile,
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
        this.refreshZones();
        this.checkEncounter();
      },
    });
  }

  /** Las criaturas no salen ni andan dentro de una zona cerrada. */
  private readonly allowTile = (p: Point): boolean => !this.zones.some((z) => !z.opened && z.interior.has(tileKey(p)));

  /**
   * Qué criatura sale: la habilidad la elige pickSkill, así que esquivarlas no ayuda.
   * Dentro de una zona sale siempre la de la mezcla de reto (la siguiente del currículo).
   */
  private assignCreature(rng: Rng, tile: Point): WildData {
    const profile = loadProgress().profile;
    const inZone = this.zones.some((z) => z.interior.has(tileKey(tile)));
    const pick = inZone
      ? { skill: challengeSkill(profile) ?? currentSkill(profile), slot: 'challenge' as const }
      : pickSkill(profile, rng);
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
        this.wild.set(w.id, this.add.image(x, y, texture).setScale(WILD_SCALE).setDepth(1).setData('dest', `${x},${y}`));
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

  /** Prepara las zonas del mapa: puertas y cofres encima del suelo, y abre las que ya estaban abiertas. */
  private createZones(): void {
    const progress = loadProgress();
    this.zones = [];
    for (const place of this.region.places) {
      const def = place.zone === undefined ? undefined : getZone(place.zone);
      if (!def || !place.gate || !place.chest) continue;
      // El interior se calcula con la puerta aún cerrada.
      const interior = new Set(zoneInterior(this.region, place).map(tileKey));
      const opened = progress.zonesOpened.includes(def.id);
      const chestTexture = progress.treasures.includes(def.treasure.id) ? CHEST_TEXTURES.open : CHEST_TEXTURES.closed;
      const gateSprite = opened
        ? undefined
        : this.add.image(place.gate.x * TILE_SIZE, place.gate.y * TILE_SIZE, GATE_TEXTURE).setOrigin(0).setDepth(1);
      const chestSprite = this.add.image(place.chest.x * TILE_SIZE, place.chest.y * TILE_SIZE, chestTexture).setOrigin(0).setDepth(1);
      if (opened) this.region = openGate(this.region, place.gate);
      this.zones.push({ place, gate: place.gate, chest: place.chest, def, interior, opened, gateSprite, chestSprite });
    }
  }

  /**
   * Al llegar a cada casilla: abre la puerta cercana si ya se cumple su requisito
   * (con animación, una sola vez), enseña el cartel de lo que falta y recoge el cofre.
   */
  private refreshZones(): void {
    const progress = loadProgress();
    const player = { gems: progress.gems, level: levelForXp(progress.xp) };
    let shown: ZoneState | undefined;
    for (const zone of this.zones) {
      if (zone.opened || !near(this.tile, zone.gate)) continue;
      if (isZoneOpen(zone.def.requirement, player)) {
        this.openZone(zone);
        continue;
      }
      if (!shown) shown = zone;
    }
    if (shown) this.showMissing(shown, progress.locale, player);
    else if (this.signZone !== undefined && !this.signTimer) this.removeSign();

    for (const zone of this.zones) {
      if (!zone.opened || this.tile.x !== zone.chest.x || this.tile.y !== zone.chest.y) continue;
      if (progress.treasures.includes(zone.def.treasure.id)) continue;
      progress.treasures = [...progress.treasures, zone.def.treasure.id];
      saveProgress(progress);
      zone.chestSprite.setTexture(CHEST_TEXTURES.open);
      this.showMessage(`${tr('zoneTreasure', progress.locale)} ${zone.def.treasure.name[progress.locale]}`);
    }
  }

  /** Abre la puerta: se guarda, se puede pisar y se quita con una animación corta (sin ella con «reducir movimiento»). */
  private openZone(zone: ZoneState): void {
    zone.opened = true;
    this.region = openGate(this.region, zone.gate);
    const progress = loadProgress();
    if (!progress.zonesOpened.includes(zone.def.id)) {
      progress.zonesOpened = [...progress.zonesOpened, zone.def.id];
      saveProgress(progress);
    }
    const sprite = zone.gateSprite;
    zone.gateSprite = undefined;
    this.showMessage(`${zone.def.name[progress.locale]} · ${tr('zoneOpened', progress.locale)}`);
    if (!sprite) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sprite.destroy();
      return;
    }
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      y: sprite.y + TILE_SIZE / 2,
      scaleY: 0.2,
      duration: GATE_OPEN_MS,
      onComplete: () => sprite.destroy(),
    });
  }

  /** Cartel en letra clara: qué falta para abrir la zona, con la gema dibujada. */
  private showMissing(zone: ZoneState, locale: 'es' | 'ca', player: { gems: readonly string[]; level: number }): void {
    if (this.signZone === zone.def.id && !this.signTimer) return;
    const missing = missingForZone(zone.def.requirement, player);
    const sign = this.ensureSign();
    this.signTimer?.remove();
    this.signTimer = undefined;
    this.signZone = zone.def.id;
    const title = document.createElement('p');
    title.className = 'zone-sign-title';
    title.textContent = zone.def.name[locale];
    sign.replaceChildren(title);
    for (const id of missing.gems) {
      const skill = getSkill(id);
      const line = document.createElement('p');
      line.className = 'zone-sign-line';
      line.append(gemCanvas(skill, true, 'zone-sign-gem'), `${tr('zoneNeedGem', locale)} ${skill.name[locale]}`);
      sign.append(line);
    }
    if (missing.level !== undefined) {
      const line = document.createElement('p');
      line.className = 'zone-sign-line';
      line.textContent = `${tr('zoneNeedLevel', locale)} ${missing.level}`;
      sign.append(line);
    }
  }

  /** Mensaje corto en el mismo cartel; se quita solo a los pocos segundos. */
  private showMessage(text: string): void {
    const sign = this.ensureSign();
    this.signTimer?.remove();
    this.signZone = undefined;
    const line = document.createElement('p');
    line.className = 'zone-sign-title';
    line.textContent = text;
    sign.replaceChildren(line);
    this.signTimer = this.time.delayedCall(3500, () => {
      this.signTimer = undefined;
      this.removeSign();
    });
  }

  private ensureSign(): HTMLElement {
    if (this.sign?.isConnected) return this.sign;
    const sign = document.createElement('div');
    sign.className = 'zone-sign';
    sign.setAttribute('role', 'status');
    sign.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.getElementById('ui')?.append(sign);
    this.sign = sign;
    return sign;
  }

  private removeSign(): void {
    this.sign?.remove();
    this.sign = undefined;
    this.signZone = undefined;
  }

  private centerOf(p: Point): Point {
    return { x: p.x * TILE_SIZE + TILE_SIZE / 2, y: p.y * TILE_SIZE + TILE_SIZE / 2 };
  }
}
