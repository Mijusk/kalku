import Phaser from 'phaser';
import {
  characterName,
  questTemplate,
  questText,
  type Quest,
  chaptersDone,
  regionStory,
  REGION_STORIES,
  type Anchor,
  type CreatureId,
  type RegionStory,
  creaturesForSkill,
  currentStep,
  getCreature,
  isStoryDone,
  objectiveText,
  regionOpen,
  storyIn,
  type CharacterId,
  type StoryState,
} from '@kalku/content';
import { pickSkill, type Rng } from '@kalku/exercises';
import type { Point, RegionMap } from '@kalku/world';
import type { MapSpriteId } from '@kalku/art';
import { mapSpriteKey, TILE_SIZE } from '../art/textures';
import { tr } from '../i18n';
import { loadProgress } from '../progress';
import { reducedMotion } from '../ui/fx';
import type { EncounterData } from '../worldState';
import { FX_TEXTURES } from './battleFx';

/** Personajes que viven en el mapa (Uni va siempre contigo y el narrador no sale). Cada región dice cuáles (`RegionStory.npcs`). */
export type MapNpc = CharacterId;

/** Qué pasa al llegar a una casilla de la historia. */
export type StoryAction =
  | { type: 'talk'; npc: MapNpc; target: boolean }
  /** Hablar con quien da el encargo (lo acepta). */
  | { type: 'quest'; npc: MapNpc }
  | { type: 'battle'; encounter: EncounterData }
  | { type: 'riddles' }
  /** El cartel del camino a otra región. */
  | { type: 'travel'; to: string };

const key = (p: Point): string => `${p.x},${p.y}`;
const dist = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Esquina del lugar o de la zona, o puerta de la zona, de un punto de los datos. */
function anchorBase(region: RegionMap, anchor: Anchor): Point | undefined {
  if (anchor.entrance) return region.entrance;
  if (anchor.place) return region.places.find((p) => p.id === anchor.place);
  if (anchor.zone) return region.places.find((p) => p.zone === anchor.zone);
  if (anchor.gate) return region.places.find((p) => p.zone === anchor.gate)?.gate;
  return undefined;
}

