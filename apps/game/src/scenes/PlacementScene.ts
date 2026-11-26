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
  type PlacementAnswer,
  type PlacementState,
} from '@kalku/exercises';
import { tr } from '../i18n';
import { applyServerSkills, applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { exerciseView, sendAnswer } from '../sync';
import { ExercisePanel } from '../ui/ExercisePanel';
import { SettingsPanel } from '../ui/SettingsPanel';

/** Intentos por ejercicio antes de enseñar la respuesta y seguir. */
const MAX_TRIES = 3;

interface Question {
  exercise: Exercise;
  seed: number;
  given: number | undefined;
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
  /** Lo que se manda al servidor al terminar la prueba: él la repite para dar el dominio. */
  private answers: PlacementAnswer[] = [];
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
    this.answers = [];
    this.state = startPlacement();
    this.question = undefined;
    this.busy = false;
    this.finished = false;
    applySettings(this.progress.settings);

    this.add.image(240, 110, 'hero').setScale(6);

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
    const seed = randomSeed();
    const exercise = generateExercise(skill, createRng(seed));
    this.question = { exercise, seed, given: undefined, tries: 0, hintLevel: 0 };
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
        applySettings(this.progress.settings);
        saveProgress(this.progress);
        this.panel.setLocale(this.progress.locale);
        this.panel.setAutoVoice(this.progress.settings.autoVoice);
      },
      onClose: () => {
        this.settingsOpen = false;
        // Mismo ejercicio, con el idioma nuevo.
        if (this.question) this.presentQuestion(this.question.exercise);
      },
      onDeleted: () => {
        // Datos borrados: de vuelta a la pantalla de apodo, como un niño nuevo.
        this.settingsOpen = false;
        this.scene.start('nickname');
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
    q.given = result.value;
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
    const q = this.question;
    if (q?.given !== undefined) {
      this.answers.push({
        skill: q.exercise.skill,
        seed: String(q.seed),
        given: q.given,
        exercise: exerciseView(q.exercise),
        helped: q.tries > 0 || q.hintLevel > 0,
        hintsUsed: q.hintLevel,
      });
    }
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
    if (!skipped) this.reportPlacement();
    const locale = this.progress.locale;
    if (skipped) return this.leave();
    this.panel.showResult(tr('placementDone', locale), '', tr('placementGo', locale));
  }

  /** El servidor repite la prueba con las respuestas y manda sobre el dominio inicial; sin red se queda el local. */
  private reportPlacement(): void {
    const progress = this.progress;
    void sendAnswer(progress, { kind: 'placement', answers: this.answers }).then((skills) => {
      if (skills) applyServerSkills(progress, skills);
    });
  }

  private leave(): void {
    this.scene.start('world');
  }
}
