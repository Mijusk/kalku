import Phaser from 'phaser';
import { tr, trf } from '../i18n';
import { NICKNAME_MAX, NICKNAMES, checkNickname } from '../nickname';
import { applySettings, loadProgress, type PlayerProgress } from '../progress';
import { createAccount, startSyncWithTimeout } from '../sync';
import { goToStory } from '../storyFlow';
import { stepTag } from '../ui/dom';

/**
 * Pantalla de apodo (#45): la única cosa que escribe el niño para tener cuenta.
 * Se elige de una lista o se escribe; si parece nombre y apellido, solo se avisa.
 */
export class NicknameScene extends Phaser.Scene {
  constructor() {
    super('nickname');
  }

  create(): void {
    const progress = loadProgress();
    applySettings(progress.settings);
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    const root = document.createElement('div');
    root.className = 'settings';
    ui.append(root);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.remove());
    this.render(root, progress);
  }

  private render(root: HTMLElement, progress: PlayerProgress): void {
    const locale = progress.locale;
    let busy = false;

    const text = (className: string, content: string): HTMLElement => {
      const p = document.createElement('p');
      p.className = className;
      p.textContent = content;
      return p;
    };

    const warning = text('panel-feedback', '');
    warning.setAttribute('role', 'status');
    warning.dataset.kind = 'info';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nickname-input';
    input.maxLength = NICKNAME_MAX + 10;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', tr('nicknameInput', locale));
    input.placeholder = tr('nicknameInput', locale);

    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn btn-primary';
    go.textContent = tr('nicknameGo', locale);

    const refresh = (): void => {
      const check = checkNickname(input.value);
      go.disabled = !check.ok || busy;
      const tooLong = [...check.nickname].length > NICKNAME_MAX;
      warning.textContent = tooLong ? tr('nicknameTooLong', locale) : check.looksLikeName ? tr('nicknameNameWarning', locale) : '';
    };
    input.addEventListener('input', refresh);

    const submit = async (): Promise<void> => {
      const check = checkNickname(input.value);
      if (!check.ok || busy) return;
      busy = true;
      refresh();
      await createAccount(check.nickname);
      await startSyncWithTimeout();
      await goToStory(this);
    };
    go.addEventListener('click', () => void submit());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void submit();
    });

    const choices = document.createElement('div');
    choices.className = 'row';
    choices.setAttribute('role', 'group');
    for (const n of NICKNAMES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-small';
      b.textContent = n[locale];
      b.addEventListener('click', () => {
        input.value = n[locale];
        refresh();
        input.focus();
      });
      choices.append(b);
    }

    // Entrar con la clase o como hijo de una familia se hace desde la pantalla de inicio: aquí solo el apodo.
    root.replaceChildren(stepTag(trf('setupStep', locale, { n: 2, total: 3 })), text('panel-title', tr('nicknameTitle', locale)), text('panel-feedback', tr('nicknameHint', locale)), choices, input, warning, go);
    refresh();
  }
}
