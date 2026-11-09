import { formatExercise, type Exercise, type Locale } from '@kalku/exercises';
import { tr } from '../i18n';

/**
 * Panel de ejercicios en HTML, encima del canvas de Phaser.
 * Los números van en HTML (no en píxeles) para que se lean grandes y
 * nítidos, con teclado numérico en pantalla para tablets.
 */
export interface PanelCallbacks {
  onAction(action: 'quick' | 'strong' | 'rescue'): void;
  onSubmit(answer: string): void;
  onHint(): void;
  onNext(): void;
  onOpenSettings(): void;
}

/** Cabecera opcional del ejercicio (la usa la prueba de nivel). */
export interface ExerciseChrome {
  title: string;
  /** Texto de la barra de avance, por ejemplo «Ejercicio 3 / 10». */
  progressLabel: string;
  /** 0–1. */
  progress: number;
  skipLabel: string;
  onSkip(): void;
}

export class ExercisePanel {
  private readonly keyListener = (e: KeyboardEvent): void => this.onKey(e);

  private readonly root: HTMLElement;
  private answer = '';
  private locale: Locale = 'es';

  constructor(container: HTMLElement, private readonly callbacks: PanelCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'panel';
    container.append(this.root);
    window.addEventListener('keydown', this.keyListener);
  }

  /** Quita el panel y deja de escuchar el teclado (al salir de la escena). */
  destroy(): void {
    window.removeEventListener('keydown', this.keyListener);
    this.root.remove();
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  showActions(tag?: string, canRescue = false): void {
    this.root.dataset.state = 'actions';
    this.root.replaceChildren(
      el('p', 'panel-title', tr('chooseAction', this.locale)),
      row(
        button(tr('quickAttack', this.locale), 'btn btn-primary', () => this.callbacks.onAction('quick')),
        button(tr('strongAttack', this.locale), 'btn btn-danger', () => this.callbacks.onAction('strong')),
      ),
      ...(canRescue ? [button(tr('rescue', this.locale), 'btn btn-rescue', () => this.callbacks.onAction('rescue'))] : []),
      tag ? el('p', 'panel-feedback', tag) : el('span'),
      button(tr('settings', this.locale), 'btn btn-small', () => this.callbacks.onOpenSettings()),
    );
  }

  showExercise(exercise: Exercise, tag?: string, chrome?: ExerciseChrome): void {
    this.answer = '';
    this.root.dataset.state = 'exercise';
    const keypad = el('div', 'keypad');
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']) {
      const action =
        key === '⌫' ? () => this.erase() : key === '✓' ? () => this.submit() : () => this.type(key);
      keypad.append(button(key, key === '✓' ? 'key key-ok' : 'key', action, key === '⌫' ? tr('erase', this.locale) : undefined));
    }
    this.root.replaceChildren(
      ...(chrome ? headerOf(chrome) : []),
      tag ? el('p', 'panel-tag', tag) : el('span'),
      el('p', exercise.story ? 'exercise exercise-story' : 'exercise', formatExercise(exercise, '▢', this.locale)),
      el('p', 'answer', ''),
      el('p', 'panel-feedback', ''),
      keypad,
      row(
        button(tr('hint', this.locale), 'btn btn-small', () => this.callbacks.onHint()),
        button(tr('check', this.locale), 'btn btn-primary', () => this.submit()),
      ),
      ...(chrome ? [button(chrome.skipLabel, 'btn btn-quiet', () => chrome.onSkip())] : []),
    );
    this.renderAnswer();
  }

  showFeedback(text: string, kind: 'good' | 'bad' | 'info'): void {
    const feedback = this.root.querySelector<HTMLElement>('.panel-feedback');
    if (!feedback) return;
    feedback.textContent = text;
    feedback.dataset.kind = kind;
  }

  clearAnswer(): void {
    this.answer = '';
    this.renderAnswer();
  }

  showResult(title: string, detail: string, buttonLabel: string = tr('nextBattle', this.locale)): void {
    this.root.dataset.state = 'result';
    this.root.replaceChildren(
      el('p', 'panel-title', title),
      el('p', 'panel-feedback', detail),
      button(buttonLabel, 'btn btn-primary', () => this.callbacks.onNext()),
    );
  }

  private type(digit: string): void {
    if (this.root.dataset.state !== 'exercise' || this.answer.length >= 3) return;
    this.answer += digit;
    this.renderAnswer();
  }

  private erase(): void {
    this.answer = this.answer.slice(0, -1);
    this.renderAnswer();
  }

  private submit(): void {
    if (this.root.dataset.state !== 'exercise') return;
    this.callbacks.onSubmit(this.answer);
  }

  private renderAnswer(): void {
    const answer = this.root.querySelector<HTMLElement>('.answer');
    if (answer) answer.textContent = this.answer || ' ';
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.dataset.state !== 'exercise') return;
    if (/^\d$/.test(e.key)) this.type(e.key);
    else if (e.key === 'Backspace') this.erase();
    else if (e.key === 'Enter') this.submit();
  }
}

function el(tag: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function headerOf(chrome: ExerciseChrome): HTMLElement[] {
  const bar = el('div', 'progress-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', chrome.progressLabel);
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(Math.round(chrome.progress * 100)));
  const fill = el('span');
  fill.style.width = `${Math.round(chrome.progress * 100)}%`;
  bar.append(fill);
  return [el('p', 'panel-title', chrome.title), bar, el('p', 'panel-progress', chrome.progressLabel)];
}

function row(...children: HTMLElement[]): HTMLElement {
  const node = el('div', 'row');
  node.append(...children);
  return node;
}

function button(label: string, className: string, onClick: () => void, ariaLabel?: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = label;
  if (ariaLabel) node.setAttribute('aria-label', ariaLabel);
  node.addEventListener('click', onClick);
  return node;
}
