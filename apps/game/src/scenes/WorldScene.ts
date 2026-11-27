import Phaser from 'phaser';
import { creaturesForSkill, dateKey, FIRST_REGION, getCreature, surpriseAvailable, surpriseSpot, GUEST_CHANCE, rollShiny, shinySprite, getZone, ITEMS, questTemplate, questText, regionStory, SCENES, storyIn, travel, type CharacterId, type SceneId, type StoryOutcome, type ZoneDefinition } from '@kalku/content';
import { currentSkill, challengeSkill, createRng, pickSkill, randomSeed, type Rng } from '@kalku/exercises';
import {
  createWildlife,
  findCollision,
  generateRegion,
  openGate,
  pathTo,
  regionSpec,
  step,
  tickWildlife,
  zoneInterior,
  type Direction,
  type PlacedPiece,
  type Point,
  type RegionMap,
  type RegionSpec,
} from '@kalku/world';
import { playMusic, sfx } from '../audio/sound';
import { tr } from '../i18n';
import { currentEvent } from '../events';
import { loadProgress, saveProgress } from '../progress';
import { ARRIVAL_KEY, WORLD_STATE_KEY, BATTLE_RESULT_KEY, PENDING_OUTCOME_KEY, PENDING_QUEST_KEY, type BattleResult, type EncounterData, type WildData, type WorldState } from '../worldState';
import { applyQuestEvent, applyStoryEvent, nickname, playScenes, type QuestOutcome } from '../storyFlow';
import { dialogOpen, playDialog } from '../ui/DialogBox';
import { openMissionsPanel } from '../ui/MissionsPanel';
import { banner, confetti } from '../ui/fx';
import { burst, ensureFxTextures } from './battleFx';

/** Clave del registro: día en que ya se avisó del cofre sorpresa (para no repetirlo tras cada combate). */
const SURPRISE_HINT_KEY = 'surpriseHinted';
/** Para decir solo una vez por partida «Esta es tu casa» al pasar cerca. */
const HOME_HINT_KEY = 'homeHinted';
import { greyFor, WorldStory, type MapNpc, type StoryAction } from './worldStory';
import { CREATURE_FRAMES, findBuildings, tilemapData } from '@kalku/art';
import { activeClassId } from '../classDevice';
import { appClassLoginBackend, leaveSharedDevice } from '../classLogin';
import { ANIMATION_MS, HOME_MARK_TEXTURE, buildingTexture, CHEST_TEXTURES, createHeroTexture, GATE_TEXTURE, HERO_KEY, mapSpriteKey, SURPRISE_TEXTURES, TILE_SIZE, TILESET_KEYS } from '../art/textures';
import { earnedSince, wardrobeOf } from '../items';
import { showNewItems } from '../ui/itemToast';
import { openWardrobe } from '../ui/WardrobePanel';

/**
 * Tamaño de las criaturas en el mapa: se dibujan a 32 px para el combate y
 * aquí se ven a 3/4 (24 px): algo más grandes que el personaje, pero sin
 * perder el contorno, que a la mitad se pierde en la hierba alta.
 */
const WILD_SCALE = 0.75;

/** El compañero se ve algo más pequeño que las criaturas salvajes, para no confundirlo con ellas. */
const COMPANION_SCALE = 0.55;

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

/** Lo que dice un personaje cuando no toca nada con él (si no tiene frase propia, habla Uni). */
function idleScene(npc: CharacterId): SceneId {
  const id = `idle-${npc}`;
  return id in SCENES ? (id as SceneId) : 'idle-uni';
}
/** El evento ya anunciado en esta partida (registro de Phaser, solo en memoria). */
const EVENT_GREETED_KEY = 'eventGreeted';

const reducedMotionNow = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const near = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= ZONE_NEAR;

/**
 * Mapa de la región: dibuja la región donde está el niño con un tilemap creado por código y
 * mueve al personaje casilla a casilla, con teclado (flechas o WASD) o
 * tocando la pantalla (va andando hasta donde se toca).
 */
