import type { Locale } from '@kalku/exercises';
import { enterAsChildHere, guardianConsent, joinThisDevice, MAX_CHILDREN, toFamilyError, type FamilyBackend, type FamilyChild, type FamilyErrorCode } from '../family';
import { tr, type StringKey } from '../i18n';
import { button, say, show, status, text } from './dom';

export interface FamilyCallbacks {
  /** Hay un niño con cuenta en este aparato (desde el juego, no desde la pantalla de apodo). */
  hasChildHere: boolean;
  /** `null` sin servidor: el panel solo avisa. */
  backend: FamilyBackend | null;
  onClose(): void;
  /** El adulto entró como un niño: el juego se recarga con su sesión. */
  onEntered(): void;
}

const ERROR_TEXT: Record<FamilyErrorCode, StringKey> = {
  'invalid-code': 'familyErrInvalidCode',
  'child-in-family': 'familyErrInFamily',
  'family-full': 'familyErrFull',
  'not-adult': 'familyErrNotAdult',
  'not-in-family': 'familyErrNetwork',
  'no-child': 'familyErrNoChild',
  'email-not-confirmed': 'familyErrEmailNotConfirmed',
  'consent-required': 'familyErrConsent',
  network: 'familyErrNetwork',
};

/** Cuenta de familia (#47): entrar con enlace de correo, unir niños y entrar como uno de ellos. Va tras la cuenta de «Para adultos». */
export class FamilyPanel {
  private busy = false;

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: FamilyCallbacks) {
    void this.start();
  }

  private async start(): Promise<void> {
    const { backend } = this.options;
    const { locale } = this;
    if (!backend) {
      show(this.root, text('panel-title', tr('familyTitle', locale)), status(tr('familyUnavailable', locale), 'bad'), this.backButton());
      return;
    }
    try {
      if (await backend.adultId()) await this.showFamily(backend);
      else this.showLogin(backend);
    } catch {
      this.showLogin(backend);
    }
  }

  private backButton(): HTMLButtonElement {
    return button('btn btn-small', tr('back', this.locale), () => this.options.onClose());
  }

  private errorText(e: unknown): string {
    return tr(ERROR_TEXT[toFamilyError(e).code], this.locale);
  }

  /** Corre una acción larga con un solo clic a la vez y un aviso de espera. */
  private async run(feedback: HTMLElement, action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    say(feedback, tr('familyWorking', this.locale));
    try {
      await action();
    } catch (e) {
      say(feedback, this.errorText(e), 'bad');
    } finally {
      this.busy = false;
    }
  }

  private showLogin(backend: FamilyBackend): void {
    const { locale } = this;
    const input = document.createElement('input');
    input.type = 'email';
    input.className = 'nickname-input';
    input.autocomplete = 'email';
    input.setAttribute('aria-label', tr('familyEmail', locale));
    input.placeholder = tr('familyEmail', locale);
    const feedback = status();
    const send = button('btn btn-primary', tr('familySendLink', locale), () => {
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        say(feedback, tr('familyEmailInvalid', locale), 'bad');
        return;
      }
      void this.run(feedback, async () => {
        await backend.sendLoginLink(email, `${window.location.origin}${window.location.pathname}`);
        say(feedback, tr('familyLinkSent', locale), 'good');
      });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send.click();
    });
    const nodes = [text('panel-title', tr('familyTitle', locale)), text('panel-feedback', tr('familyIntro', locale)), input, send, feedback];
    if (this.options.hasChildHere) nodes.push(this.codeButton(backend, feedback));
    show(this.root, ...nodes, this.backButton());
  }

  /** El niño de este aparato enseña un código para que lo una un adulto en otro aparato. */
  private codeButton(backend: FamilyBackend, feedback: HTMLElement): HTMLButtonElement {
    const { locale } = this;
    return button('btn btn-small', tr('familyShowCode', locale), () =>
      void this.run(feedback, async () => {
        const code = await backend.createLinkCode();
        show(this.root, text('panel-title', tr('familyShowCode', locale)), text('panel-feedback', tr('familyCodeText', locale)), text('panel-title', `${code.slice(0, 4)} ${code.slice(4)}`), this.backButton());
      }),
    );
  }

  private async showFamily(backend: FamilyBackend): Promise<void> {
    const { locale } = this;
    const feedback = status();
    const children = await backend.listChildren();
    const list = document.createElement('div');
    list.className = 'column';
    for (const child of children) list.append(this.childRow(backend, child, feedback));

    const code = document.createElement('input');
    code.className = 'nickname-input';
    code.autocomplete = 'off';
    code.maxLength = 12;
    code.setAttribute('aria-label', tr('familyCodeInput', locale));
    code.placeholder = tr('familyCodeInput', locale);
    const consent = this.consentBox();
    const join = button('btn btn-small', tr('familyJoin', locale), () =>
      void this.run(feedback, async () => {
        await backend.joinWithCode(code.value, guardianConsent(consent.input.checked));
        await this.showFamily(backend);
      }),
    );
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') join.click();
    });
    const out = button('btn btn-small', tr('familySignOut', locale), () => {
      void backend.signOutAdult().then(() => this.showLogin(backend));
    });

    const nodes: HTMLElement[] = [
      text('panel-title', `${tr('familyChildren', locale)} (${children.length}/${MAX_CHILDREN})`),
      children.length ? list : text('panel-feedback', tr('familyNoChildren', locale)),
    ];
    if (this.options.hasChildHere) {
      nodes.push(
        button('btn btn-primary', tr('familyJoinHere', locale), () =>
          void this.run(feedback, async () => {
            const nickname = await joinThisDevice(backend, guardianConsent(consent.input.checked));
            await this.showFamily(backend);
            const line = this.root.querySelector<HTMLElement>('[role="status"]');
            if (line) say(line, `${tr('familyJoined', locale)} ${nickname}`, 'good');
          }),
        ),
      );
    }
    nodes.splice(2, 0, consent.box);
    nodes.push(code, join, feedback, out, this.backButton());
    show(this.root, ...nodes);
  }

  /** Casilla «Soy su madre, padre o tutor…» con el enlace a la política: sin marcarla, el servidor no une. */
  private consentBox(): { box: HTMLElement; input: HTMLInputElement } {
    const { locale } = this;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'family-consent';
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.className = 'panel-feedback';
    label.textContent = tr('familyConsent', locale);
    const link = document.createElement('a');
    link.href = `/privacidad.html?lang=${locale}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = tr('familyPrivacyLink', locale);
    const box = document.createElement('div');
    box.className = 'column';
    box.append(input, label, link, text('panel-feedback', tr('familyConsentNote', locale)));
    return { box, input };
  }

  private showWithdraw(backend: FamilyBackend, child: FamilyChild): void {
    const { locale } = this;
    const feedback = status('', 'bad');
    feedback.setAttribute('role', 'alert');
    const yes = button('btn btn-small', tr('familyWithdrawYes', locale), () =>
      void this.run(feedback, async () => {
        await backend.withdrawConsent(child.id);
        await this.showFamily(backend);
        const line = this.root.querySelector<HTMLElement>('[role="status"]');
        if (line) say(line, tr('familyWithdrawn', locale), 'good');
      }),
    );
    const no = button('btn btn-primary', tr('familyWithdrawNo', locale), () => void this.showFamily(backend));
    show(this.root, text('panel-title', tr('familyWithdrawTitle', locale)), text('panel-feedback', `${child.nickname}: ${tr('familyWithdrawText', locale)}`), feedback, yes, no);
    no.focus();
  }

  private childRow(backend: FamilyBackend, child: FamilyChild, feedback: HTMLElement): HTMLElement {
    const { locale } = this;
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      text('panel-feedback', `${child.nickname} · ${child.skillsTried} ${tr('familySkills', locale)} · ${tr('mastery', locale)} ${child.averageMastery}`),
      button('btn btn-primary', `${tr('familyEnterAs', locale)} ${child.nickname}`, () =>
        void this.run(feedback, async () => {
          say(feedback, tr('familyEntering', locale));
          await enterAsChildHere(backend, localStorage, child.id);
          this.options.onEntered();
        }),
      ),
      button('btn btn-small', tr('familyWithdraw', locale), () => this.showWithdraw(backend, child)),
      button('btn btn-small', tr('familyRemove', locale), () =>
        void this.run(feedback, async () => {
          await backend.leave(child.id);
          await this.showFamily(backend);
          const line = this.root.querySelector<HTMLElement>('[role="status"]');
          if (line) say(line, tr('familyRemoved', locale), 'good');
        }),
      ),
    );
    return row;
  }
}
