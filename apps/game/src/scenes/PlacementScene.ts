import Phaser from 'phaser';
import {
  applyPlacement,
  checkAnswer,
  createRng,
  generateExercise,
  getHint,
  nextPlacementSkill,
  placementResult,
  PLACEMENT_LENGTH,
  randomSeed,
  recordPlacement,
  startPlacement,
  type Exercise,
  type Hint,
  type PlacementState,
  type Rng,
} from '@kalku/exercises';
import { tr } from '../i18n';
import { applyTextSize, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { ExercisePanel } from '../ui/ExercisePanel';
import { SettingsPanel } from '../ui/SettingsPanel';

/** Intentos por ejercicio antes de enseñar la respuesta y seguir. */
const MAX_TRIES = 3;

interface Question {
  exercise: Exercise;
  tries: number;
  hintLevel: 0 | Hint['level'];
}

/**
 * Prueba de nivel de la primera vez (#36). Se presenta como un juego, sin
 * notas ni tiempo. Fallar da la pista de siempre y no quita nada. Al
 * terminar da dominio inicial a las habilidades, sin gemas ni monedas.
 */
export class PlacementScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private rng!: Rng;
  private panel!: ExercisePanel;
  private state!: PlacementState;
  private question: Question | undefined;
  private busy = false;
  private finished = false;

  constructor() {
    super('placement');
  }

  create(): void {
    this.progress = loadProgress();
    this.rng = createRng(randomSeed());
    this.state = startPlacement();
    this.question = undefined;
    this.busy = false;
    this.finished = false;
    applyTextSize(this.progress.settings);

    this.add.image(240, 110, 'hero', 0).setScale(6);

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    this.panel = new ExercisePanel(ui, {
      onAction: () => undefined,
      onSubmit: (answer) => this.submit(answer),
      onHint: () => this.showNextHint(),
      onNext: () => this.leave(),
      onOpenSettings: () => this.openSettings(),
    });
    this.panel.setLocale(this.progress.locale);
    this.panel.setAutoVoice(this.progress.settings.autoVoice);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());
    this.askNext();
  }

  private askNext(): void {
    const skill = nextPlacementSkill(this.state);
    if (!skill) return this.finish(false);
    const exercise = generateExercise(skill, this.rng);
    this.question = { exercise, tries: 0, hintLevel: 0 };
    this.busy = false;
    this.presentQuestion(exercise);
  }

  private presentQuestion(exercise: Exercise): void {
    const locale = this.progress.locale;
    const total = PLACEMENT_LENGTH;
    this.panel.showExercise(exercise, undefined, {
      title: tr('placementTitle', locale),
      progressLabel: `${tr('placementProgress', locale)} ${this.state.asked + 1} / ${total}`,
      progress: this.state.asked / total,
      skipLabel: tr('placementSkip', locale),
      onSkip: () => {
        if (!this.busy) this.finish(true);
      },
    });
  }

  private settingsOpen = false;

  private openSettings(): void {
    const ui = document.getElementById('ui');
    if (!ui || this.settingsOpen || this.busy) return;
    this.settingsOpen = true;
    new SettingsPanel(ui, this.progress, {
      onChange: () => {
        applyTextSize(this.progress.settings);
        saveProgress(this.progress);
        this.panel.setLocale(this.progress.locale);
        this.panel.setAutoVoice(this.progress.settings.autoVoice);
      },
      onClose: () => {
        this.settingsOpen = false;
        // Mismo ejercicio, con el idioma nuevo.
        if (this.question) this.presentQuestion(this.question.exercise);
      },
    });
  }

  private submit(answer: string): void {
    const q = this.question;
    if (!q || this.busy) return;
    const locale = this.progress.locale;
    const result = checkAnswer(q.exercise, answer);
    if (result.status === 'invalid') {
      this.panel.showFeedback(tr('invalid', locale), 'info');
      return;
    }
    if (result.status === 'correct') {
      this.panel.showFeedback(tr('correct', locale), 'good');
      // Cuenta como acierto solo sin fallos ni pistas; no hay tiempo de por medio.
      return this.record(q.tries === 0 && q.hintLevel === 0);
    }
    q.tries += 1;
    this.panel.clearAnswer();
    if (q.tries >= MAX_TRIES) {
      this.panel.showFeedback(`${tr('reveal', locale)} ${q.exercise.answer}.`, 'info');
      return this.record(false);
    }
    this.showNextHint(tr('wrong', locale));
  }

  private showNextHint(prefix?: string): void {
    const q = this.question;
    if (!q || this.busy) return;
    q.hintLevel = Math.min(3, q.hintLevel + 1) as Hint['level'];
    const hint = getHint(q.exercise, q.hintLevel, this.progress.locale).text;
    this.panel.showFeedback(prefix ? `${prefix} ${hint}` : hint, prefix ? 'bad' : 'info');
  }

  private record(correct: boolean): void {
    this.busy = true;
    this.state = recordPlacement(this.state, correct);
    this.time.delayedCall(800, () => this.askNext());
  }

  /** `skipped`: «Ahora no», todo queda en 0. */
  private finish(skipped: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.busy = true;
    if (!skipped) this.progress.profile = applyPlacement(this.progress.profile, placementResult(this.state));
    this.progress.placementDone = true;
    saveProgress(this.progress);
    const locale = this.progress.locale;
    if (skipped) return this.leave();
    this.panel.showResult(tr('placementDone', locale), '', tr('placementGo', locale));
  }

  private leave(): void {
    this.scene.start('world');
  }
}
