import Phaser from 'phaser';
import { currentStep, regionStory, storyIn, type StoryOutcome } from '@kalku/content';
import type { MapSpriteId } from '@kalku/art';
import {
  applyAnswer,
  checkAnswer,
  createRng,
  getHint,
  levelForXp,
  randomSeed,
  scoreAnswer,
  xpForAnswer,
  type Exercise,
  type Hint,
} from '@kalku/exercises';
import { playMusic, sfx } from '../audio/sound';
import { applyMissionEvent } from '../missions';
import { mapSpriteKey } from '../art/textures';
import { tr } from '../i18n';
import { applyServerSkills, applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { applyQuestEvent, applyStoryEvent, playScenes } from '../storyFlow';
import { exerciseView, sendAnswer } from '../sync';
import { riddleExercise } from '../syllabus';
import { ExercisePanel } from '../ui/ExercisePanel';
import { banner, clearFx, reducedMotion } from '../ui/fx';
import { showLevelUp } from '../ui/LevelUp';
import { PENDING_OUTCOME_KEY, PENDING_QUEST_KEY } from '../worldState';
import { burst, drawBattleBackground, ensureFxTextures } from './battleFx';
import { GAME_HEIGHT, GAME_WIDTH } from './BattleScene';

/** Cuántos intentos antes de enseñar la respuesta y pasar a otro acertijo (no cuenta, pero no quita nada). */
const MAX_TRIES = 3;

/**
 * Los acertijos de Pedrolo (capítulo 4): problemas con texto, sin vida que
 * perder ni tiempo. Cada acierto enciende una runa de la Puerta de Piedra.
 * Si el centro tiene temario propio, los acertijos salen de ahí.
 */
export class RiddleScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private panel!: ExercisePanel;
  private exercise: Exercise | undefined;
  private seed = 0;
  private tries = 0;
  private hintLevel: 0 | Hint['level'] = 0;
  private busy = false;
  private runes: Phaser.GameObjects.Arc[] = [];
  private solved = 0;
  private need = 3;
  private forQuest = false;

  constructor() {
    super('riddle');
  }

  create(): void {
    this.progress = loadProgress();
    applySettings(this.progress.settings);
    const region = regionStory(this.progress.at);
    const story = storyIn(this.progress.story, this.progress.at);
    const step = currentStep(story);
    // Acertijos de la historia o, después del final, un encargo de Pedrolo.
    const quest = this.progress.quest;
    this.forQuest = step?.kind !== 'riddles' && quest !== null && quest.accepted && quest.kind === 'riddles';
    this.need = step?.kind === 'riddles' ? (step.count ?? 3) : this.forQuest && quest ? quest.need : 3;
    this.solved = step?.kind === 'riddles' ? story.count : this.forQuest && quest ? quest.have : 0;
    this.busy = false;
    ensureFxTextures(this);
    playMusic('story');
    clearFx();
    drawBattleBackground(this, GAME_WIDTH, GAME_HEIGHT);
    // La puerta del guardián con sus runas: de piedra (Pedrolo) o de corteza (Cuco, en el Árbol Hueco).
    const riddler = region.riddler?.npc ?? 'pedrolo';
    const wood = riddler === 'cuco';
    const g = this.add.graphics();
    g.fillStyle(0x1b2a1f).fillRoundedRect(250, 40, 150, 170, 10);
    g.fillStyle(wood ? 0x6e4527 : 0x8c867d).fillRoundedRect(254, 44, 142, 162, 8);
    g.fillStyle(wood ? 0x9a6a3c : 0xa9a39a).fillRect(262, 52, 60, 150).fillRect(328, 52, 60, 150);
    g.fillStyle(wood ? 0x35200f : 0x6c675f).fillRect(323, 52, 4, 150);
    this.runes = Array.from({ length: Math.min(this.need, 4) }, (_, i) => i).map((i) => this.add.circle(325 - ((Math.min(this.need, 4) - 1) * 45) / 2 + i * 45, 90, 11, 0x4b4658).setStrokeStyle(3, 0x1b2a1f));
    this.runes.forEach((r, i) => i < this.solved && this.lightRune(r, false));
    this.add.image(190, 175, mapSpriteKey(riddler as MapSpriteId)).setScale(4);
    this.add.image(440, 190, 'hero', 0).setScale(3).setFlipX(true);

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
    const intro = region.riddler?.intro ?? 'pedrolo-riddles';
    if (this.solved === 0 && !this.forQuest) void playScenes([intro]).then(() => this.ask());
    else this.ask();
  }

  private lightRune(rune: Phaser.GameObjects.Arc | undefined, animate: boolean): void {
    if (!rune) return;
    rune.setFillStyle(0x8fe8ff);
    if (!animate || reducedMotion()) return;
    burst(this, rune.x, rune.y, 'star', 16);
    this.tweens.add({ targets: rune, scale: 1.6, duration: 200, yoyo: true });
  }

  private ask(): void {
    this.seed = randomSeed();
    this.exercise = riddleExercise(createRng(this.seed), this.solved);
    this.tries = 0;
    this.hintLevel = 0;
    this.busy = false;
    const locale = this.progress.locale;
    this.panel.showExercise(this.exercise, undefined, {
      title: tr('riddleTitle', locale),
      progressLabel: `${tr('riddleProgress', locale)} ${this.solved + 1} / ${this.need}`,
      progress: this.solved / this.need,
      skipLabel: tr('backToMap', locale),
      onSkip: () => this.leave(),
    });
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
    if (result.status === 'correct') return this.correct(ex, result.value);
    this.tries += 1;
    sfx('wrong');
    this.panel.clearAnswer();
    if (this.tries >= MAX_TRIES) {
      // Otro acertijo, sin perder nada.
      this.panel.showFeedback(`${tr('reveal', locale)} ${ex.answer}. ${tr('riddleAnother', locale)}`, 'info');
      this.record(ex, false, result.value);
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
    const hint = ex.hint ? ex.hint[this.progress.locale] : getHint(ex, this.hintLevel, this.progress.locale).text;
    this.panel.showFeedback(prefix ? `${prefix} ${hint}` : hint, prefix ? 'bad' : 'info');
  }

  /** Guarda el intento en el dominio (solo las habilidades del currículo) y lo manda al servidor. */
  private record(ex: Exercise, correct: boolean, given: number | undefined): void {
    const helped = this.tries > 0 || this.hintLevel > 0;
    if (ex.custom) return;
    this.progress.profile = applyAnswer(this.progress.profile, ex.skill, { correct, helped, slot: 'current' });
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
      slot: 'current',
      hintsUsed: this.hintLevel,
    }).then((skills) => {
      if (skills) applyServerSkills(progress, skills);
    });
  }

  private correct(ex: Exercise, given: number | undefined): void {
    this.busy = true;
    const locale = this.progress.locale;
    const helped = this.tries > 0 || this.hintLevel > 0;
    const score = scoreAnswer({ correct: true, difficulty: ex.difficulty, streak: 0, helped, elapsedMs: undefined });
    this.progress.coins += score.total;
    for (const m of applyMissionEvent(this.progress, { type: 'answer', correct: true, operator: ex.operator === '-' ? '-' : '+', strong: false })) {
      banner(`${tr('missionDone', locale)} +${m.reward} ${tr('coins', locale)}`, 'win', 2200);
    }
    const before = levelForXp(this.progress.xp);
    this.progress.xp += xpForAnswer({ correct: true, difficulty: ex.difficulty, helped });
    this.record(ex, true, given);
    saveProgress(this.progress);
    if (levelForXp(this.progress.xp) > before) {
      const ui = document.getElementById('ui');
      if (ui) showLevelUp(ui, levelForXp(this.progress.xp), locale, this.progress.settings.autoVoice);
    }
    sfx('correct');
    this.panel.showCasting(`${tr('correct', locale)} +${score.total} ${tr('coins', locale)}`);
    this.lightRune(this.runes[this.solved], true);
    this.solved += 1;
    if (this.forQuest) {
      const quest = applyQuestEvent({ type: 'riddleSolved' }, this.progress);
      this.progress = loadProgress();
      if (quest.done) {
        this.registry.set(PENDING_QUEST_KEY, quest);
        this.time.delayedCall(1000, () => {
          sfx('door');
          this.scene.start('world');
        });
        return;
      }
      banner(`${tr('riddleProgress', locale)} ${this.solved}/${this.need}`, 'streak', 1100);
      this.time.delayedCall(1400, () => this.ask());
      return;
    }
    const outcome = applyStoryEvent({ type: 'riddleSolved' });
    this.progress = loadProgress();
    if (this.solved >= this.need || outcome.zoneOpened) {
      this.time.delayedCall(1000, () => void this.finish(outcome));
      return;
    }
    banner(`${tr('riddleProgress', locale)} ${this.solved}/${this.need}`, 'streak', 1100);
    this.time.delayedCall(1400, () => this.ask());
  }

  private async finish(outcome: StoryOutcome): Promise<void> {
    sfx('door');
    if (!reducedMotion()) this.cameras.main.shake(400, 0.008);
    if (outcome.scenes.length > 0) await playScenes(outcome.scenes);
    // El mapa enseña la puerta abriéndose (y el capítulo terminado).
    this.registry.set(PENDING_OUTCOME_KEY, { ...outcome, scenes: [] });
    this.scene.start('world');
  }

  private leave(): void {
    this.scene.start('world');
  }
}
