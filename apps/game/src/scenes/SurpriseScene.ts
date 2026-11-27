import Phaser from 'phaser';
import { dateKey, openSurprise, setPiece } from '@kalku/content';
import {
  applyAnswer,
  checkAnswer,
  createRng,
  generateExercise,
  getHint,
  levelForXp,
  pickSkill,
  randomSeed,
  scoreAnswer,
  xpForAnswer,
  type Exercise,
  type Hint,
  type Slot,
} from '@kalku/exercises';
import { playMusic, sfx } from '../audio/sound';
import { createHeroTexture, HERO_KEY, SURPRISE_TEXTURES } from '../art/textures';
import { tr, trf } from '../i18n';
import { addAnswerCoins } from '../items';
import { applyMissionEvent } from '../missions';
import { applyServerSkills, applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { exerciseView, sendAnswer } from '../sync';
import { ExercisePanel } from '../ui/ExercisePanel';
import { banner, clearFx, confetti, reducedMotion } from '../ui/fx';
import { showLevelUp } from '../ui/LevelUp';
import { burst, drawBattleBackground, ensureFxTextures } from './battleFx';
import { GAME_HEIGHT, GAME_WIDTH } from './BattleScene';

/** Intentos antes de enseñar la respuesta y poner otra cuenta (no se pierde nada). */
const MAX_TRIES = 3;

/**
 * Cofre sorpresa del día: una cuenta de su nivel y el cofre se abre. Dentro
 * está siempre el siguiente regalo de la lista (nada de rarezas ni azar en lo
 * que toca: docs/DECISIONS.md). Fallar da pista y otra oportunidad.
 */
export class SurpriseScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private panel!: ExercisePanel;
  private chest!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Image;
  private exercise: Exercise | undefined;
  private slot: Slot = 'current';
  private seed = 0;
  private tries = 0;
  private hintLevel: 0 | Hint['level'] = 0;
  private busy = false;

  constructor() {
    super('surprise');
  }

  create(): void {
    this.progress = loadProgress();
    applySettings(this.progress.settings);
    this.busy = false;
    ensureFxTextures(this);
    playMusic('story');
    clearFx();
    drawBattleBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.chest = this.add.image(GAME_WIDTH / 2 + 60, 165, SURPRISE_TEXTURES.closed).setScale(6);
    this.hero = this.add.image(GAME_WIDTH / 2 - 110, 180, HERO_KEY, 0).setScale(4);
    if (!reducedMotion()) {
      this.tweens.add({ targets: this.chest, angle: { from: -4, to: 4 }, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900 });
    }

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    this.panel = new ExercisePanel(ui, {
      onAction: () => undefined,
      onSubmit: (answer) => this.submit(answer),
      onHint: () => this.showHint(),
      onNext: () => this.leave(),
      onOpenSettings: () => undefined,
    });
    this.panel.setLocale(this.progress.locale);
    this.panel.setAutoVoice(this.progress.settings.autoVoice);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());
    this.ask();
  }

  private ask(): void {
    // Una cuenta de su nivel, con la misma mezcla que en los combates.
    const pick = pickSkill(this.progress.profile, createRng(randomSeed()));
    this.slot = pick.slot;
    this.seed = randomSeed();
    this.exercise = generateExercise(pick.skill, createRng(this.seed));
    this.tries = 0;
    this.hintLevel = 0;
    this.busy = false;
    const locale = this.progress.locale;
    this.panel.showExercise(this.exercise, undefined, {
      title: tr('surpriseTitle', locale),
      progressLabel: tr('surpriseAsk', locale),
      progress: 0,
      skipLabel: tr('backToMap', locale),
      onSkip: () => this.leave(),
    });
  }

  /** Solo para desarrollo (`src/dev`): resuelve la cuenta que hay en pantalla. */
  devSolve(): void {
    if (this.exercise && !this.busy) this.submit(String(this.exercise.answer));
  }

  private submit(answer: string): void {
    const ex = this.exercise;
    if (!ex || this.busy) return;
    const locale = this.progress.locale;
    const result = checkAnswer(ex, answer);
    if (result.status === 'invalid') {
      this.panel.showFeedback(tr('invalid', locale), 'info');
      return;
    }
    if (result.status === 'correct') return this.open(ex, result.value);
    this.tries += 1;
    sfx('wrong');
    this.panel.clearAnswer();
    if (this.tries >= MAX_TRIES) {
      this.record(ex, false, result.value);
      this.panel.showFeedback(`${tr('reveal', locale)} ${ex.answer}. ${tr('riddleAnother', locale)}`, 'info');
      this.busy = true;
      this.time.delayedCall(2200, () => this.ask());
      return;
    }
    this.showHint(tr('wrong', locale));
  }

  private showHint(prefix?: string): void {
    const ex = this.exercise;
    if (!ex || this.busy) return;
    this.hintLevel = Math.min(3, this.hintLevel + 1) as Hint['level'];
    const hint = getHint(ex, this.hintLevel, this.progress.locale).text;
    this.panel.showFeedback(prefix ? `${prefix} ${hint}` : hint, prefix ? 'bad' : 'info');
  }

  /** Guarda el intento en el dominio y lo manda al servidor, como en los combates. */
  private record(ex: Exercise, correct: boolean, given: number | undefined): void {
    const helped = this.tries > 0 || this.hintLevel > 0;
    this.progress.profile = applyAnswer(this.progress.profile, ex.skill, { correct, helped, slot: this.slot });
    saveProgress(this.progress);
    if (given === undefined) return;
    const progress = this.progress;
    void sendAnswer(progress, {
      kind: 'answer',
      skill: ex.skill,
      seed: String(this.seed),
      given,
      exercise: exerciseView(ex),
      helped,
      slot: this.slot,
      hintsUsed: this.hintLevel,
    }).then((skills) => {
      if (skills) applyServerSkills(progress, skills);
    });
  }

  private open(ex: Exercise, given: number | undefined): void {
    this.busy = true;
    const locale = this.progress.locale;
    const helped = this.tries > 0 || this.hintLevel > 0;
    const score = scoreAnswer({ correct: true, difficulty: ex.difficulty, streak: 0, helped, elapsedMs: undefined });
    const earned = addAnswerCoins(this.progress, score.total, this.progress.profile[ex.skill], this.slot);
    for (const m of applyMissionEvent(this.progress, { type: 'answer', correct: true, operator: ex.operator === '-' ? '-' : '+', strong: false })) {
      banner(`${tr('missionDone', locale)} +${m.reward} ${tr('coins', locale)}`, 'win', 2200);
    }
    const before = levelForXp(this.progress.xp);
    this.progress.xp += xpForAnswer({ correct: true, difficulty: ex.difficulty, helped });
    this.record(ex, true, given);

    const today = dateKey(new Date());
    const gift = openSurprise(this.progress.owned, this.progress.surpriseDay, today);
    this.progress.surpriseDay = today;
    if (gift) {
      this.progress.owned = gift.owned;
      this.progress.coins += gift.coins;
      // El regalo se lo pone al momento (se puede quitar en el Armario).
      if (gift.gift) this.progress.outfit = setPiece(this.progress.outfit, gift.gift.layer, gift.gift.id);
    }
    saveProgress(this.progress);
    if (levelForXp(this.progress.xp) > before) {
      const ui = document.getElementById('ui');
      if (ui) showLevelUp(ui, levelForXp(this.progress.xp), locale, this.progress.settings.autoVoice);
    }

    sfx('correct');
    this.panel.showCasting(`${tr('correct', locale)} +${earned.coins} ${tr('coins', locale)}`);
    this.time.delayedCall(700, () => {
      this.tweens.killTweensOf(this.chest);
      this.chest.setAngle(0).setTexture(SURPRISE_TEXTURES.open);
      sfx('chest');
      confetti(70);
      if (!reducedMotion()) {
        burst(this, this.chest.x, this.chest.y - 20, 'star', 24);
        this.tweens.add({ targets: this.chest, scale: 6.6, duration: 160, yoyo: true });
      }
      if (gift?.gift) {
        createHeroTexture(this, this.progress.outfit);
        this.hero.setTexture(HERO_KEY, 0);
        if (!reducedMotion()) this.tweens.add({ targets: this.hero, y: this.hero.y - 16, duration: 180, yoyo: true, repeat: 1 });
      }
      const detail = gift?.gift
        ? trf('surpriseGift', locale, { item: gift.gift.name[locale] })
        : trf('surpriseCoins', locale, { n: gift?.coins ?? 0 });
      banner(tr('surpriseTitle', locale), 'win', 1600);
      this.time.delayedCall(900, () => this.panel.showResult(detail, tr('surpriseTomorrow', locale), tr('backToMap', locale)));
    });
  }

  private leave(): void {
    this.scene.start('world');
  }
}
