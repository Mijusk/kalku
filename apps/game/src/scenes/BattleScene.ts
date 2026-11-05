import Phaser from 'phaser';
import { CREATURE_FRAMES, flowerFrame, FLOWER_VARIANTS, grassFrame, GRASS_VARIANTS } from '@kalku/art';
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
  pickSkill,
  randomSeed,
  scoreAnswer,
  type Exercise,
  type Hint,
  type Rng,
  type Slot,
} from '@kalku/exercises';
import { CREATURES, type CreatureDefinition } from '@kalku/content';
import { ANIMATION_MS, TILESET_KEYS } from '../art/textures';
import { tr } from '../i18n';
import { applyTextSize, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { ExercisePanel } from '../ui/ExercisePanel';
import { Hud } from '../ui/Hud';
import { SettingsPanel } from '../ui/SettingsPanel';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Ajustes del combate de prueba. Se afinarán en el piloto. */
const BATTLE = {
  playerHp: 30,
  enemyHp: 40,
  enemyDamage: 3,
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
}

interface Turn {
  exercise: Exercise;
  slot: Slot;
  strong: boolean;
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
  private creature: CreatureDefinition | undefined;

  constructor() {
    super('battle');
  }

  create(): void {
    this.progress = loadProgress();
    this.rng = createRng(randomSeed());
    applyTextSize(this.progress.settings);

    this.drawBackground();
    this.player = this.createFighter('hero', 120, 190, 4, BATTLE.playerHp);
    this.enemy = this.createFighter(CREATURES[0]?.sprite ?? 'hero', 360, 150, 4, BATTLE.enemyHp);
    this.animateEnemy();

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    this.hud = new Hud(ui);
    this.panel = new ExercisePanel(ui, {
      onAction: (a) => this.startTurn(a === 'strong'),
      onSubmit: (answer) => this.submit(answer),
      onHint: () => this.showNextHint(),
      onNext: () => this.startBattle(),
      onOpenSettings: () => this.openSettings(),
    });
    this.panel.setLocale(this.progress.locale);
    this.startBattle();
  }

  private drawBackground(): void {
    // Fondo provisional: en la fase 1 lo sustituye el generador de mapas.
    const bg = createRng(2026);
    for (let y = 0; y < GAME_HEIGHT; y += 16) {
      for (let x = 0; x < GAME_WIDTH; x += 16) {
        // Hierba generada; de vez en cuando, flores.
        const frame = bg.chance(0.12) ? flowerFrame(bg.int(0, FLOWER_VARIANTS - 1)) : grassFrame(bg.int(0, GRASS_VARIANTS - 1));
        this.add.image(x, y, TILESET_KEYS[0] ?? '', frame).setOrigin(0);
      }
    }
  }

  private createFighter(texture: string, x: number, y: number, scale: number, hp: number): Fighter {
    const sprite = this.add.image(x, y, texture).setScale(scale);
    const bar = this.add.graphics();
    const fighter = { sprite, hp, maxHp: hp, bar };
    this.drawBar(fighter);
    return fighter;
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
    this.creature = this.rng.pick(CREATURES);
    this.enemy.sprite.setTexture(this.creature.sprite, 0).setAlpha(1);
    this.enemy.hp = this.enemy.maxHp;
    this.player.hp = this.player.maxHp;
    this.drawBar(this.enemy);
    this.drawBar(this.player);
    this.turn = undefined;
    this.busy = false;
    this.refreshHud();
    this.panel.showActions();
  }

  private startTurn(strong: boolean): void {
    if (this.busy) return;
    const profile = this.progress.profile;
    const pick = strong
      ? { skill: challengeSkill(profile) ?? currentSkill(profile), slot: 'challenge' as const }
      : pickSkill(profile, this.rng);
    const exercise = generateExercise(pick.skill, this.rng);
    this.turn = { exercise, slot: pick.slot, strong, tries: 0, hintLevel: 0, startedAt: performance.now() };

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

    if (result.status === 'correct') {
      this.finishTurn(true);
      return;
    }

    turn.tries += 1;
    this.panel.clearAnswer();
    if (turn.tries >= BATTLE.maxTries) {
      this.panel.showFeedback(`${tr('reveal', locale)} ${turn.exercise.answer}.`, 'info');
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

    const locale = this.progress.locale;
    if (correct) {
      this.panel.showFeedback(`${tr('correct', locale)} +${score.total} ${tr('coins', locale)}`, 'good');
      const damage = Math.round(score.total * (turn.strong ? BATTLE.strongMultiplier : 1));
      this.hit(this.enemy, damage);
    }
    // La gema se gana al cruzar el umbral jugando: lo que da la prueba de nivel no cuenta.
    if (!wasMastered && isMastered(this.progress.profile[skill]) && !this.progress.gems.includes(skill)) {
      this.progress.gems.push(skill);
      this.panel.showFeedback(`${tr('gem', locale)} ${getSkill(skill).name[locale]}`, 'good');
    }
    saveProgress(this.progress);
    this.refreshHud();

    this.time.delayedCall(900, () => {
      if (this.enemy.hp <= 0) return this.endBattle(true);
      this.hit(this.player, BATTLE.enemyDamage);
      this.time.delayedCall(600, () => {
        if (this.player.hp <= 0) return this.endBattle(false);
        this.busy = false;
        this.turn = undefined;
        this.panel.showActions();
      });
    });
  }

  private hit(target: Fighter, damage: number): void {
    target.hp = Math.max(0, target.hp - damage);
    this.drawBar(target);
    this.tweens.add({ targets: target.sprite, x: '+=6', duration: 50, yoyo: true, repeat: 3 });
    this.tweens.add({ targets: target.sprite, alpha: 0.4, duration: 80, yoyo: true, repeat: 1 });
  }

  private endBattle(won: boolean): void {
    const locale = this.progress.locale;
    if (won) this.tweens.add({ targets: this.enemy.sprite, alpha: 0, duration: 400 });
    // Perder no quita nada: ni monedas ni dominio.
    this.panel.showResult(
      won ? tr('victory', locale) : tr('defeat', locale),
      `${this.progress.coins} ${tr('coins', locale)}`,
    );
  }

  private settingsOpen = false;

  private openSettings(): void {
    const ui = document.getElementById('ui');
    if (!ui || this.settingsOpen) return;
    this.settingsOpen = true;
    new SettingsPanel(ui, this.progress, {
      onChange: () => {
        // Cada cambio se aplica y se guarda al instante.
        applyTextSize(this.progress.settings);
        saveProgress(this.progress);
        this.panel.setLocale(this.progress.locale);
        this.refreshHud();
      },
      onClose: () => {
        this.settingsOpen = false;
        this.panel.showActions();
      },
    });
  }

  private refreshHud(): void {
    const skill = currentSkill(this.progress.profile);
    this.hud.update({
      locale: this.progress.locale,
      coins: this.progress.coins,
      gems: this.progress.gems.length,
      skillName: getSkill(skill).name[this.progress.locale],
      mastery: this.progress.profile[skill].mastery,
    });
  }
}
