import Phaser from 'phaser';
import { bandForGrade, GRADES } from '@kalku/content';
import type { Locale } from '@kalku/exercises';
import { tr, trf } from '../i18n';
import { button, stepTag } from '../ui/dom';
import { applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { goToStory } from '../storyFlow';

/** Cómo se dice cada curso (0 = Infantil 5 años). */
export const GRADE_NAMES: Readonly<Record<Locale, readonly string[]>> = {
  es: ['Infantil 5 años', '1.º', '2.º', '3.º', '4.º', '5.º', '6.º'],
  ca: ['P5', '1r', '2n', '3r', '4t', '5è', '6è'],
};

/**
 * Primera pantalla de un niño nuevo: «¿En qué curso estás?». El curso elige
 * el tono de la historia (docs/JUEGO-SIN-FIN.md §1). No se pregunta la edad.
 * Es el paso 1 de 3 del niño nuevo (curso → apodo → personaje).
 */
export class GradeScene extends Phaser.Scene {
  constructor() {
    super('grade');
  }

  create(): void {
    const progress = loadProgress();
    applySettings(progress.settings);
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    const root = document.createElement('div');
    root.className = 'settings grade-panel';
    ui.append(root);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.remove());
    this.render(root, progress);
  }

  private render(root: HTMLElement, progress: PlayerProgress): void {
    const locale = progress.locale;
    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = tr('gradeTitle', locale);
    const hint = document.createElement('p');
    hint.className = 'panel-feedback';
    hint.textContent = tr('gradeHint', locale);

    const grid = document.createElement('div');
    grid.className = 'grade-grid';
    for (const grade of GRADES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = grade === 0 ? 'btn btn-grade btn-grade-wide' : 'btn btn-grade';
      b.textContent = GRADE_NAMES[locale][grade] ?? String(grade);
      b.addEventListener('click', () => this.choose(progress, grade));
      grid.append(b);
    }

    // El idioma ya se eligió en la pantalla de inicio; aquí solo se puede volver a ella.
    const back = button('btn btn-small', tr('back', locale), () => this.scene.start('title'));
    root.replaceChildren(stepTag(trf('setupStep', locale, { n: 1, total: 3 })), title, hint, grid, back);
    grid.querySelector('button')?.focus();
  }

  private choose(progress: PlayerProgress, grade: number): void {
    progress.grade = grade;
    progress.band = bandForGrade(grade);
    saveProgress(progress);
    void goToStory(this);
  }
}
