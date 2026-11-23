import { randomSeed, type Locale } from '@kalku/exercises';
import { checkAdultGate, createAdultGate } from '../adultGate';
import { tr } from '../i18n';
import { appBackend, deleteChildData, exportChildData } from '../sync';

export interface AdultsCallbacks {
  /** Vuelve a los ajustes. */
  onClose(): void;
  /** Se borró todo (servidor y aparato). */
  onDeleted(): void;
}

/**
 * «Para adultos» (#50): descargar los datos del niño en JSON y borrarlos.
 * Va tras una cuenta que un niño no resuelva de cabeza (solo evita accidentes).
 */
export class AdultsPanel {
  private busy = false;

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly callbacks: AdultsCallbacks) {
    this.showGate();
  }

  private show(...nodes: HTMLElement[]): void {
    this.root.replaceChildren(...nodes);
    this.root.querySelector<HTMLElement>('input, button')?.focus();
  }

  private showGate(): void {
    const { locale } = this;
    const gate = createAdultGate(randomSeed());
    const input = document.createElement('input');
    input.className = 'nickname-input';
    input.inputMode = 'numeric';
    input.setAttribute('aria-label', tr('adultsGateAnswer', locale));
    input.placeholder = tr('adultsGateAnswer', locale);
    const feedback = text('panel-feedback', '');
    feedback.setAttribute('role', 'status');
    const enter = button('btn btn-primary', tr('adultsEnter', locale), () => {
      if (checkAdultGate(gate, input.value)) this.showMenu();
      else {
        feedback.textContent = tr('adultsGateWrong', locale);
        feedback.dataset.kind = 'bad';
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enter.click();
    });
    const back = button('btn btn-small', tr('back', locale), () => this.callbacks.onClose());
    this.show(text('panel-title', tr('adultsGateTitle', locale)), text('panel-feedback', tr('adultsGateHint', locale)), text('panel-title', `${gate.a} × ${gate.b}`), input, feedback, enter, back);
  }

  private showMenu(message = '', kind = 'info'): void {
    const { locale } = this;
    const feedback = text('panel-feedback', message);
    feedback.setAttribute('role', 'status');
    feedback.dataset.kind = kind;
    const download = button('btn btn-primary', tr('adultsDownload', locale), () => void this.download(feedback));
    const del = button('btn btn-small', tr('adultsDelete', locale), () => this.showConfirm());
    const back = button('btn btn-small', tr('back', locale), () => this.callbacks.onClose());
    this.show(text('panel-title', tr('adults', locale)), download, del, feedback, back);
  }

  private showConfirm(message = ''): void {
    const { locale } = this;
    const feedback = text('panel-feedback', message);
    feedback.setAttribute('role', 'alert');
    feedback.dataset.kind = 'bad';
    const yes = button('btn btn-small', tr('adultsConfirmYes', locale), () => void this.remove(yes, feedback));
    const no = button('btn btn-primary', tr('adultsConfirmNo', locale), () => this.showMenu());
    // Lo seguro (volver) es lo que recibe el foco.
    this.root.replaceChildren(text('panel-title', tr('adultsConfirmTitle', locale)), text('panel-feedback', tr('adultsConfirmText', locale)), feedback, yes, no);
    no.focus();
  }

  private async download(feedback: HTMLElement): Promise<void> {
    const b = appBackend();
    if (!b || this.busy) return;
    this.busy = true;
    try {
      const json = await exportChildData(b);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kalku-datos.json';
      a.click();
      URL.revokeObjectURL(url);
      feedback.textContent = tr('adultsDownloaded', this.locale);
      feedback.dataset.kind = 'good';
    } catch {
      feedback.textContent = tr('adultsDownloadFailed', this.locale);
      feedback.dataset.kind = 'bad';
    } finally {
      this.busy = false;
    }
  }

  private async remove(yes: HTMLButtonElement, feedback: HTMLElement): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    yes.disabled = true;
    feedback.textContent = tr('adultsDeleting', this.locale);
    try {
      const b = appBackend();
      if (b) await deleteChildData(b, localStorage);
      else for (const key of Object.keys(localStorage).filter((k) => k.startsWith('kalku:'))) localStorage.removeItem(key);
      this.callbacks.onDeleted();
    } catch {
      // El servidor no confirmó: no se toca nada y se dice.
      this.busy = false;
      this.showConfirm(tr('adultsDeleteFailed', this.locale));
    }
  }
}

function text(className: string, content: string): HTMLElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = content;
  return p;
}

function button(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
