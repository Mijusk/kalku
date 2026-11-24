import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { appBackend, deleteChildData, exportChildData } from '../sync';
import { appFamilyBackend } from '../family';
import { button, showAdultGate, show, text } from './dom';
import { FamilyPanel } from './FamilyPanel';

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
    show(this.root, ...nodes);
  }

  private showGate(): void {
    showAdultGate(this.root, this.locale, () => this.showMenu(), () => this.callbacks.onClose());
  }

  private showMenu(message = '', kind = 'info'): void {
    const { locale } = this;
    const feedback = text('panel-feedback', message);
    feedback.setAttribute('role', 'status');
    feedback.dataset.kind = kind;
    const download = button('btn btn-primary', tr('adultsDownload', locale), () => void this.download(feedback));
    const family = button('btn btn-primary', tr('familyTitle', locale), () => this.showFamily());
    const del = button('btn btn-small', tr('adultsDelete', locale), () => this.showConfirm());
    const back = button('btn btn-small', tr('back', locale), () => this.callbacks.onClose());
    this.show(text('panel-title', tr('adults', locale)), text('panel-feedback', tr('adultsExpiry', locale)), family, download, del, feedback, back);
  }

  private showFamily(): void {
    new FamilyPanel(this.root, this.locale, {
      hasChildHere: true,
      backend: appFamilyBackend(),
      onClose: () => this.showMenu(),
      // Entró como otro niño: se recarga el juego con su sesión y su progreso.
      onEntered: () => window.location.reload(),
    });
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
