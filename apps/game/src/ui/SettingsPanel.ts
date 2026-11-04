import { tr } from '../i18n';
import type { PlayerProgress } from '../progress';

export interface SettingsCallbacks {
  /** Se llama tras cada cambio, con `progress` ya modificado. */
  onChange(): void;
  onClose(): void;
}

/** Pantalla de ajustes en HTML. Botones de 48 px o más; cada cambio se aplica al instante. */
export class SettingsPanel {
  private readonly root: HTMLElement;

  constructor(container: HTMLElement, private readonly progress: PlayerProgress, private readonly callbacks: SettingsCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'settings';
    this.root.setAttribute('role', 'dialog');
    container.append(this.root);
    this.render();
    this.root.querySelector('button')?.focus();
  }

  private render(): void {
    const { progress } = this;
    const locale = progress.locale;
    const s = progress.settings;
    const change = (apply: () => void) => () => {
      // Al repintar se sustituyen los botones: devolvemos el foco al equivalente.
      const buttons = Array.from(this.root.querySelectorAll('button'));
      const focused = buttons.indexOf(document.activeElement as HTMLButtonElement);
      apply();
      this.callbacks.onChange();
      this.render();
      if (focused >= 0) this.root.querySelectorAll('button')[focused]?.focus();
    };

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn-primary';
    close.textContent = tr('back', locale);
    close.addEventListener('click', () => {
      this.root.remove();
      this.callbacks.onClose();
    });

    this.root.replaceChildren(
      title(tr('settings', locale)),
      item(tr('languageLabel', locale), [
        choice('Castellano', progress.locale === 'es', change(() => (progress.locale = 'es'))),
        choice('Català', progress.locale === 'ca', change(() => (progress.locale = 'ca'))),
      ]),
      item(tr('timer', locale), [
        choice(tr('on', locale), s.timed, change(() => (s.timed = true))),
        choice(tr('off', locale), !s.timed, change(() => (s.timed = false))),
      ]),
      item(tr('textSize', locale), [
        choice(tr('normal', locale), s.textSize === 'normal', change(() => (s.textSize = 'normal'))),
        choice(tr('large', locale), s.textSize === 'large', change(() => (s.textSize = 'large'))),
      ]),
      item(tr('autoVoice', locale), [
        choice(tr('on', locale), s.autoVoice, change(() => (s.autoVoice = true))),
        choice(tr('off', locale), !s.autoVoice, change(() => (s.autoVoice = false))),
      ]),
      close,
    );
  }
}

function title(text: string): HTMLElement {
  const h = document.createElement('p');
  h.className = 'panel-title';
  h.textContent = text;
  return h;
}

let itemCount = 0;

function item(label: string, buttons: HTMLElement[]): HTMLElement {
  const node = document.createElement('div');
  node.className = 'settings-item';
  const l = document.createElement('span');
  l.className = 'settings-label';
  l.id = `settings-label-${itemCount++}`;
  l.textContent = label;
  const row = document.createElement('div');
  row.className = 'row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-labelledby', l.id);
  row.append(...buttons);
  node.append(l, row);
  return node;
}

function choice(label: string, selected: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-small';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(selected));
  b.addEventListener('click', onClick);
  return b;
}

