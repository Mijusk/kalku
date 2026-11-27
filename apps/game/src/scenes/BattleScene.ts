import Phaser from 'phaser';
import { showGemCelebration } from '../ui/gemCelebration';
import { CREATURE_FRAMES } from '@kalku/art';
import {
  applyAnswer,
  challengeSkill,
  checkAnswer,
  createRng,
  currentSkill,
  generateExercise,
  getHint,
  getSkill,
  isMastered,
  levelForXp,
  pickSkill,
  randomSeed,
  scoreAnswer,
  xpForAnswer,
  type Exercise,
  type Hint,
  type Rng,
  type Slot,
} from '@kalku/exercises';
import {
  addToCollection,
  canRescue,
  countEncounter,
  CREATURES,
  damageMultiplier,
  getCreature,
  shouldShowWeaknessHint,
  weakOperator,
  type CreatureDefinition,
} from '@kalku/content';
import { endEncounter, regionSpec } from '@kalku/world';
import { ANIMATION_MS } from '../art/textures';
import { tr } from '../i18n';
import { applyServerSkills, applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { exerciseView, sendAnswer } from '../sync';
import { playMusic, sfx } from '../audio/sound';
import { applyMissionEvent } from '../missions';
import { ExercisePanel } from '../ui/ExercisePanel';
import { banner, clearFx, confetti, floatText, reducedMotion } from '../ui/fx';
import { burst, castSpell, drawBattleBackground, drawPlatform, ensureFxTextures } from './battleFx';
import { Hud } from '../ui/Hud';
import { showLevelUp } from '../ui/LevelUp';
import { SettingsPanel } from '../ui/SettingsPanel';
import { BATTLE_RESULT_KEY, WORLD_STATE_KEY, type BattleResult, type EncounterData, type StoryBattle, type WorldState } from '../worldState';
import { characterName, CREATURES as ALL_CREATURES, regionStory, type BossInfo } from '@kalku/content';
import { mapSpriteKey } from '../art/textures';
import { playScenes } from '../storyFlow';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Ajustes del combate de prueba. Se afinarán en el piloto. */
const BATTLE = {
  playerHp: 30,
  enemyHp: 40,
  enemyDamage: 3,
  /**
   * Daño de una chispa. Es fijo (no sale de los puntos) para que un combate
   * dure 3–5 aciertos y para que la rapidez no cambie cuánto dura (regla 3).
   */
  sparkDamage: 8,
  /** Multiplicador de daño del ataque fuerte (su ejercicio es de reto). */
  strongMultiplier: 1.5,
  /** Intentos antes de enseñar la respuesta y pasar turno. */
  maxTries: 3,
} as const;

interface Fighter {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  bar: Phaser.GameObjects.Graphics;
  /** Dónde está quieto (las animaciones vuelven aquí). */
  home: { x: number; y: number };
}

/** El Gran Borrón: tres fases, cada una más pequeño. */
const BOSS = { phaseHp: 32, scales: [4, 3.2, 2.5] } as const;

/** Posiciones del personaje y la criatura en el combate. */
const HERO_AT = { x: 120, y: 196 };
const ENEMY_AT = { x: 360, y: 148 };

interface Turn {
  exercise: Exercise;
  slot: Slot;
  strong: boolean;
  /** Ejercicio de rescate: si se acierta, la criatura entra en la colección y el combate termina. */
  rescue: boolean;
  /** Semilla del ejercicio: el servidor lo regenera con ella para corregirlo. */
  seed: number;
  /** Lo último que respondió el niño. */
  given: number | undefined;
  tries: number;
  hintLevel: 0 | Hint['level'];
  startedAt: number;
}

/**
 * Combate por turnos del prototipo: el niño elige ataque, resuelve el
 * ejercicio y, si acierta, el ataque sale con fuerza según los puntos.
 * Fallar nunca quita monedas: da una pista y otra oportunidad.
 */
export class BattleScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private rng!: Rng;
  private panel!: ExercisePanel;
  private hud!: Hud;
  private player!: Fighter;
  private enemy!: Fighter;
  private turn: Turn | undefined;
  private streak = 0;
  private busy = false;
  /** Con datos, el combate viene del mapa: vuelve a él al terminar. Sin datos es el combate de prueba. */
  private encounter: EncounterData | undefined;
  private creature: CreatureDefinition | undefined;
  /** Si en este combate se enseña el cartel de debilidad (los primeros encuentros con la familia). */
  private showWeakness = false;
  private weaknessLabel: HTMLElement | undefined;
  private nameLabel: HTMLElement | undefined;

  constructor() {
    super('battle');
  }

  create(data?: EncounterData): void {
    this.encounter = data?.data ? data : undefined;
    this.storyBattle = this.encounter?.story;
    this.boss = this.storyBattle?.where === 'boss';
    this.tutorial = this.storyBattle?.where === 'first' ? { tip: false, hit: false, rescue: false } : undefined;
    this.bossPhase = 0;
    this.won = false;
    // El jefe no es una criatura: no se rescata ni sale en la colección.
    this.creature = this.encounter && !this.boss ? getCreature(this.encounter.data.creature) : undefined;
    this.turn = undefined;
    this.streak = 0;
    this.rescuedNow = undefined;
    this.revealed = undefined;
    this.settingsOpen = false;
    this.progress = loadProgress();
    this.rng = createRng(randomSeed());
    applySettings(this.progress.settings);

    ensureFxTextures(this);
    drawBattleBackground(this, GAME_WIDTH, GAME_HEIGHT, this.boss ? 'dusk' : this.storyBattle?.where === 'crystal' ? 'cave' : 'day');
    drawPlatform(this, HERO_AT.x, HERO_AT.y + 30, 96);
    drawPlatform(this, ENEMY_AT.x, ENEMY_AT.y + 62, 140);
    this.player = this.createFighter('hero', HERO_AT.x, HERO_AT.y, 4, BATTLE.playerHp);
    this.enemy = this.createFighter(
      this.creature?.sprite ?? CREATURES[0]?.sprite ?? 'hero',
      ENEMY_AT.x,
      ENEMY_AT.y,
      4,
      this.creature?.hp ?? BATTLE.enemyHp,
    );
    // El borrón: la criatura empieza gris y recupera el color a medida que se le devuelve la chispa.
    this.grey = this.enemy.sprite.preFX?.addColorMatrix();
    this.animateEnemy();
    this.animateHeroIdle();
    playMusic(this.boss ? 'boss' : 'battle');
    clearFx();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearFx();
      // Las etiquetas HTML del combate no deben quedarse en el mapa ni en los acertijos.
      this.nameLabel?.remove();
      this.weaknessLabel?.remove();
    });

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    this.hud = new Hud(ui);
    this.panel = new ExercisePanel(ui, {
      onAction: (a) => this.startTurn(a),
      onSubmit: (answer) => this.submit(answer),
      onHint: () => this.showNextHint(),
      onNext: () => (this.encounter ? this.returnToWorld() : this.startBattle()),
      onOpenSettings: () => this.openSettings(),
    });
    this.panel.setLocale(this.progress.locale);
    this.panel.setAutoVoice(this.progress.settings.autoVoice);
    document.querySelectorAll('#game .creature-name, #game .creature-weakness').forEach((e) => e.remove());
    this.nameLabel = this.createLabel('creature-name');
    this.weaknessLabel = this.createLabel('creature-weakness');
    this.startBattle();
  }

  private createLabel(className: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    // Dentro de #game (el área del combate), no de #ui: en horizontal #ui es el panel de ejercicios.
    document.getElementById('game')?.append(el);
    return el;
  }

  /** Nombre de la criatura y, los primeros encuentros, su debilidad. Texto HTML, no pixel. */
  private refreshCreatureLabels(): void {
    const locale = this.progress.locale;
    const creature = this.creature;
    if (this.nameLabel) this.nameLabel.textContent = this.boss ? characterName(this.bossInfo.character)[locale] : creature ? creature.name[locale] : '';
    if (!this.weaknessLabel) return;
    const weak = creature ? weakOperator(creature) : undefined;
    if (creature && weak && this.showWeakness) {
      const add = weak === '+';
      this.weaknessLabel.textContent = `${add ? '+' : '−'} ${tr(add ? 'weakToAdd' : 'weakToSub', locale)}`;
    } else {
      this.weaknessLabel.textContent = '';
    }
  }

  private createFighter(texture: string, x: number, y: number, scale: number, hp: number): Fighter {
    const sprite = this.add.image(x, y, texture, 0).setScale(scale);
    const bar = this.add.graphics().setDepth(5);
    const fighter = { sprite, hp, maxHp: hp, bar, home: { x, y } };
    this.drawBar(fighter);
    return fighter;
  }

  /** Filtro gris de la criatura (WebGL). Sin WebGL no hay filtro y la criatura se ve en color. */
  private grey: Phaser.FX.ColorMatrix | undefined;

  /** Cuanto menos borrón le queda (menos vida), más color recupera. */
  private refreshGrey(): void {
    if (!this.grey) return;
    const ratio = this.enemy.maxHp > 0 ? this.enemy.hp / this.enemy.maxHp : 0;
    this.grey.reset();
    this.grey.grayscale(0.85 * ratio);
  }

  /** El personaje respira: sube y baja un poco. */
  private animateHeroIdle(): void {
    if (reducedMotion()) return;
    this.tweens.add({ targets: this.player.sprite, scaleY: 4.15, scaleX: 3.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Entrada del combate: el personaje llega andando y la criatura cae dando un bote. */
  private playIntro(): void {
    const name = this.boss ? characterName(this.bossInfo.character)[this.progress.locale] : this.creature?.name[this.progress.locale];
    if (name) banner(`${name}!`, 'info', 1200);
    if (reducedMotion()) return;
    const hero = this.player.sprite;
    const enemy = this.enemy.sprite;
    hero.x = this.player.home.x - 160;
    this.tweens.add({ targets: hero, x: this.player.home.x, duration: 450, ease: 'Quad.easeOut' });
    enemy.y = this.enemy.home.y - 220;
    this.tweens.add({ targets: enemy, y: this.enemy.home.y, duration: 650, ease: 'Bounce.easeOut', delay: 150 });
    this.cameras.main.fadeIn(250, 255, 255, 255);
  }

  /** La criatura respira y parpadea (fotogramas del generador); con «reducir movimiento» se queda quieta. */
  private animateEnemy(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    this.time.addEvent({
      delay: ANIMATION_MS,
      loop: true,
      callback: () => {
        frame = (frame + 1) % CREATURE_FRAMES;
        if (this.creature) this.enemy.sprite.setFrame(frame);
      },
    });
  }

  /** Las barras de vida siguen a cada luchador cuando salta o se encoge. */
  override update(): void {
    if (this.enemy) this.drawBar(this.enemy);
    if (this.player) this.drawBar(this.player);
  }

  private drawBar(f: Fighter): void {
    const width = 64;
    const x = f.sprite.x - width / 2;
    const y = f.sprite.y - f.sprite.displayHeight / 2 - 12;
    const ratio = Math.max(0, f.hp / f.maxHp);
    f.bar.clear();
    f.bar.fillStyle(0x1b2a1f, 1).fillRect(x - 1, y - 1, width + 2, 8);
    f.bar.fillStyle(ratio > 0.3 ? 0x5fd35f : 0xe05a47, 1).fillRect(x, y, width * ratio, 6);
  }

  private startBattle(): void {
    // Combate de prueba (?combate): una criatura cualquiera. Desde el mapa, la del encuentro.
    if (!this.encounter) this.creature = this.rng.pick(CREATURES);
    this.tweens.killTweensOf(this.enemy.sprite);
    this.enemy.sprite
      .setTexture(this.boss ? mapSpriteKey(this.bossInfo.sprite) : (this.creature?.sprite ?? 'hero'), 0)
      .setAlpha(1)
      .setAngle(0)
      .setScale(this.boss ? BOSS.scales[0] ?? 4 : 4)
      .setPosition(this.enemy.home.x, this.enemy.home.y);
    this.enemy.maxHp = this.boss ? BOSS.phaseHp : (this.creature?.hp ?? BATTLE.enemyHp);
    this.countEncounter();
    this.refreshCreatureLabels();
    this.enemy.hp = this.enemy.maxHp;
    // Contra el jefe el combate es más largo: más energía para que dé tiempo.
    this.player.maxHp = this.boss ? BATTLE.playerHp * 2 : BATTLE.playerHp;
    this.player.hp = this.player.maxHp;
    this.drawBar(this.enemy);
    this.drawBar(this.player);
    this.refreshGrey();
    this.turn = undefined;
    this.rescuedNow = undefined;
    this.revealed = undefined;
    this.busy = false;
    this.refreshHud();
    this.playIntro();
    this.showActions();
    if (this.tutorial && !this.tutorial.tip) {
      this.tutorial.tip = true;
      this.time.delayedCall(1300, () => void playScenes(['first-battle-tip']));
    }
  }

  /** Muestra los ataques; «Rescatar» solo si a la criatura le queda poca vida y no es un jefe. */
  private showActions(): void {
    const rescuable = this.creature !== undefined && canRescue(this.creature, this.enemy.hp, this.enemy.maxHp);
    if (rescuable && this.tutorial && !this.tutorial.rescue) {
      this.tutorial.rescue = true;
      void playScenes(['first-battle-rescue']);
    }
    // El texto se monta aquí, con el idioma de ahora: si el niño cambia el idioma en los ajustes, también cambia.
    const reveal = this.revealed === undefined ? undefined : `${tr('reveal', this.progress.locale)} ${this.revealed}.`;
    this.panel.showActions(reveal, rescuable);
  }

  /** Cuenta el encuentro una sola vez por combate, al empezar, y decide si sale el cartel. */
  private countEncounter(): void {
    const creature = this.creature;
    if (!creature) {
      this.showWeakness = false;
      return;
    }
    this.progress.encounters = countEncounter(this.progress.encounters, creature.family);
    saveProgress(this.progress);
    this.showWeakness = shouldShowWeaknessHint(this.progress.encounters[creature.family] ?? 0);
    this.refreshCreatureLabels();
  }

  private startTurn(action: 'quick' | 'strong' | 'rescue'): void {
    if (this.busy) return;
    this.revealed = undefined;
    const strong = action === 'strong';
    const rescue = action === 'rescue';
    // Por si el botón llega tarde: el rescate se vuelve a comprobar con la vida actual.
    if (rescue && !(this.creature && canRescue(this.creature, this.enemy.hp, this.enemy.maxHp))) return;
    const profile = this.progress.profile;
    const fromCreature = this.encounter?.data;
    const pick = rescue && this.creature
      ? { skill: this.creature.skill, slot: fromCreature?.slot ?? ('current' as const) }
      : strong
      ? { skill: challengeSkill(profile) ?? currentSkill(profile), slot: 'challenge' as const }
      : fromCreature
        ? { skill: fromCreature.skill, slot: fromCreature.slot }
        : pickSkill(profile, this.rng);
    // Cada ejercicio sale de su propia semilla, para que el servidor pueda regenerarlo.
    const seed = randomSeed();
    const exercise = generateExercise(pick.skill, createRng(seed));
    this.turn = { exercise, slot: pick.slot, strong, rescue, seed, given: undefined, tries: 0, hintLevel: 0, startedAt: performance.now() };

    const locale = this.progress.locale;
    const tag = pick.slot === 'challenge' ? tr('challenge', locale) : pick.slot === 'review' ? tr('review', locale) : undefined;
    this.panel.showExercise(exercise, tag);
  }

  private submit(answer: string): void {
    const turn = this.turn;
    if (!turn || this.busy) return;
    const locale = this.progress.locale;
    const result = checkAnswer(turn.exercise, answer);

    if (result.status === 'invalid') {
      this.panel.showFeedback(tr('invalid', locale), 'info');
      return;
    }

    turn.given = result.value;
    if (result.status === 'correct') {
      this.finishTurn(true);
      return;
    }

    turn.tries += 1;
    this.panel.clearAnswer();
    this.taunt();
    if (turn.tries >= BATTLE.maxTries) {
      const reveal = `${tr('reveal', locale)} ${turn.exercise.answer}.`;
      this.panel.showFeedback(reveal, 'info');
      // Se queda en el panel de acciones hasta que el niño elija otra cosa, también tras los ajustes.
      this.revealed = turn.exercise.answer;
      this.finishTurn(false);
      return;
    }
    // Cada fallo trae la siguiente pista automáticamente.
    this.showNextHint(tr('wrong', locale));
  }

  private showNextHint(prefix?: string): void {
    const turn = this.turn;
    if (!turn || this.busy) return;
    const level = Math.min(3, turn.hintLevel + 1) as Hint['level'];
    turn.hintLevel = level;
    const hint = getHint(turn.exercise, level, this.progress.locale).text;
    this.panel.showFeedback(prefix ? `${prefix} ${hint}` : hint, prefix ? 'bad' : 'info');
  }

  private finishTurn(correct: boolean): void {
    const turn = this.turn;
    if (!turn) return;
    this.busy = true;
    const helped = turn.tries > 0 || turn.hintLevel > 0;
    const skill = turn.exercise.skill;

    const wasMastered = isMastered(this.progress.profile[skill]);
    this.progress.profile = applyAnswer(this.progress.profile, skill, { correct, helped, slot: turn.slot });
    const score = scoreAnswer({
      correct,
      difficulty: turn.exercise.difficulty,
      streak: this.streak,
      helped,
      // Sin tiempo no se mide: no hay bonus de rapidez, pero los puntos no bajan.
      elapsedMs: this.progress.settings.timed ? performance.now() - turn.startedAt : undefined,
    });
    this.streak = correct ? this.streak + 1 : 0;
    this.progress.coins += score.total;
    // Misiones del día: acertar (fallar no cuenta ni resta).
    const missionsDone = applyMissionEvent(this.progress, { type: 'answer', correct, operator: turn.exercise.operator === '-' ? '-' : '+', strong: turn.strong });
    for (const m of missionsDone) banner(`${tr('missionDone', this.progress.locale)} +${m.reward} ${tr('coins', this.progress.locale)}`, 'win', 2200);
    // La XP solo sube (fallar da 0) y no mira el tiempo ni la racha; el nivel sale de ella.
    const levelBefore = levelForXp(this.progress.xp);
    this.progress.xp += xpForAnswer({ correct, difficulty: turn.exercise.difficulty, helped });
    const levelAfter = levelForXp(this.progress.xp);

    const locale = this.progress.locale;
    if (correct) {
      const operator = turn.exercise.operator;
      const weak = this.creature ? damageMultiplier(this.creature, operator) : 1;
      const damage = Math.round(BATTLE.sparkDamage * (turn.strong ? BATTLE.strongMultiplier : 1) * weak);
      const weakNote = weak > 1 && this.showWeakness ? ` · ${tr(operator === '+' ? 'weakHitAdd' : 'weakHitSub', locale)}` : '';
      // Sin teclado, para que el hechizo se vea grande.
      this.panel.showCasting(`${tr('correct', locale)} +${score.total} ${tr('coins', locale)}${weakNote}`);
      if (turn.rescue && this.creature) {
        // Rescatar no hace daño ni da ventaja: solo guarda la criatura (sin duplicar) y termina el combate.
        const had = this.progress.collection.some((e) => e.id === this.creature?.id);
        this.progress.collection = addToCollection(this.progress.collection, this.creature.id, new Date().toISOString().slice(0, 10));
        this.rescuedNow = had ? 'again' : 'new';
      } else {
        // Un momento para que el combate crezca al quitar el teclado, y sale el hechizo.
        this.time.delayedCall(200, () => {
          sfx(turn.strong ? 'bolt' : 'spark');
          this.heroCast();
          castSpell(this, { x: this.player.home.x + 30, y: this.player.home.y - 20 }, this.enemy.home, turn.strong, () =>
            this.hit(this.enemy, damage, turn.strong),
          );
        });
      }
      sfx('correct');
      if (this.streak >= 3) banner(`${tr('streak', locale)} ×${this.streak}!`, 'streak', 1100);
    }
    // La gema se gana al cruzar el umbral jugando: lo que da la prueba de nivel no cuenta.
    if (!wasMastered && isMastered(this.progress.profile[skill]) && !this.progress.gems.includes(skill)) {
      this.progress.gems.push(skill);
      this.panel.showFeedback(`${tr('gem', locale)} ${getSkill(skill).name[locale]}`, 'good');
      showGemCelebration(getSkill(skill), locale);
    }
    saveProgress(this.progress);
    this.refreshHud();
    if (levelAfter > levelBefore) {
      const ui = document.getElementById('ui');
      if (ui) showLevelUp(ui, levelAfter, locale, this.progress.settings.autoVoice);
    }
    this.reportAnswer(turn, helped);

    // Se espera a que llegue el hechizo antes de seguir.
    this.time.delayedCall(correct && !turn.rescue ? 1400 : 900, () => {
      if (this.boss && this.enemy.hp <= 0 && this.bossPhase < BOSS.scales.length - 1) return void this.nextBossPhase();
      if (this.rescuedNow || this.enemy.hp <= 0) return this.endBattle(true);
      if (this.tutorial && !this.tutorial.hit && correct) {
        this.tutorial.hit = true;
        void playScenes(['first-battle-hit']);
      }
      // Fallar un rescate no cuesta nada: el enemigo no contraataca, así la criatura no huye
      // y se puede volver a intentar.
      if (turn.rescue && !correct) {
        this.busy = false;
        this.turn = undefined;
        this.showActions();
        return;
      }
      this.enemyAttack();
      this.time.delayedCall(900, () => {
        if (this.player.hp <= 0) return this.endBattle(false);
        this.busy = false;
        this.turn = undefined;
        this.showActions();
      });
    });
  }

  /**
   * Manda la respuesta al servidor, que la corrige con la misma lógica y manda sobre el dominio.
   * La copia local ya se aplicó para que se vea al instante; sin red o con error se queda tal cual.
   */
  private reportAnswer(turn: Turn, helped: boolean): void {
    if (turn.given === undefined) return;
    const progress = this.progress;
    void sendAnswer(progress, {
      kind: 'answer',
      skill: turn.exercise.skill,
      seed: String(turn.seed),
      given: turn.given,
      exercise: exerciseView(turn.exercise),
      helped,
      slot: turn.slot,
      hintsUsed: turn.hintLevel,
    }).then((skills) => {
      if (!skills) return;
      applyServerSkills(progress, skills);
      if (this.scene.isActive()) this.refreshHud();
    });
  }

  private hit(target: Fighter, damage: number, strong = false): void {
    target.hp = Math.max(0, target.hp - damage);
    this.drawBar(target);
    const isEnemy = target === this.enemy;
    floatText(target.home.x, target.home.y - (isEnemy ? 50 : 30), `-${damage}`, strong ? 'big' : 'damage', GAME_WIDTH);
    if (isEnemy) {
      sfx('hit');
      this.refreshGrey();
      burst(this, target.home.x, target.home.y, 'spark', strong ? 22 : 12);
      // Se le cae un poco de borrón.
      burst(this, target.home.x, target.home.y - 20, 'puff', 6);
      if (strong && !reducedMotion()) this.cameras.main.shake(180, 0.012);
    } else {
      sfx('enemyHit');
    }
    if (reducedMotion()) return;
    const sprite = target.sprite;
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => sprite.clearTint());
    this.tweens.add({ targets: sprite, x: target.home.x + (isEnemy ? 8 : -6), duration: 50, yoyo: true, repeat: 2, onComplete: () => sprite.setX(target.home.x) });
  }

  /** El personaje da un saltito al lanzar el hechizo. */
  private heroCast(): void {
    if (reducedMotion()) return;
    const hero = this.player.sprite;
    this.tweens.add({ targets: hero, y: this.player.home.y - 14, duration: 140, yoyo: true, ease: 'Quad.easeOut', onComplete: () => hero.setY(this.player.home.y) });
  }

  /** Al fallar, la criatura se ríe dando botes: una burla amable, nunca un castigo. */
  private taunt(): void {
    sfx('wrong');
    if (reducedMotion()) return;
    const enemy = this.enemy.sprite;
    this.tweens.add({ targets: enemy, y: this.enemy.home.y - 10, duration: 120, yoyo: true, repeat: 1, onComplete: () => enemy.setY(this.enemy.home.y) });
  }

  /** La criatura lanza una bolita de borrón al personaje. */
  private enemyAttack(): void {
    const enemy = this.enemy.sprite;
    if (reducedMotion()) {
      this.hit(this.player, BATTLE.enemyDamage);
      return;
    }
    this.tweens.add({
      targets: enemy,
      x: this.enemy.home.x - 40,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeIn',
      onYoyo: () => {
        burst(this, this.player.home.x, this.player.home.y, 'puff', 10);
        this.hit(this.player, BATTLE.enemyDamage);
      },
      onComplete: () => enemy.setX(this.enemy.home.x),
    });
  }

  /** Victoria: la criatura recupera todo el color, salta de alegría, estrellas y confeti. */
  private celebrate(rescued: boolean): void {
    const locale = this.progress.locale;
    const name = this.creature?.name[locale];
    sfx(rescued ? 'rescue' : 'win');
    this.grey?.reset();
    banner(name ? `${name} ${tr('shine', locale)}` : tr('victory', locale), 'win', 2400);
    confetti();
    const enemy = this.enemy.sprite;
    burst(this, this.enemy.home.x, this.enemy.home.y, 'star', 24);
    if (reducedMotion()) return;
    this.tweens.add({ targets: enemy, y: this.enemy.home.y - 26, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.time.delayedCall(1400, () => {
      // Se va contenta dando saltos (o se queda a tu lado si la has rescatado).
      if (rescued) this.tweens.add({ targets: enemy, x: this.player.home.x + 70, y: this.player.home.y + 10, scale: 2, duration: 700, ease: 'Sine.easeInOut' });
      else this.tweens.add({ targets: enemy, x: GAME_WIDTH + 80, y: this.enemy.home.y - 30, duration: 900, ease: 'Sine.easeIn' });
    });
  }

  /** Solo para desarrollo (`src/dev`): gana el combate de un toque, sin contar respuestas. */
  devWin(): void {
    if (this.busy || this.enemy.hp <= 0) return;
    this.busy = true;
    this.turn = undefined;
    if (this.boss) this.bossPhase = BOSS.scales.length - 1;
    this.hit(this.enemy, this.enemy.hp);
    this.time.delayedCall(400, () => this.endBattle(true));
  }

  private endBattle(won: boolean): void {
    const locale = this.progress.locale;
    this.won = won;
    if (won && this.boss) return this.bossDefeated();
    if (won) this.celebrate(this.rescuedNow !== undefined);
    else {
      sfx('wrong');
      if (!reducedMotion()) this.tweens.add({ targets: this.player.sprite, angle: -90, alpha: 0.6, duration: 400 });
    }
    // Perder no quita nada: ni monedas ni dominio.
    const rescued = this.rescuedNow;
    const coins = `${this.progress.coins} ${tr('coins', locale)}`;
    this.panel.showResult(
      rescued ? tr('rescued', locale) : won ? tr('victory', locale) : tr('defeat', locale),
      rescued ? `${tr(rescued === 'new' ? 'rescuedNew' : 'rescuedAgain', locale)} ${coins}` : coins,
      this.encounter ? tr('backToMap', locale) : tr('nextBattle', locale),
    );
  }

  /** Vuelve al mapa, a la casilla donde saltó el combate. Ganar o perder da igual: no se quita nada. */
  private returnToWorld(): void {
    const encounter = this.encounter;
    const world = this.registry.get(WORLD_STATE_KEY) as WorldState | undefined;
    // Las criaturas del mapa se van al acabar; los combates de la historia (−1) no son del mapa.
    if (encounter && world && encounter.wandererId >= 0) {
      world.wildlife = endEncounter(regionSpec(this.progress.at).wildlife, world.wildlife, encounter.wandererId);
    }
    if (this.won) {
      for (const m of applyMissionEvent(this.progress, { type: 'battleWon', rescued: this.rescuedNow !== undefined })) {
        banner(`${tr('missionDone', this.progress.locale)} +${m.reward} ${tr('coins', this.progress.locale)}`, 'win', 2200);
      }
      saveProgress(this.progress);
    }
    if (encounter) {
      const result: BattleResult = { won: this.won, rescued: this.rescuedNow !== undefined, story: encounter.story ?? { where: 'wild' } };
      this.registry.set(BATTLE_RESULT_KEY, result);
    }
    this.scene.start('world');
  }

  /** Combate de la historia (primer rescate, cristal, jefe) o undefined. */
  private storyBattle: StoryBattle | undefined;
  private boss = false;
  private bossPhase = 0;
  private won = false;
  /** Explicaciones de Uni en el primer combate (cada una sale una vez). */
  private tutorial: { tip: boolean; hit: boolean; rescue: boolean } | undefined;

  /** El Borrón se encoge y empieza otra fase; un amigo rescatado ayuda con una chispa. */
  private async nextBossPhase(): Promise<void> {
    this.bossPhase += 1;
    const scale = BOSS.scales[this.bossPhase] ?? 2.5;
    sfx('enemyHit');
    burst(this, this.enemy.home.x, this.enemy.home.y, 'puff', 30);
    if (!reducedMotion()) {
      this.cameras.main.shake(300, 0.01);
      this.tweens.add({ targets: this.enemy.sprite, scale, duration: 600, ease: 'Back.easeIn' });
    } else this.enemy.sprite.setScale(scale);
    if (this.bossPhase === 1) await playScenes([this.bossInfo.shrinks]);
    this.enemy.hp = this.enemy.maxHp;
    this.drawBar(this.enemy);
    this.refreshGrey();
    await this.friendHelps();
    this.busy = false;
    this.turn = undefined;
    this.showActions();
  }

  /** Una criatura rescatada sale a ayudar: lanza una chispa sin ejercicio (se la ganó el niño al rescatarla). */
  private friendHelps(): Promise<void> {
    const ids = this.progress.collection.map((c) => c.id);
    const friend = ALL_CREATURES.find((c) => c.id === ids[(this.bossPhase - 1) % Math.max(1, ids.length)]);
    if (!friend) return Promise.resolve();
    const locale = this.progress.locale;
    banner(`${friend.name[locale]} ${tr('friendHelps', locale)}`, 'info', 1600);
    const sprite = this.add.image(this.player.home.x - 60, this.player.home.y + 10, friend.sprite, 0).setScale(2);
    return new Promise((resolve) => {
      this.time.delayedCall(600, () => {
        sfx('spark');
        castSpell(this, { x: sprite.x, y: sprite.y - 10 }, this.enemy.home, false, () => {
          this.hit(this.enemy, BATTLE.sparkDamage);
          this.time.delayedCall(500, () => {
            sprite.destroy();
            resolve();
          });
        });
      });
    });
  }

  /** El jefe de la región donde está el niño (Gran Borrón, Gran Enredo…). */
  private get bossInfo(): BossInfo {
    return regionStory(this.progress.at).boss;
  }

  /** Fin del jefe: se encoge del todo y se convierte en lo que era (Borroncito, Ovillo). */
  private bossDefeated(): void {
    const locale = this.progress.locale;
    sfx('win');
    confetti(120);
    burst(this, this.enemy.home.x, this.enemy.home.y, 'star', 40);
    banner(tr('bossDone', locale), 'win', 3000);
    this.enemy.sprite.setTexture(mapSpriteKey(this.bossInfo.becomes));
    this.grey?.reset();
    if (!reducedMotion()) this.tweens.add({ targets: this.enemy.sprite, scale: 4, y: this.enemy.home.y + 20, duration: 600, ease: 'Back.easeOut' });
    this.panel.showResult(tr('bossDone', locale), `${this.progress.coins} ${tr('coins', locale)}`, tr('backToMap', locale));
  }

  private settingsOpen = false;
  /** Si en este combate se ha rescatado a la criatura: nueva en la colección o ya la tenía. */
  private rescuedNow: 'new' | 'again' | undefined;
  /** Respuesta revelada tras agotar los intentos; se muestra en las acciones hasta el siguiente turno. */
  private revealed: number | undefined;

  private openSettings(): void {
    const ui = document.getElementById('ui');
    if (!ui || this.settingsOpen) return;
    this.settingsOpen = true;
    new SettingsPanel(ui, this.progress, {
      onChange: () => {
        // Cada cambio se aplica y se guarda al instante.
        applySettings(this.progress.settings);
        saveProgress(this.progress);
        this.panel.setLocale(this.progress.locale);
        this.panel.setAutoVoice(this.progress.settings.autoVoice);
        this.refreshCreatureLabels();
        this.refreshHud();
      },
      onClose: () => {
        this.settingsOpen = false;
        this.showActions();
      },
      onDeleted: () => {
        // Datos borrados: de vuelta a la pantalla de apodo, como un niño nuevo.
        this.settingsOpen = false;
        this.scene.start('nickname');
      },
    });
  }

  private refreshHud(): void {
    const skill = currentSkill(this.progress.profile);
    this.hud.update({
      locale: this.progress.locale,
      coins: this.progress.coins,
      xp: this.progress.xp,
      gems: this.progress.gems.length,
      skillName: getSkill(skill).name[this.progress.locale],
      mastery: this.progress.profile[skill].mastery,
    });
  }
}
