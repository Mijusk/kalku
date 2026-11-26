import Phaser from 'phaser';
import {
  CHAPTERS,
  chaptersDone,
  creaturesForSkill,
  currentStep,
  getCreature,
  isStoryDone,
  objectiveText,
  type CharacterId,
  type StoryState,
} from '@kalku/content';
import { pickSkill, type Rng } from '@kalku/exercises';
import type { Point, RegionMap } from '@kalku/world';
import { mapSpriteKey, TILE_SIZE } from '../art/textures';
import { tr } from '../i18n';
import { loadProgress } from '../progress';
import { reducedMotion } from '../ui/fx';
import type { EncounterData } from '../worldState';
import { FX_TEXTURES } from './battleFx';

/** Personajes que viven en el mapa (Uni va siempre contigo y el narrador no sale). */
export type MapNpc = 'tecla' | 'bruno' | 'lina' | 'pedrolo' | 'borroncito';

/** Qué pasa al llegar a una casilla de la historia. */
export type StoryAction =
  | { type: 'talk'; npc: MapNpc; target: boolean }
  | { type: 'battle'; encounter: EncounterData }
  | { type: 'riddles' };

const key = (p: Point): string => `${p.x},${p.y}`;
const dist = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Cuánto gris le queda al mundo: 70 % al principio y nada al final. */
export function greyFor(story: StoryState): number {
  return 0.7 * (1 - chaptersDone(story) / CHAPTERS.length);
}

/**
 * La historia dentro del mapa: personajes del pueblo, Uni que te sigue, la
 * tarjeta de misión, la flecha que apunta al objetivo y lo que hay que
 * tocar (el primer Sumus Brote, los cristales y el Gran Borrón).
 */
