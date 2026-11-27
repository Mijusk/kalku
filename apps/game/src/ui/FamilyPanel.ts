import type { Locale } from '@kalku/exercises';
import { enterAsChildHere, guardianConsent, joinThisDevice, LINK_CODE_LENGTH, MAX_CHILDREN, normalizeLinkCode, toFamilyError, type FamilyBackend, type FamilyChild, type FamilyErrorCode, type SummaryPrefs } from '../family';
import { tr, trf, type StringKey } from '../i18n';
import { NICKNAME_KEY } from '../sync';
import { box, bulletList, button, checkRow, choiceCard, externalLink, say, show, status, stepList, stepTag, text } from './dom';
import { showEmailStep } from './mailStep';

export interface FamilyCallbacks {
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

/** Cómo se une al niño: el de este aparato o el de otro con su código. */
type Joining = { kind: 'here'; nickname: string } | { kind: 'code'; code: string };

/**
 * Cuenta de familia (#47) como pasos guiados: para qué sirve y entrar con el
 * correo → tu familia (hijos, resumen semanal) → añadir un hijo (dónde juega →
 * código si es en otro aparato → permiso del adulto). Nunca enseña un error
 * antes de que el adulto haga algo. Va tras la cuenta de «Zona de adultos».
 */
export class FamilyPanel {
  private busy = false;
  /** Id y apodo del niño de este aparato, si tiene cuenta. */
  private here: { id: string; nickname: string } | null = null;

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: FamilyCallbacks) {
    void this.start();
  }

  private async start(): Promise<void> {
    const { backend } = this.options;
    const { locale } = this;
    if (!backend) {
      show(this.root, text('panel-title', tr('familyIntroTitle', locale)), status(tr('familyUnavailable', locale), 'bad'), this.backButton());
      return;
    }
    show(this.root, text('panel-feedback', tr('familyWorking', locale)));
    try {
      const id = await backend.childId();
      const nickname = localStorage.getItem(NICKNAME_KEY);
      this.here = id && nickname ? { id, nickname } : null;
    } catch {
      this.here = null;
    }
    try {
      if (await backend.adultId()) await this.showHome(backend);
      else this.showIntro(backend);
    } catch {
      this.showIntro(backend);
    }
  }