export class WorldScene extends Phaser.Scene {
  /** La región del mapa: la de `progress.at` (la semilla fija hace que todos vean el mismo). */
  private spec!: RegionSpec;
  private region!: RegionMap;
  private hero!: Phaser.GameObjects.Image;
  /** Último paso del personaje (1 o 3), para alternar. */
  private stepFrame = 3;
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
  private story!: WorldStory;
  /** Filtro gris del mundo: se va quitando capítulo a capítulo. */
  private grey: Phaser.FX.ColorMatrix | undefined;
  private greyLevel = 0;
  /** Mientras se cuenta algo de la historia, el personaje no se mueve. */
  private storyBusy = false;
  /** Casillas delante de la puerta de cada tienda: al pararse ahí, se entra. */
  private shopDoors: Point[] = [];
  /** Puerta de su casa (la primera casa de Pradera Uno). */
  private homeDoor: Point | undefined;
  /** La criatura que le acompaña (elegida en la Colección), un paso por detrás. */
  private companion: Phaser.GameObjects.Image | undefined;
  /** El cofre sorpresa de hoy en este mapa, si aún no se ha abierto. */
  private surprise: { tile: Point; sprite: Phaser.GameObjects.Image } | undefined;

  constructor() {
    super('world');
  }

  create(): void {
    // El mapa solo usa la interfaz HTML para el botón de la colección.
    this.createCollectionButton();

    playMusic('world');
    ensureFxTextures(this);
    this.storyBusy = false;
    this.spec = regionSpec(loadProgress().at);
    this.region = generateRegion(this.spec, this.spec.seed);
    this.createGround();
    this.createBuildings();
    this.createZones();
    this.createSurprise();

    this.encounterStarted = false;
    this.wild = new Map();
    const saved = this.registry.get(WORLD_STATE_KEY) as WorldState | undefined;
    if (saved && saved.region === this.spec.id) {
      this.state = saved;
    } else {
      const rng = createRng(randomSeed());
      const entrance = { ...this.region.entrance };
      this.state = {
        region: this.spec.id,
        tile: entrance,
        rng,
        wildlife: createWildlife(this.region, this.spec.wildlife, entrance, rng, (r, tile) => this.assignCreature(r, tile), this.allowTile),
      };
    }
    this.tile = { ...this.state.tile };
    this.hero = this.add.image(this.centerOf(this.tile).x, this.centerOf(this.tile).y, 'hero', 0).setDepth(2);
    this.createCompanion();

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.region.width * TILE_SIZE, this.region.height * TILE_SIZE);
    camera.startFollow(this.hero, true);
    camera.setRoundPixels(true);
    this.story = new WorldStory(this, this.region, this.hero);
    this.grey = camera.postFX?.addColorMatrix();
    this.setGrey(this.greyTarget());