/** Cuánto gris le queda al mundo: 70 % al principio y nada al final. `story` = la de la región del mapa (`storyIn`). */
export function greyFor(story: StoryState): number {
  return 0.7 * (1 - chaptersDone(story) / regionStory(story.region).chapters.length);
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
  /** Encargo en curso (solo después del final). */
  private quest: Quest | null = null;
  private readonly data: RegionStory;
  /** Región del mapa (puede ser una ya terminada). */
  private readonly at: string;
  /** Carteles de los caminos a otras regiones. */
  private readonly paths: { to: string; tile: Point; sprite: Phaser.GameObjects.Image }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly region: RegionMap,
    private readonly hero: Phaser.GameObjects.Image,
  ) {
    const progress = loadProgress();
    this.at = regionStory(progress.at).id;
    this.story = storyIn(progress.story, this.at);
    const data = regionStory(this.at);
    this.data = data;
    // Dónde vive cada cosa sale de los datos de la región (docs/JUEGO-SIN-FIN.md).
    for (const [npc, anchor] of Object.entries(data.npcs) as [MapNpc, Anchor][]) {
      const tile = this.anchorTile(anchor);
      if (tile) this.npcTiles.set(npc, tile);
    }
    for (const light of data.lights) {
      const tile = this.anchorTile(light);
      if (tile) this.crystalTiles.push(tile);
    }
    const shadeAt = data.shade ? this.anchorTile(data.shade) : undefined;

    const bossIndex = region.tiles.indexOf('boss');
    this.bossTile = bossIndex >= 0 ? { x: bossIndex % region.width, y: Math.floor(bossIndex / region.width) } : undefined;
    this.firstTile = this.findFirstTile();

    for (const [npc, tile] of this.npcTiles) {
      const sprite = scene.add.image(this.cx(tile), this.cy(tile) - 2, mapSpriteKey(npc as MapSpriteId)).setDepth(2);
      this.npcSprites.set(npc, sprite);
      if (!reducedMotion()) scene.tweens.add({ targets: sprite, y: sprite.y - 1, duration: 600 + tile.x * 7, yoyo: true, repeat: -1 });
    }
    if (shadeAt && data.shade) {
      // La cueva está a oscuras hasta encender los cristales.
      this.caveShade = scene.add
        .rectangle(shadeAt.x * TILE_SIZE, shadeAt.y * TILE_SIZE, data.shade.width * TILE_SIZE, data.shade.height * TILE_SIZE, 0x0b0a14, 0.6)
        .setOrigin(0)
        .setDepth(1.5);
    }
    this.crystalTiles.forEach((tile) => {
      this.crystalSprites.push(scene.add.image(this.cx(tile), this.cy(tile), mapSpriteKey(data.lightSprites.off)).setDepth(1.6));
    });
    for (const path of data.paths) {
      const tile = this.anchorTile(path);
      if (!tile) continue;
      const sprite = scene.add.image(this.cx(tile), this.cy(tile) - 4, mapSpriteKey('signpost')).setDepth(1.8);
      this.paths.push({ to: path.to, tile, sprite });
    }

    this.uni = scene.add.image(hero.x - 10, hero.y - 12, mapSpriteKey('uni')).setDepth(3);
    if (!reducedMotion()) scene.tweens.add({ targets: this.uni, alpha: 0.75, duration: 500, yoyo: true, repeat: -1 });
    this.alert = scene.add.image(0, 0, FX_TEXTURES.alert).setDepth(4).setVisible(false);
    if (!reducedMotion()) scene.tweens.add({ targets: this.alert, scale: 1.25, duration: 350, yoyo: true, repeat: -1 });
    this.arrow = scene.add.image(0, 0, FX_TEXTURES.arrow).setDepth(4).setVisible(false);
    this.refresh();
  }

  /** Casilla de un punto de los datos: esquina de un lugar o puerta de una zona, más el desplazamiento. */
  private anchorTile(anchor: Anchor): Point | undefined {
    const base = anchorBase(this.region, anchor);
    return base ? { x: base.x + anchor.dx, y: base.y + anchor.dy } : undefined;
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
    const progress = loadProgress();
    this.story = storyIn(progress.story, this.at);
    // Un cartel solo se ve si su región está abierta (la siguiente, al terminar esta).
    for (const path of this.paths) path.sprite.setVisible(regionOpen(progress.story, path.to));
    const questBefore = this.quest;
    this.quest = progress.quest;
    if (questBefore?.template !== this.quest?.template || questBefore?.accepted !== this.quest?.accepted) this.lastTalk = undefined;
    // Paso nuevo: el personaje de al lado puede tener algo nuevo que decir.
    if (before !== this.story.step) this.lastTalk = undefined;
    const step = currentStep(this.story);
    const done = isStoryDone(this.story);
    // Hay quien solo vive en el mapa después del final (Borroncito).
    for (const [npc, sprite] of this.npcSprites) if (this.data.npcs[npc]?.afterEnd) sprite.setVisible(done);
    // Cristales encendidos (todos, una vez pasado ese paso).
    const crystalStep = currentStep(this.story)?.kind === 'crystals';
    const crystalsIndex = this.data.steps.findIndex((st) => st.kind === 'crystals');
    const pastCrystals = crystalsIndex >= 0 && this.story.step > crystalsIndex;
    let lit = 0;
    this.crystalSprites.forEach((sprite, i) => {
      const on = pastCrystals || (crystalStep && this.story.crystals.includes(i));
      if (on) lit += 1;
      sprite.setTexture(mapSpriteKey(on ? this.data.lightSprites.on : this.data.lightSprites.off));
    });
    this.caveShade?.setFillStyle(0x0b0a14, 0.6 * (1 - lit / Math.max(1, this.crystalSprites.length)));

    // Primer Sumus Brote, solo en su paso.
    if (step?.kind === 'firstRescue' && this.data.firstCreature && !this.firstSprite) {
      this.firstSprite = this.scene.add
        .image(this.cx(this.firstTile), this.cy(this.firstTile), getCreature(this.data.firstCreature as CreatureId).sprite, 0)
        .setScale(0.75)
        .setDepth(2);
      if (!reducedMotion()) this.scene.tweens.add({ targets: this.firstSprite, x: this.firstSprite.x + 1.5, duration: 80, yoyo: true, repeat: -1 });
    } else if (step?.kind !== 'firstRescue') {
      this.firstSprite?.destroy();
      this.firstSprite = undefined;
    }
    // El Borrón espera en su claro desde el capítulo 5.
    if (step?.kind === 'boss' && this.bossTile && !this.bossSprite) {
      this.bossSprite = this.scene.add.image(this.cx(this.bossTile), this.cy(this.bossTile) - 8, mapSpriteKey(this.data.boss.sprite)).setDepth(2);
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
    if (!step) return this.questTarget(wanderers, from);
    switch (step.kind) {
      case 'firstRescue':
        return this.firstTile;
      case 'talk':
        return step.npc ? this.npcTiles.get(step.npc as MapNpc) : undefined;
      case 'riddles':
        return this.riddler ? this.npcTiles.get(this.riddler) : undefined;
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

  /** Objetivo del encargo: quien lo da, Pedrolo para los acertijos o la criatura más cercana. */
  private questTarget(wanderers: readonly { tile: Point }[], from: Point): Point | undefined {
    const q = this.quest;
    if (!q) return undefined;
    if (!q.accepted) return this.npcTiles.get(q.npc as MapNpc);
    if (q.kind === 'riddles') return this.npcTiles.get(q.npc);
    let best: Point | undefined;
    for (const w of wanderers) if (!best || dist(w.tile, from) < dist(best, from)) best = w.tile;
    return best;
  }

  /** Si el objetivo es una criatura del mapa (sin marca «!» encima). */
  private targetIsWild(): boolean {
    const step = currentStep(this.story);
    if (step) return step.kind === 'collect';
    return this.quest !== null && this.quest.accepted && this.quest.kind !== 'riddles';
  }

  /** Mueve a Uni detrás del personaje, la marca «!» y la flecha. Se llama cada fotograma. */
  update(heroTile: Point, wanderers: readonly { tile: Point }[]): void {
    const tx = this.hero.x - (this.hero.flipX ? -10 : 10);
    const ty = this.hero.y - 12;
    this.uni.x += (tx - this.uni.x) * 0.12;
    this.uni.y += (ty - this.uni.y) * 0.12;
    const target = this.target(wanderers, heroTile);
    const marker = target && !this.targetIsWild();
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
    if (step?.kind === 'firstRescue' && this.data.firstCreature && here === key(this.firstTile)) {
      // El primer combate es siempre un Sumus Brote, con ejercicios de su nivel.
      const pick = pickSkill(profile, rng);
      return { type: 'battle', encounter: { wandererId: -1, data: { creature: this.data.firstCreature as CreatureId, skill: pick.skill, slot: pick.slot }, story: { where: 'first' } } };
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
    const progress = loadProgress();
    for (const path of this.paths) {
      if (here === key(path.tile) && regionOpen(progress.story, path.to)) return { type: 'travel', to: path.to };
    }
    const q = isStoryDone(this.story) ? this.quest : null;
    // Personajes: el del objetivo habla al acercarse; los demás, si te pones encima.
    for (const [npc, t] of this.npcTiles) {
      if (this.data.npcs[npc]?.afterEnd && !isStoryDone(this.story)) continue;
      const questGiver = q !== null && !q.accepted && q.npc === npc;
      const questRiddles = q !== null && q.accepted && q.kind === 'riddles' && npc === q.npc;
      const isTarget = (step?.kind === 'talk' && step.npc === npc) || (step?.kind === 'riddles' && npc === this.riddler) || questGiver || questRiddles;
      const d = dist(t, tile);
      if ((isTarget && d <= 1) || d === 0) {
        if (this.lastTalk === npc) return undefined;
        this.lastTalk = npc;
        if (isTarget && (step?.kind === 'riddles' || questRiddles)) return { type: 'riddles' };
        if (questGiver) return { type: 'quest', npc };
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
      const q = this.quest;
      // Un encargo de alguien de otra región: se dice dónde vive.
      const away = q !== null && this.data.npcs[q.npc] === undefined;
      const template = q ? questTemplate(q.template) : undefined;
      if (!q || !template) {
        chapter.textContent = tr('questDone', locale);
        title.textContent = tr('questFree', locale);
        this.card.replaceChildren(chapter, title);
        return;
      }
      const who = characterName(q.npc)[locale];
      chapter.textContent = away ? `${tr('questFrom', locale)} ${who} · ${regionOf(q.npc)?.name[locale] ?? ''}` : `${tr('questFrom', locale)} ${who}`;
      title.textContent = q.accepted ? questText(template.objective, q.need, locale) : `${tr('talkTo', locale)} ${who}`;
      this.card.replaceChildren(chapter, title);
      if (q.accepted) {
        const counter = document.createElement('p');
        counter.className = 'quest-counter';
        counter.textContent = `${q.have}/${q.need}`;
        this.card.append(counter);
      }
      return;
    }
    const chapterTitle = this.data.chapters.find((c) => c.chapter === obj.chapter)?.title[locale] ?? '';
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
    return this.npcSprites.get(npc);
  }

  /** Quien pone los acertijos en esta región. */
  private get riddler(): CharacterId | undefined {
    return this.data.riddler?.npc;
  }
}

/** La región donde vive un personaje. */
function regionOf(npc: CharacterId): RegionStory | undefined {
  return REGION_STORIES.find((r) => r.npcs[npc] !== undefined);
}