  private backButton(onClick = () => this.options.onClose()): HTMLButtonElement {
    return button('btn btn-small', tr('back', this.locale), onClick);
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

  /** Sin sesión de adulto: para qué sirve la cuenta y entrar con el correo. */
  private showIntro(backend: FamilyBackend): void {
    const { locale } = this;
    const extra: HTMLElement[] = [];
    const here = this.here;
    if (here) {
      // El adulto quizá usa la cuenta en su móvil: desde aquí solo hace falta el código.
      const feedback = status();
      extra.push(
        box(
          text('panel-note', trf('familyShowCodeHelp', locale, { name: here.nickname })),
          button('btn btn-small', tr('familyShowCode', locale), () => void this.run(feedback, () => this.showDeviceCode(backend, here.nickname, () => this.showIntro(backend)))),
          feedback,
        ),
      );
    }
    showEmailStep(this.root, locale, {
      title: tr('familyIntroTitle', locale),
      benefits: [tr('familyBenefit1', locale), tr('familyBenefit2', locale), tr('familyBenefit3', locale)],
      note: tr('familyNoPassword', locale),
      label: tr('familyEmail', locale),
      sendLabel: tr('familySendLink', locale),
      invalidText: tr('familyEmailInvalid', locale),
      send: (email) => backend.sendLoginLink(email, `${window.location.origin}${window.location.pathname}`),
      errorText: (e) => this.errorText(e),
      extra,
      back: this.backButton(),
    });
  }

  /** El niño de este aparato enseña un código para que lo añada un adulto desde otro aparato. */
  private async showDeviceCode(backend: FamilyBackend, nickname: string, back: () => void): Promise<void> {
    const { locale } = this;
    const code = await backend.createLinkCode();
    show(
      this.root,
      text('panel-title', trf('familyDeviceCodeTitle', locale, { name: nickname })),
      text('big-code', `${code.slice(0, 4)} ${code.slice(4)}`),
      text('panel-note', tr('familyDeviceCodeStep', locale)),
      button('btn btn-primary', tr('familyDone', locale), back),
    );
  }

  /** Con sesión de adulto: sus hijos, añadir otro, resumen semanal y salir. */
  private async showHome(backend: FamilyBackend, message = ''): Promise<void> {
    const { locale } = this;
    const feedback = status(message, message ? 'good' : 'info');
    const children = await backend.listChildren();
    const here = this.here;
    const hereMissing = here !== null && !children.some((c) => c.id === here.id);
    const nodes: HTMLElement[] = [text('panel-title', tr('familyHomeTitle', locale)), feedback];

    if (children.length === 0) {
      nodes.push(box(text('panel-subtitle', tr('familyEmptyTitle', locale)), text('panel-note', tr('familyEmptyText', locale))));
    } else {
      const list = document.createElement('div');
      list.className = 'child-list';
      for (const child of children) list.append(this.childCard(backend, child, feedback));
      nodes.push(list);
    }
    if (hereMissing && here && children.length < MAX_CHILDREN) {
      nodes.push(
        box(
          text('panel-note', trf('familyHereBanner', locale, { name: here.nickname })),
          button('btn btn-primary', trf('familyAddHere', locale, { name: here.nickname }), () => this.showConsent(backend, { kind: 'here', nickname: here.nickname }, null)),
        ),
      );
    }
    if (children.length < MAX_CHILDREN) {
      nodes.push(button(children.length || hereMissing ? 'btn btn-small' : 'btn btn-primary', tr(children.length ? 'familyAddAnother' : 'familyAddChild', locale), () => this.showAddWhere(backend)));
    } else {
      nodes.push(text('panel-note', tr('familyErrFull', locale)));
    }
    const prefs = children.length ? await backend.getSummaryPrefs().catch(() => null) : null;
    if (prefs) nodes.push(this.summaryBox(backend, prefs, feedback));
    const out = button('btn btn-small btn-quiet', tr('familySignOut', locale), () => {
      void backend.signOutAdult().then(() => this.showIntro(backend));
    });
    nodes.push(this.backButton(), out);
    show(this.root, ...nodes);
  }

  private childCard(backend: FamilyBackend, child: FamilyChild, feedback: HTMLElement): HTMLElement {
    const { locale } = this;
    const card = document.createElement('div');
    card.className = 'child-card';
    const badge = document.createElement('span');
    badge.className = 'child-badge';
    badge.textContent = [...child.nickname][0]?.toUpperCase() ?? '?';
    const info = document.createElement('div');
    info.className = 'child-info';
    const name = text('child-name', child.nickname);
    const stats = text(
      'child-stats',
      child.skillsTried ? trf('familyChildStats', locale, { skills: child.skillsTried, mastery: child.averageMastery }) : tr('familyNotPlayed', locale),
    );
    const bar = document.createElement('div');
    bar.className = 'child-bar';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(0, Math.min(100, child.averageMastery))}%`;
    bar.append(fill);
    info.append(name, stats, bar);
    const actions = document.createElement('div');
    actions.className = 'row';
    if (this.here?.id === child.id) actions.append(text('child-here', tr('familyPlayingHere', locale)));
    else {
      actions.append(
        button('btn btn-primary btn-compact', trf('familyPlayAs', locale, { name: child.nickname }), () =>
          void this.run(feedback, async () => {
            say(feedback, tr('familyEntering', locale));
            await enterAsChildHere(backend, localStorage, child.id);
            this.options.onEntered();
          }),
        ),
      );
    }
    actions.append(button('btn btn-small btn-compact', tr('familyOptions', locale), () => this.showChildOptions(backend, child)));
    card.append(badge, info, actions);
    return card;
  }

  /** Paso 1 de añadir: ¿dónde juega? */
  private showAddWhere(backend: FamilyBackend): void {
    const { locale } = this;
    const nodes: HTMLElement[] = [stepTag(trf('setupStep', locale, { n: 1, total: 2 })), text('panel-title', tr('familyAddWhereTitle', locale))];
    const here = this.here;
    if (here) {
      nodes.push(choiceCard(tr('familyAddWhereHere', locale), trf('familyAddWhereHereText', locale, { name: here.nickname }), () => this.showConsent(backend, { kind: 'here', nickname: here.nickname }, () => this.showAddWhere(backend))));
    }
    nodes.push(
      choiceCard(tr('familyAddWhereOther', locale), tr('familyAddWhereOtherText', locale), () => this.showAddCode(backend), 'blue'),
      text('panel-note', tr('familyAddWhereNew', locale)),
      this.backButton(() => void this.showHome(backend)),
    );
    show(this.root, ...nodes);
  }

  /** Paso 1 bis: los pasos en el aparato del niño y el código. «Siguiente» solo con 8 letras. */
  private showAddCode(backend: FamilyBackend, initial = ''): void {
    const { locale } = this;
    const input = document.createElement('input');
    input.className = 'nickname-input code-input';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.maxLength = 12;
    input.value = initial;
    input.setAttribute('aria-label', tr('familyCodeInput', locale));
    input.placeholder = tr('familyCodeInput', locale);
    const next = button('btn btn-primary', tr('familyNext', locale), () => {
      const code = normalizeLinkCode(input.value);
      if (code.length === LINK_CODE_LENGTH) this.showConsent(backend, { kind: 'code', code }, () => this.showAddCode(backend, code));
    });
    const refresh = (): void => {
      next.disabled = normalizeLinkCode(input.value).length !== LINK_CODE_LENGTH;
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') next.click();
    });
    refresh();
    show(
      this.root,
      stepTag(trf('setupStep', locale, { n: 1, total: 2 })),
      text('panel-title', tr('familyCodeTitle', locale)),
      stepList([tr('familyCodeStep1', locale), tr('familyCodeStep2', locale), tr('familyCodeStep3', locale), tr('familyCodeStep4', locale)]),
      input,
      next,
      this.backButton(() => this.showAddWhere(backend)),
    );
  }

  /** Paso 2: el permiso del adulto, explicado. El botón solo se activa al marcar la casilla. */
  private showConsent(backend: FamilyBackend, joining: Joining, back: (() => void) | null): void {
    const { locale } = this;
    const { row, input } = checkRow('family-consent', tr('familyConsent', locale));
    const feedback = status();
    const go = button('btn btn-primary', tr('familyConsentGo', locale), () =>
      void this.run(feedback, async () => {
        const consent = guardianConsent(input.checked);
        const nickname = joining.kind === 'here' ? await joinThisDevice(backend, consent) : (await backend.joinWithCode(joining.code, consent)).nickname;
        const name = nickname || (joining.kind === 'here' ? joining.nickname : '');
        await this.showHome(backend, name ? trf('familyAddedTitle', locale, { name }) : tr('familySummarySaved', locale));
      }),
    );
    const refresh = (): void => {
      go.disabled = !input.checked;
    };
    input.addEventListener('change', refresh);
    refresh();
    show(
      this.root,
      stepTag(trf('setupStep', locale, { n: 2, total: 2 })),
      text('panel-title', tr('familyConsentTitle', locale)),
      text('panel-note', tr('familyConsentWhy', locale)),
      bulletList([tr('familyConsentSave', locale)], 'yes'),
      bulletList([tr('familyConsentNot', locale)], 'no'),
      text('panel-note', tr('familyConsentProof', locale)),
      externalLink(`/privacidad.html?lang=${locale}`, tr('familyPrivacyLink', locale)),
      row,
      go,
      feedback,
      this.backButton(back ?? (() => void this.showHome(backend))),
    );
    // Lo primero que se lee es la explicación, no la casilla.
    this.root.scrollTop = 0;
  }

  /** Opciones de un hijo: quitarlo de la familia (no borra) o retirar el permiso (borra todo). */
  private showChildOptions(backend: FamilyBackend, child: FamilyChild): void {
    const { locale } = this;
    const feedback = status();
    show(
      this.root,
      text('panel-title', trf('familyOptionsTitle', locale, { name: child.nickname })),
      box(
        text('panel-note', tr('familyRemoveText', locale)),
        button('btn btn-small', tr('familyRemove', locale), () =>
          void this.run(feedback, async () => {
            await backend.leave(child.id);
            await this.showHome(backend, tr('familyRemoved', locale));
          }),
        ),
      ),
      box(text('panel-note', trf('familyWithdrawHelp', locale, { name: child.nickname })), button('btn btn-small btn-danger', tr('familyWithdraw', locale), () => this.showWithdraw(backend, child))),
      feedback,
      this.backButton(() => void this.showHome(backend)),
    );
  }

  /** Resumen semanal por correo (#56): activar o desactivar y elegir idioma. Se guarda al cambiar. */
  private summaryBox(backend: FamilyBackend, initial: SummaryPrefs, feedback: HTMLElement): HTMLElement {
    const { locale } = this;
    const prefs = { ...initial };
    const { row, input: check } = checkRow('family-summary', tr('familySummary', locale));
    check.checked = prefs.enabled;
    const select = document.createElement('select');
    select.className = 'panel-select';
    select.setAttribute('aria-label', tr('familySummaryLanguage', locale));
    for (const [value, name] of [['es', 'Castellano'], ['ca', 'Català']] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      select.append(option);
    }
    select.value = prefs.locale;
    const save = (): void => {
      const next: SummaryPrefs = { enabled: check.checked, locale: select.value === 'ca' ? 'ca' : 'es' };
      void this.run(feedback, async () => {
        await backend.setSummaryPrefs(next);
        Object.assign(prefs, next);
        say(feedback, tr('familySummarySaved', locale), 'good');
      }).then(() => {
        // Si falló, la casilla vuelve a lo que de verdad tiene el servidor.
        check.checked = prefs.enabled;
        select.value = prefs.locale;
      });
    };
    check.addEventListener('change', save);
    select.addEventListener('change', save);
    const language = document.createElement('label');
    language.className = 'select-row';
    language.append(text('panel-note', tr('familySummaryLanguage', locale)), select);
    return box(text('panel-subtitle', tr('familySummaryTitle', locale)), text('panel-note', tr('familySummaryNote', locale)), row, language);
  }

  private showWithdraw(backend: FamilyBackend, child: FamilyChild): void {
    const { locale } = this;
    const feedback = status('', 'bad');
    feedback.setAttribute('role', 'alert');
    const yes = button('btn btn-small btn-danger', tr('familyWithdrawYes', locale), () =>
      void this.run(feedback, async () => {
        await backend.withdrawConsent(child.id);
        await this.showHome(backend, tr('familyWithdrawn', locale));
      }),
    );
    const no = button('btn btn-primary', tr('familyWithdrawNo', locale), () => this.showChildOptions(backend, child));
    show(this.root, text('panel-title', tr('familyWithdrawTitle', locale)), text('panel-feedback', `${child.nickname}: ${tr('familyWithdrawText', locale)}`), feedback, no, yes);
    no.focus();
  }
}
