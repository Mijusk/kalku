import Phaser from 'phaser';
import {
  buyFurniture,
  canPlace,
  FURNITURE,
  furnitureAt,
  furnitureLock,
  getCreature,
  getFurniture,
  HOME,
  homeState,
  ownsFurniture,
  placeFurniture,
  removeFurniture,
  shinySprite,
  type FurniturePiece,
} from '@kalku/content';
import { CREATURE_FRAMES, drawFurniture, gridToRgba, TILE_PX } from '@kalku/art';
import { playMusic, sfx } from '../audio/sound';
import { ANIMATION_MS, createHeroTexture, furnitureTexture, HERO_KEY, roomTexture } from '../art/textures';
import { tr, trf } from '../i18n';
import { lockText, wardrobeOf } from '../items';
import { applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { confetti, reducedMotion } from '../ui/fx';
import '../ui/items.css';
import { GAME_HEIGHT, GAME_WIDTH } from './BattleScene';

/** Filas de pared encima del suelo, en casillas. */
const WALL_ROWS = 2;
/** Tamaño de la habitación en pantalla: cada píxel del dibujo, 2,5 del juego. */
const SCALE = 2.5;
const CELL = TILE_PX * SCALE;
const ROOM_W = HOME.width * CELL;
const ROOM_H = (HOME.height + WALL_ROWS) * CELL;
const ORIGIN_X = Math.round((GAME_WIDTH - ROOM_W) / 2);
const ORIGIN_Y = Math.round((GAME_HEIGHT - ROOM_H) / 2);

/** Un mueble como canvas HTML para las tarjetas (en pixel art, escalado por CSS). */
function furnitureCanvas(piece: FurniturePiece): HTMLCanvasElement {
  const grid = drawFurniture(piece.art, piece.color, piece.width);
  const canvas = document.createElement('canvas');
  canvas.className = `home-card-art home-card-art-${piece.width}`;
  canvas.width = grid.width;
  canvas.height = grid.height;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(grid.width, grid.height);
    image.data.set(gridToRgba(grid));
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}

/**
 * La casa del niño: una habitación vista de frente que decora con sus
 * muebles. Se toca un mueble abajo (o uno ya puesto) y luego un sitio del
 * suelo. En «Comprar muebles» están los que se compran con Cifras y los que
 * se ganan con el nivel o las gemas. Nada de aquí cambia el combate.
 */
export class HomeScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private ghost: Phaser.GameObjects.Image | undefined;
  /** El mueble que se va a poner o mover. */
  private selected: string | undefined;
  /** En el catálogo: el mueble que se está mirando para comprar. */
  private looking: string | undefined;
  private tab: 'mine' | 'catalog' = 'mine';
  private grid!: HTMLDivElement;
  private feedback!: HTMLParagraphElement;
  private coins!: HTMLParagraphElement;
  private buy!: HTMLButtonElement;
  private store!: HTMLButtonElement;
  private tabs: HTMLButtonElement[] = [];

  constructor() {
    super('home');
  }

  create(): void {
    this.progress = loadProgress();
    applySettings(this.progress.settings);
    this.sprites = new Map();
    this.selected = undefined;
    this.looking = undefined;
    this.tab = 'mine';
    playMusic('world');
    this.cameras.main.setBackgroundColor('#3a2a1c');

    this.add.image(ORIGIN_X, ORIGIN_Y, roomTexture(this, HOME.width, HOME.height, WALL_ROWS)).setOrigin(0).setScale(SCALE);
    this.drawPeople();
    for (const p of this.progress.home.placed) this.drawPiece(p.id, p.x, p.y);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.tapRoom(pointer));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.moveGhost(pointer));

    this.buildPanel();
  }

  /** Casilla del suelo bajo el puntero, o `undefined` si está fuera. */
  private cellAt(pointer: Phaser.Input.Pointer): { x: number; y: number } | undefined {
    const x = Math.floor((pointer.worldX - ORIGIN_X) / CELL);
    const y = Math.floor((pointer.worldY - ORIGIN_Y) / CELL) - WALL_ROWS;
    if (x < 0 || y < 0 || x >= HOME.width || y >= HOME.height) return undefined;
    return { x, y };
  }

  /** Esquina de abajo a la izquierda de una casilla del suelo, en pantalla. */
  private cellBottomLeft(x: number, y: number): { x: number; y: number } {
    return { x: ORIGIN_X + x * CELL, y: ORIGIN_Y + (WALL_ROWS + y + 1) * CELL };
  }

  /** El niño y su compañero, junto a la puerta (abajo a la izquierda). */
  private drawPeople(): void {
    createHeroTexture(this, this.progress.outfit);
    const [heroCell, buddyCell] = HOME.reserved;
    if (!heroCell || !buddyCell) return;
    // Felpudo de la puerta debajo de los dos.
    const mat = this.cellBottomLeft(heroCell.x, heroCell.y);
    this.add.rectangle(mat.x + 4, mat.y - 10, CELL * 2 - 8, 8, 0x9a6a3c).setOrigin(0).setDepth(0.5).setStrokeStyle(2, 0x1c2430);
    const hero = this.cellBottomLeft(heroCell.x, heroCell.y);
    this.add.image(hero.x + CELL / 2, hero.y - 2, HERO_KEY, 0).setOrigin(0.5, 1).setScale(SCALE).setDepth(10 + heroCell.y);

    const chosen = this.progress.companion;
    if (!chosen) return;
    const sprite = getCreature(chosen.id).sprite;
    const key = chosen.shiny ? shinySprite(sprite) : sprite;
    if (!this.textures.exists(key)) return;
    const at = this.cellBottomLeft(buddyCell.x, buddyCell.y);
    const buddy = this.add.image(at.x + CELL / 2, at.y, key, 0).setOrigin(0.5, 1).setScale(1.3).setDepth(10 + buddyCell.y);
    if (reducedMotion()) return;
    let frame = 0;
    this.time.addEvent({ delay: ANIMATION_MS * 2, loop: true, callback: () => buddy.setFrame((frame = (frame + 1) % CREATURE_FRAMES)) });
  }

  private drawPiece(id: string, x: number, y: number): void {
    const piece = getFurniture(id);
    if (!piece) return;
    this.sprites.get(id)?.destroy();
    const at = this.cellBottomLeft(x, y);
    const image = this.add
      .image(at.x, at.y, furnitureTexture(this, piece))
      .setOrigin(0, 1)
      .setScale(SCALE)
      // Las alfombras, debajo de todo; lo demás, por filas (lo de delante tapa lo de detrás).
      .setDepth(piece.art === 'rug' ? 1 : 10 + y);
    this.sprites.set(id, image);
  }

  private save(): void {
    saveProgress(this.progress);
  }

  private tapRoom(pointer: Phaser.Input.Pointer): void {
    const cell = this.cellAt(pointer);
    if (!cell) return;
    const locale = this.progress.locale;
    const home = this.progress.home;
    if (this.selected) {
      const next = placeFurniture(home, this.selected, cell.x, cell.y);
      if (!next) {
        sfx('wrong');
        this.say(tr('homeNoFit', locale), 'bad');
        return;
      }
      this.progress.home = next;
      this.save();
      this.drawPiece(this.selected, cell.x, cell.y);
      const sprite = this.sprites.get(this.selected);
      if (sprite && !reducedMotion()) this.tweens.add({ targets: sprite, scaleY: SCALE * 1.08, duration: 90, yoyo: true });
      this.selected = undefined;
      this.ghost?.destroy();
      this.ghost = undefined;
      sfx('tap');
      this.say(tr('homePut', locale), 'good');
      this.renderGrid();
      return;
    }
    const hit = furnitureAt(home, cell.x, cell.y);
    if (hit) this.select(hit.id);
  }

  /** Fantasma del mueble elegido bajo el dedo: verde si cabe, rojo si no. */
  private moveGhost(pointer: Phaser.Input.Pointer): void {
    const ghost = this.ghost;
    if (!ghost || !this.selected) return;
    const cell = this.cellAt(pointer);
    if (!cell) {
      ghost.setVisible(false);
      return;
    }
    const at = this.cellBottomLeft(cell.x, cell.y);
    ghost.setPosition(at.x, at.y).setVisible(true).setDepth(50);
    ghost.setTint(canPlace(this.progress.home, this.selected, cell.x, cell.y) ? 0xc8ffc8 : 0xff8080);
  }

  private select(id: string): void {
    const piece = getFurniture(id);
    if (!piece) return;
    this.selected = id;
    this.looking = undefined;
    this.ghost?.destroy();
    this.ghost = this.add.image(0, 0, furnitureTexture(this, piece)).setOrigin(0, 1).setScale(SCALE).setAlpha(0.6).setVisible(false);
    sfx('tap');
    this.say(`${piece.name[this.progress.locale]}: ${tr('homeWhere', this.progress.locale)}`, 'info');
    if (this.tab !== 'mine') this.tab = 'mine';
    this.renderGrid();
  }

  private say(text: string, kind: 'good' | 'bad' | 'info'): void {
    this.feedback.textContent = text;
    this.feedback.dataset.kind = kind;
  }

  private buildPanel(): void {
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    const locale = this.progress.locale;
    const root = document.createElement('div');
    root.className = 'home-panel';
    root.addEventListener('pointerdown', (e) => e.stopPropagation());

    const head = document.createElement('div');
    head.className = 'home-head';
    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = tr('homeTitle', locale);
    this.coins = document.createElement('p');
    this.coins.className = 'wardrobe-coins';
    head.append(title, this.coins);

    const tabs = document.createElement('div');
    tabs.className = 'wardrobe-tabs';
    tabs.setAttribute('role', 'tablist');
    this.tabs = (['mine', 'catalog'] as const).map((id) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'btn btn-small wardrobe-tab';
      t.dataset.tab = id;
      t.setAttribute('role', 'tab');
      t.textContent = tr(id === 'mine' ? 'homeMine' : 'homeCatalog', locale);
      t.addEventListener('click', () => {
        this.tab = id;
        this.looking = undefined;
        this.say(tr('homeNote', locale), 'info');
        this.renderGrid();
      });
      return t;
    });
    tabs.append(...this.tabs);

    this.grid = document.createElement('div');
    this.grid.className = 'home-grid';
    this.feedback = document.createElement('p');
    this.feedback.className = 'panel-feedback';
    this.feedback.setAttribute('role', 'status');

    const actions = document.createElement('div');
    actions.className = 'home-actions';
    this.buy = document.createElement('button');
    this.buy.type = 'button';
    this.buy.className = 'btn btn-primary wardrobe-buy';
    this.buy.addEventListener('click', () => this.buyLooking());
    this.store = document.createElement('button');
    this.store.type = 'button';
    this.store.className = 'btn wardrobe-buy';
    this.store.textContent = tr('homeStore', locale);
    this.store.addEventListener('click', () => this.storeSelected());
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'btn';
    exit.textContent = tr('homeExit', locale);
    exit.addEventListener('click', () => {
      sfx('door');
      this.scene.start('world');
    });
    actions.append(this.buy, this.store, exit);

    root.append(head, tabs, this.grid, this.feedback, actions);
    ui.append(root);
    this.say(tr('homeNote', locale), 'info');
    this.renderGrid();
  }

  private renderGrid(): void {
    const locale = this.progress.locale;
    const state = homeState(wardrobeOf(this.progress), this.progress.home);
    this.coins.textContent = `● ${trf('shopYouHave', locale, { n: this.progress.coins })}`;
    for (const t of this.tabs) t.setAttribute('aria-selected', String(t.dataset.tab === this.tab));
    const pieces = FURNITURE.filter((p) => (this.tab === 'mine') === ownsFurniture(p, state));
    const cards = pieces.map((piece) => {
      const owned = this.tab === 'mine';
      const placed = this.progress.home.placed.some((p) => p.id === piece.id);
      const lock = owned ? undefined : furnitureLock(piece, state);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wardrobe-card home-card';
      b.dataset.locked = String(!owned && lock?.kind !== 'price');
      b.dataset.wearing = String(placed);
      if (this.selected === piece.id || this.looking === piece.id) b.dataset.trying = 'true';
      b.setAttribute('aria-pressed', String(this.selected === piece.id));
      const name = document.createElement('span');
      name.className = 'wardrobe-card-name';
      name.textContent = piece.name[locale];
      const status = document.createElement('span');
      status.className = 'wardrobe-card-status';
      if (owned) status.textContent = placed ? tr('homePlaced', locale) : tr('homeInBox', locale);
      else if (lock) status.textContent = lock.kind === 'price' ? `● ${lock.price}` : `🔒 ${lockText(lock, locale)}`;
      b.append(furnitureCanvas(piece), name, status);
      b.addEventListener('click', () => (owned ? this.select(piece.id) : this.look(piece)));
      return b;
    });
    if (cards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'panel-note';
      empty.textContent = tr('homeAllBought', locale);
      this.grid.replaceChildren(empty);
    } else {
      this.grid.replaceChildren(...cards);
    }
    this.renderActions();
  }

  private renderActions(): void {
    const looking = this.looking ? getFurniture(this.looking) : undefined;
    const lock = looking ? furnitureLock(looking, homeState(wardrobeOf(this.progress), this.progress.home)) : undefined;
    this.buy.hidden = lock?.kind !== 'price';
    if (lock?.kind === 'price') {
      this.buy.textContent = trf('shopBuy', this.progress.locale, { n: lock.price });
      this.buy.disabled = this.progress.coins < lock.price;
    }
    this.store.hidden = !this.selected || !this.progress.home.placed.some((p) => p.id === this.selected);
  }

  /** En el catálogo: mirar un mueble (precio o lo que falta para tenerlo). */
  private look(piece: FurniturePiece): void {
    const locale = this.progress.locale;
    this.looking = piece.id;
    this.cancelSelection();
    const lock = furnitureLock(piece, homeState(wardrobeOf(this.progress), this.progress.home));
    sfx('tap');
    if (lock?.kind === 'price') {
      const missing = lock.price - this.progress.coins;
      this.say(missing > 0 ? trf('shopNeedCoins', locale, { n: missing }) : `${piece.name[locale]} · ${lock.price} ${tr('coins', locale)}`, missing > 0 ? 'bad' : 'info');
    } else if (lock) {
      this.say(`🔒 ${piece.name[locale]}: ${lockText(lock, locale)}`, 'info');
    }
    this.renderGrid();
  }

  private buyLooking(): void {
    const id = this.looking;
    if (!id) return;
    const result = buyFurniture(this.progress.home, wardrobeOf(this.progress), this.progress.coins, id);
    if (!result.ok) {
      this.renderActions();
      return;
    }
    this.progress.coins = result.coins;
    this.progress.home = result.home;
    this.save();
    sfx('chest');
    confetti(40);
    this.tab = 'mine';
    this.select(id);
    this.say(tr('homeBought', this.progress.locale), 'good');
  }

  private storeSelected(): void {
    const id = this.selected;
    if (!id) return;
    this.progress.home = removeFurniture(this.progress.home, id);
    this.save();
    this.sprites.get(id)?.destroy();
    this.sprites.delete(id);
    this.cancelSelection();
    sfx('tap');
    this.say(tr('homeStored', this.progress.locale), 'info');
    this.renderGrid();
  }

  private cancelSelection(): void {
    this.selected = undefined;
    this.ghost?.destroy();
    this.ghost = undefined;
  }
}

