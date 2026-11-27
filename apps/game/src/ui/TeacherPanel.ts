import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { CONTRACT_URL, formatSchoolCode, loadTeacherView, registerSchool, toTeacherError, type SchoolInfo, type TeacherBackend } from '../teacher';
import type { ClassBackend } from '../classes';
import { ClassPanel } from './ClassPanel';
import type { ClassProgressBackend } from '../classProgress';
import { ERROR_TEXT } from './teacherErrors';
import { box, button, checkRow, choiceCard, externalLink, say, show, status, text } from './dom';
import { showEmailStep } from './mailStep';

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
    showEmailStep(this.root, locale, {
      title: tr('teacherIntroTitle', locale),
      benefits: [tr('teacherBenefit1', locale), tr('teacherBenefit2', locale), tr('teacherBenefit3', locale)],
      note: tr('teacherNoPassword', locale),
      label: tr('teacherEmail', locale),
      sendLabel: tr('teacherSendLink', locale),
      invalidText: tr('teacherEmailInvalid', locale),
      send: (email) => backend.sendLoginLink(email, `${window.location.origin}${window.location.pathname}`),
      errorText: (e) => this.errorText(e),
      back: this.backButton(),
    });
  }

  /** Adulto con sesión y sin centro: tres caminos, cada uno en su pantalla. */
  private showNoSchool(backend: TeacherBackend, message = ''): void {
    const { locale } = this;
    const nodes: HTMLElement[] = [text('panel-title', tr('teacherStartTitle', locale)), status(message, 'good')];
    nodes.push(
      choiceCard(tr('teacherStartJoin', locale), tr('teacherStartJoinText', locale), () => this.showJoin(backend)),
      choiceCard(tr('teacherStartCreate', locale), tr('teacherStartCreateText', locale), () => this.showCreate(backend), 'blue'),
    );
    const { classBackend } = this.options;
    if (classBackend) {
      nodes.push(
        choiceCard(tr('teacherStartTry', locale), tr('teacherStartTryText', locale), () =>
          new ClassPanel(this.root, locale, { backend: classBackend, progressBackend: this.options.progressBackend ?? null, onClose: () => this.showNoSchool(backend) }), 'gold'),
      );
    }
    nodes.push(this.signOutButton(backend), this.backButton());
    show(this.root, ...nodes);
  }

  /** Unirse al centro con el código que da la dirección. */
  private showJoin(backend: TeacherBackend): void {
    const { locale } = this;
    const feedback = status();
    const code = field(tr('teacherCodeInput', locale));
    code.classList.add('code-input');
    code.maxLength = 12;
    const join = button('btn btn-primary', tr('teacherJoin', locale), () => {
      if (code.value.trim() === '') return;
      void this.run(feedback, async () => {
        const school = await backend.joinWithCode(code.value);
        this.showSchool(backend, { name: school.name, role: 'docente' }, `${tr('teacherJoined', locale)} ${school.name}`);
      });
    });
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') join.click();
    });
    show(this.root, text('panel-title', tr('teacherJoinTitle', locale)), text('panel-note', tr('teacherJoinHelp', locale)), code, join, feedback, button('btn btn-small', tr('back', locale), () => this.showNoSchool(backend)));
  }

  /** Dar de alta el centro: nombre y aceptar el contrato (el botón solo se activa al marcarlo). */
  private showCreate(backend: TeacherBackend): void {
    const { locale } = this;
    const feedback = status();
    const name = field(tr('teacherSchoolName', locale));
    name.maxLength = 80;
    const { row, input: accepts } = checkRow('teacher-contract', tr('teacherContract', locale));
    const create = button('btn btn-primary', tr('teacherCreate', locale), () =>
      void this.run(feedback, async () => {
        const created = await registerSchool(backend, name.value, accepts.checked);
        this.showSchool(backend, { name: created.name, role: 'director' }, tr('teacherCreated', locale), created.code);
      }),
    );
    const refresh = (): void => {
      create.disabled = !accepts.checked || name.value.trim() === '';
    };
    accepts.addEventListener('change', refresh);
    name.addEventListener('input', refresh);
    refresh();
    show(
      this.root,
      text('panel-title', tr('teacherCreateTitle', locale)),
      text('panel-note', tr('teacherCreateHelp', locale)),
      name,
      externalLink(CONTRACT_URL[locale], tr('teacherContractLink', locale)),
      row,
      create,
      feedback,
      button('btn btn-small', tr('back', locale), () => this.showNoSchool(backend)),
    );
  }

  /** Adulto con centro. `message` y `newCode` solo al llegar de unirse, dar de alta o renovar. */
  private showSchool(backend: TeacherBackend, school: SchoolInfo, message?: string, newCode?: string): void {
    const { locale } = this;
    const feedback = status(message ?? '', 'good');
    const nodes: HTMLElement[] = [
      text('panel-title', `${tr('teacherYourSchool', locale)} ${school.name}`),
      text('step-tag', tr(school.role === 'director' ? 'teacherRoleDirector' : 'teacherRoleTeacher', locale)),
      feedback,
    ];
    if (newCode) nodes.push(box(text('big-code', formatSchoolCode(newCode)), text('panel-note', tr('teacherCodeOnce', locale))));
    const classes = this.classesButton(() => this.showSchool(backend, school));
    if (classes) nodes.push(classes);
    nodes.push(button('btn btn-small', tr('teacherMore', locale), () => this.showSchoolOptions(backend, school)), this.backButton());
    show(this.root, ...nodes);
  }

  /** Lo que se usa poco: renovar el código (dirección), dejar el centro (docente) y cerrar sesión. */
  private showSchoolOptions(backend: TeacherBackend, school: SchoolInfo): void {
    const { locale } = this;
    const feedback = status();
    const nodes: HTMLElement[] = [text('panel-title', tr('teacherMore', locale)), feedback];
    if (school.role === 'director') {
      nodes.push(
        box(
          text('panel-note', tr('teacherRotateHelp', locale)),
          button('btn btn-small', tr('teacherRotate', locale), () =>
            void this.run(feedback, async () => {
              const code = await backend.rotateCode();
              this.showSchool(backend, school, tr('teacherNewCode', locale), code);
            }),
          ),
        ),
      );
    } else {
      nodes.push(
        button('btn btn-small', tr('teacherLeave', locale), () =>
          void this.run(feedback, async () => {
            await backend.leaveSchool();
            this.showNoSchool(backend, tr('teacherLeft', locale));
          }),
        ),
      );
    }
    nodes.push(this.signOutButton(backend), button('btn btn-small', tr('back', locale), () => this.showSchool(backend, school)));
    show(this.root, ...nodes);
  }
}
