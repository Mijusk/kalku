import type { Locale } from '@kalku/exercises';
import { SECRET_ANIMALS } from '@kalku/content';
import { ClassLoginError, type ClassCredentials, type ClassLoginBackend, type ClassStudentName } from '../classLogin';
import { classIdFromText } from '../classDevice';
import { tr } from '../i18n';
import { button, say, show, status, text } from './dom';

export interface ClassLoginPanelOptions {
  backend: ClassLoginBackend;
  /** Id de la clase (del QR). Sin él se pide el enlace. */
  classId: string | null;
  /** Entra con lo que ha tocado el niño (lanza `ClassLoginError` si no vale). */
  submit(classId: string, credentials: ClassCredentials): Promise<void>;
  /** Vuelta a la pantalla anterior, si la hay. */
  onBack?(): void;
}

/**
 * Entrada del niño a su clase (#53): ① apodo, ② animal entre 6, o «tengo mi código».
 * Botones grandes, textos cortos. Quien comprueba es el servidor.
 */
export class ClassLoginPanel {
  private busy = false;
  private classId: string | null;
  private unlockTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: ClassLoginPanelOptions) {
    this.classId = options.classId;
    if (this.classId) void this.showNames();
    else this.showLink();
  }

  private back(): HTMLElement | null {
    return this.options.onBack ? button('btn btn-small', tr('back', this.locale), () => this.options.onBack?.()) : null;
  }

  private showLink(message = ''): void {
    const feedback = status(message, message ? 'bad' : 'info');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nickname-input';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', tr('classLoginLink', this.locale));
    input.placeholder = tr('classLoginLink', this.locale);
    const go = button('btn btn-primary', tr('classLoginContinue', this.locale), () => {
      const id = classIdFromText(input.value);
      if (!id) return say(feedback, tr('classLoginBadLink', this.locale), 'bad');
      this.classId = id;
      void this.showNames();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go.click();
    });
    show(this.root, text('panel-title', tr('classLoginTitle', this.locale)), text('panel-feedback', tr('classLoginNoClass', this.locale)), input, feedback, go, ...this.extra());
  }

  private extra(): HTMLElement[] {
    const back = this.back();
    return back ? [back] : [];
  }

  private async showNames(): Promise<void> {
    const classId = this.classId;
    if (!classId) return;
    const feedback = status(tr('classLoginEntering', this.locale));
    show(this.root, text('panel-title', tr('classLoginTitle', this.locale)), feedback);
    let students: ClassStudentName[];
    try {
      students = await this.options.backend.listNicknames(classId);
    } catch {
      show(this.root, text('panel-title', tr('classLoginTitle', this.locale)), status(tr('classLoginNetwork', this.locale), 'bad'), ...this.extra());
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'class-grid';
    for (const s of students) grid.append(button('btn', s.nickname, () => this.showAnimals(s)));
    const code = button('btn btn-small', tr('classLoginHaveCode', this.locale), () => this.showCode());
    show(
      this.root,
      text('panel-title', tr('classLoginPickName', this.locale)),
      students.length > 0 ? grid : status(tr('classLoginNoStudents', this.locale), 'bad'),
      code,
      ...this.extra(),
    );
  }

  private showAnimals(student: ClassStudentName): void {
    const feedback = status();
    const grid = document.createElement('div');
    grid.className = 'class-grid';
    const buttons = SECRET_ANIMALS.map((a) => {
      const b = button('btn btn-animal', '', () => void this.attempt(feedback, buttons, { kind: 'animal', studentId: student.id, animal: a.id }));
      const emoji = document.createElement('span');
      emoji.className = 'animal-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = a.emoji;
      b.append(emoji, document.createTextNode(a.name[this.locale]));
      grid.append(b);
      return b;
    });
    const names = button('btn btn-small', tr('back', this.locale), () => void this.showNames());
    show(this.root, text('panel-title', tr('classLoginHello', this.locale).replace('{name}', student.nickname)), text('panel-feedback', tr('classLoginPickAnimal', this.locale)), grid, feedback, names);
  }

  private showCode(): void {
    const feedback = status();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nickname-input';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.maxLength = 30;
    input.setAttribute('aria-label', tr('classLoginCodeInput', this.locale));
    input.placeholder = tr('classLoginCodeInput', this.locale);
    const go = button('btn btn-primary', tr('classLoginCodeGo', this.locale), () => {
      if (input.value.trim()) void this.attempt(feedback, [go], { kind: 'code', code: input.value });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go.click();
    });
    const names = button('btn btn-small', tr('back', this.locale), () => void this.showNames());
    show(this.root, text('panel-title', tr('classLoginHaveCode', this.locale)), input, feedback, go, names);
  }

  /** Prueba con lo que tocó el niño. Con fallos seguidos, bloquea los botones lo que diga el servidor. */
  private async attempt(feedback: HTMLElement, buttons: HTMLButtonElement[], credentials: ClassCredentials): Promise<void> {
    const classId = this.classId;
    if (!classId || this.busy) return;
    this.busy = true;
    say(feedback, tr('classLoginEntering', this.locale));
    try {
      await this.options.submit(classId, credentials);
    } catch (e) {
      const error = e instanceof ClassLoginError ? e : new ClassLoginError('network');
      if (error.code === 'locked') {
        say(feedback, tr('classLoginHelp', this.locale), 'bad');
        for (const b of buttons) b.disabled = true;
        // Nunca para siempre: el servidor da un tiempo corto (30 s, 1 min, 5 min como tope).
        this.unlockTimer = setTimeout(() => {
          for (const b of buttons) b.disabled = false;
        }, Math.max(error.retryAfter, 1) * 1000);
      } else {
        say(feedback, tr(error.code === 'wrong' ? 'classLoginWrong' : 'classLoginNetwork', this.locale), 'bad');
      }
    } finally {
      this.busy = false;
    }
  }

  destroy(): void {
    clearTimeout(this.unlockTimer);
  }
}