    this.setupKeyboard();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const target = { x: Math.floor(pointer.worldX / TILE_SIZE), y: Math.floor(pointer.worldY / TILE_SIZE) };
      this.route = pathTo(this.region, this.tile, target);
    });
    this.syncWild();
    this.refreshZones();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeSign();
      this.story.destroy();
    });
    // Después del final siempre hay un encargo en marcha.
    applyQuestEvent(undefined);
    this.story.refresh();
    this.greetEvent();
    if (this.registry.get(ARRIVAL_KEY) === this.spec.id) {
      this.registry.remove(ARRIVAL_KEY);
      void this.arrive();
      return;
    }
    this.afterBattle();
  }

  /** Al entrar al mapa durante un evento de temporada, un cartel lo anuncia (una vez por partida). */
  private greetEvent(): void {
    const event = currentEvent();
    if (!event || this.registry.get(EVENT_GREETED_KEY) === event.id) return;
    this.registry.set(EVENT_GREETED_KEY, event.id);
    const locale = loadProgress().locale;
    this.time.delayedCall(800, () => banner(`${event.name[locale]} · ${event.greeting[locale]}`, 'win', 3200));
  }

  /** Gris de la región del mapa según sus capítulos terminados. */
  private greyTarget(): number {
    const progress = loadProgress();
    return greyFor(storyIn(progress.story, progress.at));
  }

  /** Primera vez en una región: su nombre y lo que cuenta Uni al llegar. */
  private async arrive(): Promise<void> {
    const data = regionStory(this.spec.id);
    const locale = loadProgress().locale;
    sfx('quest');
    banner(data.name[locale], 'info', 2600);
    await this.wait(1200);
    if (data.arrival) {
      const arrival = data.arrival;
      await this.tell(() => playScenes([arrival]));
    }
    this.story.refresh();
  }

  /** Por el cartel del camino a otra región: se guarda dónde está y el mapa se rehace. */
  private async goTo(to: string): Promise<void> {
    const progress = loadProgress();
    const trip = travel(progress.story, this.spec.id, to);
    if (!trip) return;
    const locale = progress.locale;
    await this.tell(async () => {
      sfx('door');
      banner(`${tr('travelTo', locale)} ${regionStory(to).name[locale]}`, 'info', 1600);
      await this.wait(900);
    });
    progress.story = trip.story;
    progress.at = trip.at;
    saveProgress(progress);
    this.registry.remove(WORLD_STATE_KEY);
    if (trip.first) this.registry.set(ARRIVAL_KEY, trip.at);
    this.encounterStarted = true;
    this.scene.restart();
  }

  private setGrey(level: number): void {
    this.greyLevel = level;
    if (!this.grey) return;
    this.grey.reset();
    this.grey.grayscale(level);
  }

  /** Al volver de un combate de la historia, se cuenta lo que ha pasado. */
  private afterBattle(): void {
    const result = this.registry.get(BATTLE_RESULT_KEY) as BattleResult | undefined;
    this.registry.remove(BATTLE_RESULT_KEY);
    const pending = this.registry.get(PENDING_OUTCOME_KEY) as StoryOutcome | undefined;
    this.registry.remove(PENDING_OUTCOME_KEY);
    if (pending) {
      void this.showOutcome(pending);
      return;
    }
    const pendingQuest = this.registry.get(PENDING_QUEST_KEY) as QuestOutcome | undefined;
    this.registry.remove(PENDING_QUEST_KEY);
    if (pendingQuest) {
      void this.showQuest(pendingQuest);
      return;
    }
    if (!result) return;
    if (result.won && result.story.where === 'wild') {
      const q = applyQuestEvent({ type: 'battleWon', rescued: result.rescued });
      if (q.changed) void this.showQuest(q);
    }
    if (!result.won) {
      // Perder no quita nada: Uni lo dice y se sigue.
      if (result.story.where !== 'wild') void this.tell(() => playScenes(['defeat']));
      return;
    }
    const where = result.story.where === 'first' ? 'wild' : result.story.where;
    const outcome = applyStoryEvent({ type: 'battleWon', where, ...(result.story.crystal !== undefined ? { crystal: result.story.crystal } : {}) });
    if (outcome.changed) void this.showOutcome(outcome);
  }

  /** Bloquea el mapa mientras dura `run`. */
  private async tell(run: () => Promise<void>): Promise<void> {
    this.storyBusy = true;
    this.route = [];
    try {
      await run();
    } finally {
      this.storyBusy = false;
    }
  }

  /** Enseña lo que ha pasado en la historia: objeto, diálogos, capítulo, zona y final. */
  private async showOutcome(outcome: StoryOutcome): Promise<void> {
    await this.showOutcomeNow(outcome);
    // Si el siguiente objetivo está justo aquí (Pedrolo tras presentarse), empieza sin tener que irse y volver.
    if (this.scene.isActive()) this.handleStory();
  }

  private showOutcomeNow(outcome: StoryOutcome): Promise<void> {
    return this.tell(async () => {
      const locale = loadProgress().locale;
      if (outcome.item) {
        sfx('quest');
        const label = `${ITEMS[outcome.item.id].found[locale]} ${outcome.item.have}/${outcome.item.need}`;
        banner(label, 'win', 1800);
        await this.wait(1200);
      }
      this.story.refresh();
      if (outcome.zoneOpened) {
        const zone = this.zones.find((z) => z.def.id === outcome.zoneOpened);
        if (outcome.scenes.length > 0) await playScenes(outcome.scenes);
        if (zone) await new Promise<void>((resolve) => this.story.focusOn(zone.gate, () => {
          this.openZone(zone);
          resolve();
        }));
        await this.wait(1200);
      } else if (outcome.scenes.length > 0) {
        await playScenes(outcome.scenes);
      }
      if (outcome.chapterDone !== undefined) await this.chapterDone();
      if (outcome.finished) {
        await this.ending();
        // Y ahora, el primer encargo de los personajes.
        applyQuestEvent(undefined);
      }
      this.story.refresh();
    });
  }

  /** Hablar con quien da el encargo: lo pide y queda aceptado. */
  private async acceptQuest(npc: MapNpc): Promise<void> {
    const progress = loadProgress();
    const quest = progress.quest;
    const template = quest ? questTemplate(quest.template) : undefined;
    if (!quest || !template) return;
    await this.tell(() =>
      playDialog([{ who: npc, text: { es: questText(template.ask, quest.need, 'es'), ca: questText(template.ask, quest.need, 'ca') } }], {
        locale: progress.locale,
        nickname: nickname(),
        voice: progress.settings.autoVoice,
      }),
    );
    sfx('quest');
    applyQuestEvent({ type: 'talked', npc });
    this.story.refresh();
    // Los acertijos empiezan ya, sin tener que irse y volver.
    if (this.scene.isActive()) this.handleStory();
  }

  /** Enseña el avance del encargo y, si se ha terminado, el premio y el agradecimiento. */
  private async showQuest(outcome: QuestOutcome): Promise<void> {
    this.story.refresh();
    const done = outcome.done;
    const template = done ? questTemplate(done.template) : undefined;
    if (!done || !template) return;
    const progress = loadProgress();
    await this.tell(async () => {
      sfx('chest');
      confetti(50);
      banner(`${tr('questComplete', progress.locale)} +${done.reward} ${tr('coins', progress.locale)}`, 'win', 2400);
      await this.wait(1200);
      await playDialog([{ who: done.npc, text: template.thanks }], { locale: progress.locale, nickname: nickname(), voice: progress.settings.autoVoice });
    });
    this.story.refresh();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /** Capítulo terminado: el mundo recupera parte del color. */
  private async chapterDone(): Promise<void> {
    const locale = loadProgress().locale;
    sfx('levelUp');
    banner(tr('chapterDone', locale), 'win', 2600);
    confetti(40);
    const target = this.greyTarget();
    const from = this.greyLevel;
    if (reducedMotionNow()) this.setGrey(target);
    else this.tweens.addCounter({ from, to: target, duration: 1600, onUpdate: (t) => this.setGrey(t.getValue() ?? target) });
    await this.wait(2000);
  }

  /** Final de la historia: fiesta en el pueblo. */
  private async ending(): Promise<void> {
    const locale = loadProgress().locale;
    sfx('win');
    confetti(120);
    banner(tr('questDone', locale), 'win', 4000);
    await this.wait(2500);
    await playScenes([regionStory(this.spec.id).afterEnding]);
  }

  /** Algo de la historia en esta casilla: hablar, combatir o los acertijos. */
  private handleStory(): boolean {
    if (this.storyBusy || this.encounterStarted) return false;
    const action = this.story.arrive(this.tile, this.state.rng);
    if (!action) return false;
    // Pasar por encima del cartel de camino a otra región no cuenta: hay que pararse en él.
    if (action.type === 'travel' && this.route.length > 0) return false;
    void this.runStory(action);
    return true;
  }

  private async runStory(action: StoryAction): Promise<void> {
    if (action.type === 'battle') {
      const appears = regionStory(this.spec.id).boss.appears;
      if (action.encounter.story?.where === 'boss') await this.tell(() => playScenes([appears]));
      this.startBattle(action.encounter);
      return;
    }
    if (action.type === 'riddles') {
      this.state.tile = { ...this.tile };
      this.registry.set(WORLD_STATE_KEY, this.state);
      this.encounterStarted = true;
      this.scene.start('riddle');
      return;
    }
    if (action.type === 'quest') {
      await this.acceptQuest(action.npc);
      return;
    }
    if (action.type === 'travel') {
      await this.goTo(action.to);
      return;
    }
    const npc = action.npc;
    if (!action.target) {
      await this.tell(() => playScenes([idleScene(npc)]));
      return;
    }
    const outcome = applyStoryEvent({ type: 'talked', npc });
    if (outcome.changed) await this.showOutcome(outcome);
    else await this.tell(() => playScenes([idleScene(npc)]));
  }

  private startBattle(data: EncounterData): void {
    this.encounterStarted = true;
    this.route = [];
    this.state.tile = { ...this.tile };
    this.registry.set(WORLD_STATE_KEY, this.state);
    this.scene.start('battle', data);
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
    const missions = document.createElement('button');
    missions.type = 'button';
    missions.className = 'btn btn-small world-button world-button-missions';
    missions.textContent = tr('missions', loadProgress().locale);
    missions.addEventListener('pointerdown', (e) => e.stopPropagation());
    missions.addEventListener('click', () => {
      if (this.encounterStarted || this.storyBusy) return;
      void this.tell(() => openMissionsPanel(ui, loadProgress()));
    });
    const wardrobe = document.createElement('button');
    wardrobe.type = 'button';
    wardrobe.className = 'btn btn-small world-button world-button-wardrobe';
    wardrobe.textContent = tr('wardrobe', loadProgress().locale);
    wardrobe.addEventListener('pointerdown', (e) => e.stopPropagation());
    wardrobe.addEventListener('click', () => this.openItems('wardrobe'));
    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'btn btn-small world-button world-button-home';
    home.textContent = tr('homeButton', loadProgress().locale);
    home.addEventListener('pointerdown', (e) => e.stopPropagation());
    home.addEventListener('click', () => this.enterHome());
    ui.replaceChildren(button, missions, wardrobe, home);
    // En un aparato de clase (#53), «Salir» deja el aparato limpio para el siguiente alumno.
    if (activeClassId(sessionStorage) !== null) {
      const leave = document.createElement('button');
      leave.type = 'button';
      leave.className = 'btn btn-small world-button world-button-left';
      leave.textContent = tr('classLeave', loadProgress().locale);
      leave.addEventListener('pointerdown', (e) => e.stopPropagation());
      leave.addEventListener('click', () => void this.leaveClass(leave));
      ui.append(leave);
    }
  }

  private async leaveClass(leave: HTMLButtonElement): Promise<void> {
    leave.disabled = true;
    leave.textContent = tr('classLeaving', loadProgress().locale);
    const classId = await leaveSharedDevice(appClassLoginBackend(), localStorage, sessionStorage);
    // Se recarga la página: sin memoria del alumno anterior y lista para el QR de la clase.
    window.location.assign(classId ? `${window.location.pathname}?clase=${encodeURIComponent(classId)}` : window.location.pathname);
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
    const data = tilemapData(this.region, this.spec.seed);
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

  /**
   * Compañero: la criatura elegida en la Colección anda un paso por detrás del
   * personaje y se mueve un poco (sus fotogramas). Solo compañía: no cuenta para
   * los encuentros ni para nada del juego.
   */
  private createCompanion(): void {
    this.companion = undefined;
    const chosen = loadProgress().companion;
    if (!chosen) return;
    const sprite = getCreature(chosen.id).sprite;
    const key = chosen.shiny ? shinySprite(sprite) : sprite;
    if (!this.textures.exists(key)) return;
    const { x, y } = this.centerOf(this.tile);
    const image = this.add.image(x - TILE_SIZE * 0.7, y + 2, key, 0).setScale(COMPANION_SCALE).setDepth(1.9);
    this.companion = image;
    if (reducedMotionNow()) return;
    let frame = 0;
    this.time.addEvent({ delay: ANIMATION_MS * 2, loop: true, callback: () => image.setFrame((frame = (frame + 1) % CREATURE_FRAMES)) });
  }

  /** El compañero va a la casilla que deja el personaje, mirando hacia donde anda. */
  private follow(from: Point, to: Point): void {
    const c = this.companion;
    if (!c) return;
    const { x, y } = this.centerOf(from);
    if (to.x !== from.x) c.setFlipX(to.x < from.x);
    this.tweens.killTweensOf(c);
    this.tweens.add({ targets: c, x, y: y + 2, duration: STEP_MS + 40, delay: 30 });
  }

  /** Armario o tienda, encima del mapa. El personaje no se mueve mientras está abierto. */
  private openItems(mode: 'wardrobe' | 'shop'): void {
    const ui = document.getElementById('ui');
    if (!ui || this.encounterStarted || this.storyBusy) return;
    if (mode === 'shop') sfx('door');
    void this.tell(() =>
      openWardrobe(ui, {
        mode,
        onOutfit: (outfit) => {
          createHeroTexture(this, outfit);
          this.hero.setTexture(HERO_KEY, 0);
        },
      }),
    );
  }

  /** La tienda (al pararse delante de su puerta) y el cofre sorpresa (al pisarlo). */
  private checkPlaces(): boolean {
    if (this.storyBusy || this.encounterStarted) return false;
    const surprise = this.surprise;
    if (surprise && surprise.tile.x === this.tile.x && surprise.tile.y === this.tile.y) {
      this.state.tile = { ...this.tile };
      this.registry.set(WORLD_STATE_KEY, this.state);
      this.encounterStarted = true;
      this.route = [];
      sfx('chest');
      this.scene.start('surprise');
      return true;
    }
    const door = this.homeDoor;
    if (door && this.route.length === 0 && door.x === this.tile.x && door.y === this.tile.y) {
      this.enterHome();
      return true;
    }
    if (door && !this.registry.get(HOME_HINT_KEY) && Math.abs(door.x - this.tile.x) + Math.abs(door.y - this.tile.y) <= 3) {
      this.registry.set(HOME_HINT_KEY, true);
      this.showMessage(tr('homeHint', loadProgress().locale));
    }
    if (this.route.length > 0) return false;
    if (this.shopDoors.some((d) => d.x === this.tile.x && d.y === this.tile.y)) {
      this.openItems('shop');
      return true;
    }
    return false;
  }

  /**
   * Cofre sorpresa del día: uno al día, en una casilla fija para esa fecha.
   * Morado, se balancea y suelta chispas para que se vea desde lejos.
   */
  private createSurprise(): void {
    this.surprise = undefined;
    const progress = loadProgress();
    const today = dateKey(new Date());
    if (!surpriseAvailable(progress.surpriseDay, today)) return;
    const tile = surpriseSpot(this.region, this.spec.id, today);
    if (!tile) return;
    const sprite = this.add.image(this.centerOf(tile).x, this.centerOf(tile).y, SURPRISE_TEXTURES.closed).setDepth(1);
    this.surprise = { tile, sprite };
    if (!reducedMotionNow()) {
      this.tweens.add({ targets: sprite, y: sprite.y - 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.time.addEvent({ delay: 2400, loop: true, callback: () => burst(this, sprite.x, sprite.y - 4, 'star', 6) });
    }
    if (this.registry.get(SURPRISE_HINT_KEY) !== today) {
      this.registry.set(SURPRISE_HINT_KEY, today);
      this.time.delayedCall(1500, () => {
        if (!this.storyBusy) this.showMessage(tr('surpriseHint', progress.locale));
      });
    }
  }

  /** Entra en su casa (desde la puerta o el botón). Al salir vuelve al mismo sitio del mapa. */
  private enterHome(): void {
    if (this.storyBusy || this.encounterStarted || dialogOpen()) return;
    this.state.tile = { ...this.tile };
    this.registry.set(WORLD_STATE_KEY, this.state);
    this.encounterStarted = true;
    this.route = [];
    sfx('door');
    this.scene.start('home');
  }

  /** Casas y tienda: cada edificio entero encima del suelo (el suelo de debajo es hierba). */
  private createBuildings(): void {
    this.shopDoors = findBuildings(this.region)
      .filter((b) => b.kind === 'shop')
      .map((b) => ({ x: b.x + Math.floor(b.width / 2), y: b.y + b.height }));
    const house = this.spec.id === FIRST_REGION ? findBuildings(this.region).find((b) => b.kind === 'house') : undefined;
    this.homeDoor = house ? { x: house.x + Math.floor(house.width / 2), y: house.y + house.height } : undefined;
    if (house) {
      // Un corazón encima del tejado: esta es su casa.
      const mark = this.add.image((house.x + house.width / 2) * TILE_SIZE, house.y * TILE_SIZE - 4, HOME_MARK_TEXTURE).setDepth(1.5);
      if (!reducedMotionNow()) this.tweens.add({ targets: mark, y: mark.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
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
      this.spec.wildlife,
      this.state.wildlife,
      delta,
      this.tile,
      this.state.rng,
      (r, tile) => this.assignCreature(r, tile),
      this.allowTile,
    );
    this.syncWild();
    this.story.update(this.tile, this.state.wildlife.wanderers);
    // El encuentro se comprueba al llegar, para no cortar la animación del paso.
    if (this.moving || this.storyBusy || dialogOpen()) return;
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

    this.follow(this.tile, to);
    this.tile = to;
    this.moving = true;
    // Dos pasos alternados; con «reducir movimiento» se queda el fotograma parado.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.stepFrame = this.stepFrame === 1 ? 3 : 1;
      this.hero.setFrame(this.stepFrame);
    }
    const { x, y } = this.centerOf(to);
    this.tweens.add({
      targets: this.hero,
      x,
      y,
      duration: STEP_MS,
      onComplete: () => {
        this.moving = false;
        this.hero.setFrame(0);
        this.refreshZones();
        if (!this.handleStory() && !this.checkPlaces()) this.checkEncounter();
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
    // Durante un evento de temporada, a veces sale su invitada; los ejercicios siguen siendo los que tocan.
    const event = currentEvent();
    const creature = event && rng.chance(GUEST_CHANCE) ? getCreature(event.guest) : rng.pick(creaturesForSkill(pick.skill));
    // Brillante de vez en cuando: solo cambia el color.
    return { creature: creature.id, skill: pick.skill, slot: pick.slot, ...(rollShiny(rng) ? { shiny: true } : {}) };
  }

  /** Pone cada criatura en su casilla (con un pequeño paso animado) y quita las que ya no están. */
  private syncWild(): void {
    const alive = new Set<number>();
    for (const w of this.state.wildlife.wanderers) {
      alive.add(w.id);
      const { x, y } = this.centerOf(w.tile);
      const sprite = this.wild.get(w.id);
      if (!sprite) {
        const sprite = getCreature(w.data.creature).sprite;
        const image = this.add.image(x, y, w.data.shiny ? shinySprite(sprite) : sprite).setScale(WILD_SCALE).setDepth(1).setData('dest', `${x},${y}`);
        this.wild.set(w.id, image);
        if (w.data.shiny && !reducedMotionNow()) {
          // Un destello de vez en cuando, para que se note desde lejos.
          this.tweens.add({ targets: image, alpha: 0.55, duration: 450, yoyo: true, repeat: -1, repeatDelay: 900 });
        }
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
    if (this.storyBusy) return false;
    this.startBattle({ wandererId: hit.id, data: hit.data, story: { where: 'wild' } });
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
      // El puente roto se queda dibujado (arreglado) al abrirse; las demás puertas desaparecen.
      const bridge = def.id === 'puente-roto';
      if (bridge && opened) this.add.image(place.gate.x * TILE_SIZE, place.gate.y * TILE_SIZE, mapSpriteKey('bridge-fixed')).setOrigin(0).setDepth(0.5);
      const gateSprite = opened
        ? undefined
        : this.add.image(place.gate.x * TILE_SIZE, place.gate.y * TILE_SIZE, bridge ? mapSpriteKey('bridge-broken') : GATE_TEXTURE).setOrigin(0).setDepth(1);
      const chestSprite = this.add.image(place.chest.x * TILE_SIZE, place.chest.y * TILE_SIZE, chestTexture).setOrigin(0).setDepth(1);
      if (opened) this.region = openGate(this.region, place.gate);
      this.zones.push({ place, gate: place.gate, chest: place.chest, def, interior, opened, gateSprite, chestSprite });
    }
  }

  /**
   * Al llegar a cada casilla: enseña el cartel de la zona cerrada (qué misión
   * la abre) y recoge el cofre. Las zonas las abre la historia (`showOutcome`).
   */
  private refreshZones(): void {
    const progress = loadProgress();
    const shown = this.zones.find((zone) => !zone.opened && near(this.tile, zone.gate));
    if (shown) this.showLocked(shown, progress.locale);
    else if (this.signZone !== undefined && !this.signTimer) this.removeSign();

    for (const zone of this.zones) {
      if (!zone.opened || this.tile.x !== zone.chest.x || this.tile.y !== zone.chest.y) continue;
      if (progress.treasures.includes(zone.def.treasure.id)) continue;
      const before = wardrobeOf(progress);
      progress.treasures = [...progress.treasures, zone.def.treasure.id];
      saveProgress(progress);
      showNewItems(earnedSince(before, progress), progress);
      zone.chestSprite.setTexture(CHEST_TEXTURES.open);
      sfx('chest');
      confetti(30);
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
    sfx('door');
    if (!sprite) return;
    if (zone.def.id === 'puente-roto') {
      // Bruno pone los tablones: el puente arreglado aparece desde arriba.
      const fixed = this.add.image(zone.gate.x * TILE_SIZE, zone.gate.y * TILE_SIZE, mapSpriteKey('bridge-fixed')).setOrigin(0).setDepth(0.5);
      sprite.destroy();
      if (!reducedMotionNow()) {
        fixed.setScale(1, 0);
        this.tweens.add({ targets: fixed, scaleY: 1, duration: GATE_OPEN_MS, ease: 'Back.easeOut' });
      }
      return;
    }
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

  /** Cartel en letra clara: qué hace falta para abrir la zona en la historia. */
  private showLocked(zone: ZoneState, locale: 'es' | 'ca'): void {
    if (this.signZone === zone.def.id && !this.signTimer) return;
    const sign = this.ensureSign();
    this.signTimer?.remove();
    this.signTimer = undefined;
    this.signZone = zone.def.id;
    const title = document.createElement('p');
    title.className = 'zone-sign-title';
    title.textContent = zone.def.name[locale];
    const line = document.createElement('p');
    line.className = 'zone-sign-line';
    line.textContent = zone.def.locked[locale];
    sign.replaceChildren(title, line);
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
