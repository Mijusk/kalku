import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { CONTRACT_URL, formatSchoolCode, loadTeacherView, registerSchool, toTeacherError, type SchoolInfo, type TeacherBackend } from '../teacher';
import type { ClassBackend } from '../classes';
import { ClassPanel } from './ClassPanel';
import type { ClassProgressBackend } from '../classProgress';
import { ERROR_TEXT } from './teacherErrors';
import { button, say, show, status, text } from './dom';

export interface TeacherCallbacks {
  /** `null` sin servidor: el panel solo avisa. */
  backend: TeacherBackend | null;
  /** Clases y tarjetas (#52). */
  classBackend?: ClassBackend | null;
  progressBackend?: ClassProgressBackend | null;
  onClose(): void;
}

export function field(label: string, type = 'text'): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'nickname-input';
  input.autocomplete = type === 'email' ? 'email' : 'off';
  input.setAttribute('aria-label', label);
  input.placeholder = label;
  return input;
}

/** Pantalla de docentes (#51): entrar con enlace de correo, dar de alta un centro o unirse a uno con su código. */
export class TeacherPanel {
  private busy = false;

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: TeacherCallbacks) {
    void this.start();
  }

  private async start(): Promise<void> {
    const { backend } = this.options;
    if (!backend) {
      show(this.root, text('panel-title', tr('teacherTitle', this.locale)), status(tr('teacherUnavailable', this.locale), 'bad'), this.backButton());
      return;
    }
    try {
      const view = await loadTeacherView(backend);
      if (view.kind === 'login') this.showLogin(backend);
      else if (view.kind === 'school') this.showSchool(backend, view.school);
      else this.showNoSchool(backend);
    } catch {
      this.showLogin(backend);
    }
  }

  private backButton(): HTMLButtonElement {
    return button('btn btn-small', tr('teacherBack', this.locale), () => this.options.onClose());
  }

  private errorText(e: unknown): string {
    return tr(ERROR_TEXT[toTeacherError(e).code], this.locale);
  }

  /** Corre una acción larga con un solo clic a la vez y un aviso de espera. */
  private async run(feedback: HTMLElement, action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    say(feedback, tr('teacherWorking', this.locale));
    try {
      await action();
    } catch (e) {
      say(feedback, this.errorText(e), 'bad');
    } finally {
      this.busy = false;
    }
  }

  private classesButton(back: () => void): HTMLButtonElement | null {
    const { classBackend } = this.options;
    if (!classBackend) return null;
    return button('btn btn-primary', tr('teacherMyClasses', this.locale), () => {
      new ClassPanel(this.root, this.locale, { backend: classBackend, progressBackend: this.options.progressBackend ?? null, onClose: back });
    });
  }

  private signOutButton(backend: TeacherBackend): HTMLButtonElement {
    return button('btn btn-small', tr('teacherSignOut', this.locale), () => {
      void backend.signOut().then(() => this.showLogin(backend));
    });
  }

  private showLogin(backend: TeacherBackend): void {
    const { locale } = this;
    const input = field(tr('teacherEmail', locale), 'email');
    const feedback = status();
    const send = button('btn btn-primary', tr('teacherSendLink', locale), () => {
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        say(feedback, tr('teacherEmailInvalid', locale), 'bad');
        return;
      }
      void this.run(feedback, async () => {
        await backend.sendLoginLink(email, `${window.location.origin}${window.location.pathname}`);
        say(feedback, tr('teacherLinkSent', locale), 'good');
      });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send.click();
    });
    show(this.root, text('panel-title', tr('teacherTitle', locale)), text('panel-feedback', tr('teacherIntro', locale)), input, send, feedback, this.backButton());
  }

  /** Adulto con sesión y sin centro: unirse con un código o dar de alta uno nuevo. */
  private showNoSchool(backend: TeacherBackend): void {
    const { locale } = this;
    const feedback = status(tr('teacherNoSchool', locale));

    const code = field(tr('teacherCodeInput', locale));
    code.maxLength = 12;
    const join = button('btn btn-primary', tr('teacherJoin', locale), () =>
      void this.run(feedback, async () => {
        const school = await backend.joinWithCode(code.value);
        this.showSchool(backend, { name: school.name, role: 'docente' }, `${tr('teacherJoined', locale)} ${school.name}`);
      }),
    );
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') join.click();
    });

    const name = field(tr('teacherSchoolName', locale));
    name.maxLength = 80;
    const accepts = document.createElement('input');
    accepts.type = 'checkbox';
    accepts.id = 'teacher-contract';
    const label = document.createElement('label');
    label.htmlFor = accepts.id;
    label.className = 'panel-feedback';
    label.textContent = tr('teacherContract', locale);
    const link = document.createElement('a');
    link.href = CONTRACT_URL[locale];
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = tr('teacherContractLink', locale);
    const create = button('btn btn-small', tr('teacherCreate', locale), () =>
      void this.run(feedback, async () => {
        const created = await registerSchool(backend, name.value, accepts.checked);
        this.showSchool(backend, { name: created.name, role: 'director' }, tr('teacherCreated', locale), created.code);
      }),
    );

    const joinBox = document.createElement('div');
    joinBox.className = 'column';
    joinBox.append(text('panel-title', tr('teacherJoinTitle', locale)), text('panel-feedback', tr('teacherJoinHelp', locale)), code, join);
    const createBox = document.createElement('div');
    createBox.className = 'column';
    createBox.append(text('panel-title', tr('teacherCreateTitle', locale)), name, accepts, label, link, create);

    const classes = this.classesButton(() => this.showNoSchool(backend));
    show(this.root, text('panel-title', tr('teacherTitle', locale)), feedback, ...(classes ? [classes] : []), joinBox, createBox, this.signOutButton(backend), this.backButton());
  }

  /** Adulto con centro. `message` y `newCode` solo al llegar de unirse, dar de alta o renovar. */
  private showSchool(backend: TeacherBackend, school: SchoolInfo, message?: string, newCode?: string): void {
    const { locale } = this;
    const feedback = status(message ?? '', 'good');
    const nodes: HTMLElement[] = [
      text('panel-title', `${tr('teacherYourSchool', locale)} ${school.name}`),
      text('panel-feedback', tr(school.role === 'director' ? 'teacherRoleDirector' : 'teacherRoleTeacher', locale)),
    ];
    if (newCode) {
      nodes.push(text('panel-title', formatSchoolCode(newCode)), text('panel-feedback', tr('teacherCodeOnce', locale)));
    }
    nodes.push(feedback);
    if (school.role === 'director') {
      nodes.push(
        text('panel-feedback', tr('teacherRotateHelp', locale)),
        button('btn btn-small', tr('teacherRotate', locale), () =>
          void this.run(feedback, async () => {
            const code = await backend.rotateCode();
            this.showSchool(backend, school, tr('teacherNewCode', locale), code);
          }),
        ),
      );
    } else {
      nodes.push(
        button('btn btn-small', tr('teacherLeave', locale), () =>
          void this.run(feedback, async () => {
            await backend.leaveSchool();
            this.showNoSchool(backend);
            const line = this.root.querySelector<HTMLElement>('[role="status"]');
            if (line) say(line, tr('teacherLeft', locale), 'good');
          }),
        ),
      );
    }
    const classes = this.classesButton(() => this.showSchool(backend, school));
    if (classes) nodes.push(classes);
    nodes.push(this.signOutButton(backend), this.backButton());
    show(this.root, ...nodes);
  }
}