export class WorldStory {
  readonly npcTiles = new Map<MapNpc, Point>();
  private readonly npcSprites = new Map<MapNpc, Phaser.GameObjects.Image>();
  readonly crystalTiles: Point[] = [];
  private readonly crystalSprites: Phaser.GameObjects.Image[] = [];
  private caveShade: Phaser.GameObjects.Rectangle | undefined;
  readonly firstTile: Point;
  readonly bossTile: Point | undefined;
  private firstSprite: Phaser.GameObjects.Image | undefined;
  private bossSprite: Phaser.GameObjects.Image | undefined;
  private readonly uni: Phaser.GameObjects.Image;
  private readonly alert: Phaser.GameObjects.Image;
  private readonly arrow: Phaser.GameObjects.Image;
  private card: HTMLElement | undefined;
  /** Último personaje con el que se ha hablado; no repite hasta alejarse. */
  private lastTalk: MapNpc | undefined;
  private story: StoryState;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly region: RegionMap,
    private readonly hero: Phaser.GameObjects.Image,
  ) {
    this.story = loadProgress().story;
    const place = (id: string): { x: number; y: number; gate?: Point } | undefined => region.places.find((p) => p.id === id);
    const pueblo = place('pueblo-pradera');
    if (pueblo) this.npcTiles.set('tecla', { x: pueblo.x + 6, y: pueblo.y + 4 });
    const byZone = (zone: string): Point | undefined => region.places.find((p) => p.zone === zone)?.gate;
    const nextTo = (p: Point | undefined): Point | undefined => (p ? { x: p.x + 1, y: p.y + 1 } : undefined);
    const bruno = nextTo(byZone('puente-roto'));
    const lina = nextTo(byZone('cueva'));
    const pedrolo = nextTo(byZone('puerta-de-piedra'));
    if (bruno) this.npcTiles.set('bruno', bruno);
    if (lina) this.npcTiles.set('lina', lina);
    if (pedrolo) this.npcTiles.set('pedrolo', pedrolo);
    if (pueblo) this.npcTiles.set('borroncito', { x: pueblo.x + 4, y: pueblo.y + 4 });

    const cave = region.places.find((p) => p.zone === 'cueva');
    if (cave) for (const dx of [1, 3, 5]) this.crystalTiles.push({ x: cave.x + dx, y: cave.y + 1 });

    const bossIndex = region.tiles.indexOf('boss');
    this.bossTile = bossIndex >= 0 ? { x: bossIndex % region.width, y: Math.floor(bossIndex / region.width) } : undefined;
    this.firstTile = this.findFirstTile();

    for (const [npc, tile] of this.npcTiles) {
      const sprite = scene.add.image(this.cx(tile), this.cy(tile) - 2, mapSpriteKey(npc)).setDepth(2);
      this.npcSprites.set(npc, sprite);
      if (!reducedMotion()) scene.tweens.add({ targets: sprite, y: sprite.y - 1, duration: 600 + tile.x * 7, yoyo: true, repeat: -1 });
    }
    if (cave) {
      // La cueva está a oscuras hasta encender los cristales.
      this.caveShade = scene.add
        .rectangle((cave.x + 1) * TILE_SIZE, (cave.y + 1) * TILE_SIZE, 5 * TILE_SIZE, 2 * TILE_SIZE, 0x0b0a14, 0.6)
        .setOrigin(0)
        .setDepth(1.5);
    }
    this.crystalTiles.forEach((tile) => {
      this.crystalSprites.push(scene.add.image(this.cx(tile), this.cy(tile), mapSpriteKey('crystal-off')).setDepth(1.6));
    });

    this.uni = scene.add.image(hero.x - 10, hero.y - 12, mapSpriteKey('uni')).setDepth(3);
    if (!reducedMotion()) scene.tweens.add({ targets: this.uni, alpha: 0.75, duration: 500, yoyo: true, repeat: -1 });
    this.alert = scene.add.image(0, 0, FX_TEXTURES.alert).setDepth(4).setVisible(false);
    if (!reducedMotion()) scene.tweens.add({ targets: this.alert, scale: 1.25, duration: 350, yoyo: true, repeat: -1 });
    this.arrow = scene.add.image(0, 0, FX_TEXTURES.arrow).setDepth(4).setVisible(false);
    this.refresh();
  }

  private cx(p: Point): number {
    return p.x * TILE_SIZE + TILE_SIZE / 2;
  }

  private cy(p: Point): number {
    return p.y * TILE_SIZE + TILE_SIZE / 2;
  }

  /** Una casilla de hierba alta cerca de la entrada para el primer Sumus Brote. */
  private findFirstTile(): Point {
    const { entrance, width, height, tiles } = this.region;
    const want = { x: entrance.x + 6, y: entrance.y };
    let best: Point = { x: entrance.x + 3, y: entrance.y };
    let bestD = Infinity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const kind = tiles[y * width + x];
        if (kind !== 'tallGrass' && kind !== 'grass') continue;
        const d = dist({ x, y }, want) + (kind === 'grass' ? 2 : 0);
        if (d < bestD && x > entrance.x + 2) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /** Repinta todo según el punto de la historia (al crear el mapa y tras cada avance). */
  refresh(): void {
    const before = this.story.step;
    this.story = loadProgress().story;
    // Paso nuevo: el personaje de al lado puede tener algo nuevo que decir.
    if (before !== this.story.step) this.lastTalk = undefined;
    const step = currentStep(this.story);
    const done = isStoryDone(this.story);
    // Borroncito solo vive en el pueblo después del final.
    this.npcSprites.get('borroncito')?.setVisible(done);
    // Cristales encendidos (todos, una vez pasado ese paso).
    const crystalStep = currentStep(this.story)?.kind === 'crystals';
    const pastCrystals = chaptersDone(this.story) >= 3;
    let lit = 0;
    this.crystalSprites.forEach((sprite, i) => {
      const on = pastCrystals || (crystalStep && this.story.crystals.includes(i));
      if (on) lit += 1;
      sprite.setTexture(mapSpriteKey(on ? 'crystal-on' : 'crystal-off'));
    });
    this.caveShade?.setFillStyle(0x0b0a14, 0.6 * (1 - lit / 3));

    // Primer Sumus Brote, solo en su paso.
    if (step?.kind === 'firstRescue' && !this.firstSprite) {
      this.firstSprite = this.scene.add
        .image(this.cx(this.firstTile), this.cy(this.firstTile), getCreature('sumus-brote').sprite, 0)
        .setScale(0.75)
        .setDepth(2);
      if (!reducedMotion()) this.scene.tweens.add({ targets: this.firstSprite, x: this.firstSprite.x + 1.5, duration: 80, yoyo: true, repeat: -1 });
    } else if (step?.kind !== 'firstRescue') {
      this.firstSprite?.destroy();
      this.firstSprite = undefined;
    }
    // El Borrón espera en su claro desde el capítulo 5.
    if (step?.kind === 'boss' && this.bossTile && !this.bossSprite) {
      this.bossSprite = this.scene.add.image(this.cx(this.bossTile), this.cy(this.bossTile) - 8, mapSpriteKey('borron')).setDepth(2);
      if (!reducedMotion()) this.scene.tweens.add({ targets: this.bossSprite, scaleX: 1.08, duration: 500, yoyo: true, repeat: -1 });
    } else if (step?.kind !== 'boss') {
      this.bossSprite?.destroy();
      this.bossSprite = undefined;
    }
    this.renderCard();
  }

  /** Dónde está el objetivo de ahora (para la flecha y la marca «!»). `wild` = la criatura más cercana. */
  target(wanderers: readonly { tile: Point }[], from: Point): Point | undefined {
    const step = currentStep(this.story);
    if (!step) return undefined;
    switch (step.kind) {
      case 'firstRescue':
        return this.firstTile;
      case 'talk':
        return step.npc ? this.npcTiles.get(step.npc as MapNpc) : undefined;
      case 'riddles':
        return this.npcTiles.get('pedrolo');
      case 'crystals':
        return this.crystalTiles.find((_, i) => !this.story.crystals.includes(i));
      case 'boss':
        return this.bossTile;
      case 'collect': {
        let best: Point | undefined;
        for (const w of wanderers) if (!best || dist(w.tile, from) < dist(best, from)) best = w.tile;
        return best;
      }
      default:
        return undefined;
    }
  }

  /** Mueve a Uni detrás del personaje, la marca «!» y la flecha. Se llama cada fotograma. */
  update(heroTile: Point, wanderers: readonly { tile: Point }[]): void {
    const tx = this.hero.x - (this.hero.flipX ? -10 : 10);
    const ty = this.hero.y - 12;
    this.uni.x += (tx - this.uni.x) * 0.12;
    this.uni.y += (ty - this.uni.y) * 0.12;
    const target = this.target(wanderers, heroTile);
    const step = currentStep(this.story);
    const marker = target && step?.kind !== 'collect';
    this.alert.setVisible(Boolean(marker));
    if (target && marker) this.alert.setPosition(this.cx(target), this.cy(target) - 16);
    // Flecha alrededor del personaje, apuntando al objetivo cuando está lejos.
    if (target && dist(target, heroTile) > 3) {
      const angle = Math.atan2(this.cy(target) - this.hero.y, this.cx(target) - this.hero.x);
      this.arrow.setVisible(true).setRotation(angle).setPosition(this.hero.x + Math.cos(angle) * 18, this.hero.y + Math.sin(angle) * 18);
    } else this.arrow.setVisible(false);
    if (this.lastTalk) {
      const t = this.npcTiles.get(this.lastTalk);
      if (!t || dist(t, heroTile) > 2) this.lastTalk = undefined;
    }
  }

  /** Lo que pasa al llegar a `tile`, si es algo de la historia. */
  arrive(tile: Point, rng: Rng): StoryAction | undefined {
    const step = currentStep(this.story);
    const profile = loadProgress().profile;
    const here = key(tile);
    if (step?.kind === 'firstRescue' && here === key(this.firstTile)) {
      // El primer combate es siempre un Sumus Brote, con ejercicios de su nivel.
      const pick = pickSkill(profile, rng);
      return { type: 'battle', encounter: { wandererId: -1, data: { creature: 'sumus-brote', skill: pick.skill, slot: pick.slot }, story: { where: 'first' } } };
    }
    if (step?.kind === 'crystals') {
      const i = this.crystalTiles.findIndex((c) => key(c) === here);
      if (i >= 0 && !this.story.crystals.includes(i)) {
        const pick = pickSkill(profile, rng);
        const creature = rng.pick(creaturesForSkill(pick.skill)).id;
        return { type: 'battle', encounter: { wandererId: -1, data: { creature, skill: pick.skill, slot: pick.slot }, story: { where: 'crystal', crystal: i } } };
      }
    }
    if (step?.kind === 'boss' && this.bossTile && dist(tile, this.bossTile) <= 1) {
      const pick = pickSkill(profile, rng);
      return { type: 'battle', encounter: { wandererId: -1, data: { creature: 'problemus-cuentin', skill: pick.skill, slot: pick.slot }, story: { where: 'boss' } } };
    }
    // Personajes: el del objetivo habla al acercarse; los demás, si te pones encima.
    for (const [npc, t] of this.npcTiles) {
      if (npc === 'borroncito' && !isStoryDone(this.story)) continue;
      const isTarget = (step?.kind === 'talk' && step.npc === npc) || (step?.kind === 'riddles' && npc === 'pedrolo');
      const d = dist(t, tile);
      if ((isTarget && d <= 1) || d === 0) {
        if (this.lastTalk === npc) return undefined;
        this.lastTalk = npc;
        if (isTarget && step?.kind === 'riddles') return { type: 'riddles' };
        return { type: 'talk', npc, target: isTarget };
      }
    }
    return undefined;
  }

  /** Tarjeta de misión arriba a la izquierda: capítulo, objetivo y contador. */
  private renderCard(): void {
    const ui = document.getElementById('ui');
    if (!ui) return;
    const locale = loadProgress().locale;
    if (!this.card?.isConnected) {
      this.card = document.createElement('div');
      this.card.className = 'quest-card';
      this.card.setAttribute('role', 'status');
      this.card.addEventListener('pointerdown', (e) => e.stopPropagation());
      ui.append(this.card);
    }
    const obj = objectiveText(this.story, locale);
    const chapter = document.createElement('p');
    chapter.className = 'quest-chapter';
    const title = document.createElement('p');
    title.className = 'quest-title';
    if (!obj) {
      chapter.textContent = tr('questDone', locale);
      title.textContent = tr('questFree', locale);
      this.card.replaceChildren(chapter, title);
      return;
    }
    const chapterTitle = CHAPTERS.find((c) => c.chapter === obj.chapter)?.title[locale] ?? '';
    chapter.textContent = `${tr('chapter', locale)} ${obj.chapter} · ${chapterTitle}`;
    title.textContent = obj.title;
    this.card.replaceChildren(chapter, title);
    if (obj.counter) {
      const counter = document.createElement('p');
      counter.className = 'quest-counter';
      counter.textContent = obj.counter;
      this.card.append(counter);
    }
  }

  /** Tras abrir una zona o encender algo, se mira el sitio. */
  focusOn(tile: Point, then: () => void): void {
    const camera = this.scene.cameras.main;
    if (reducedMotion()) {
      then();
      return;
    }
    camera.stopFollow();
    camera.pan(this.cx(tile), this.cy(tile), 600, 'Sine.easeInOut', false, (_c, progress) => {
      if (progress < 1) return;
      this.scene.time.delayedCall(900, () => {
        then();
        camera.pan(this.hero.x, this.hero.y, 500, 'Sine.easeInOut', false, (_c2, p2) => {
          if (p2 === 1) camera.startFollow(this.hero, true);
        });
      });
    });
  }

  /** Lo que hay que borrar al salir del mapa. */
  destroy(): void {
    this.card?.remove();
  }

  npcSprite(npc: CharacterId): Phaser.GameObjects.Image | undefined {
    return this.npcSprites.get(npc as MapNpc);
  }
}
