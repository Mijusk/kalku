import type { Locale } from '@kalku/exercises';
import { tr as t, trf } from '../i18n';
import { appBackend, deleteChildData, exportChildData, NICKNAME_KEY } from '../sync';
import { appFamilyBackend } from '../family';
import { box, button, choiceCard, showAdultGate, show, text } from './dom';
import { FamilyPanel } from './FamilyPanel';

export interface AdultsCallbacks {
  /** Vuelve a los ajustes. */
  onClose(): void;
  /** Se borró todo (servidor y aparato). */
  onDeleted(): void;
}

/**
 * Zona de adultos: un solo sitio para familias, docentes, los datos de este
 * aparato (#50: descargar en JSON y borrar) y la privacidad. Se llega desde la
 * pantalla de inicio y desde Ajustes, tras una cuenta que un niño no resuelva
 * de cabeza (solo evita accidentes).
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

  private showMenu(): void {
    const { locale } = this;
    const nickname = localStorage.getItem(NICKNAME_KEY);
    const nodes: HTMLElement[] = [
      text('panel-title', t('adultsHubTitle', locale)),
      text('panel-feedback', t('adultsHubIntro', locale)),
      choiceCard(t('adultsFamilyCard', locale), t('adultsFamilyCardText', locale), () => this.showFamily()),
      choiceCard(t('adultsTeacherCard', locale), t('adultsTeacherCardText', locale), () => window.location.assign(`/docentes.html?lang=${locale}`), 'blue'),
    ];
    if (nickname) nodes.push(choiceCard(t('adultsDataCard', locale), t('adultsDataCardText', locale), () => this.showData(nickname), 'gold'));
    nodes.push(
      choiceCard(t('adultsPrivacyCard', locale), t('adultsPrivacyCardText', locale), () => window.open(`/privacidad.html?lang=${locale}`, '_blank', 'noopener'), 'grey'),
      button('btn btn-small', t('back', locale), () => this.callbacks.onClose()),
    );
    this.show(...nodes);
  }

  /** Datos de este aparato: descargar o borrar la partida, con lo que pasa si nadie da permiso. */
  private showData(nickname: string, message = '', kind = 'info'): void {
    const { locale } = this;
    const feedback = text('panel-feedback', message);
    feedback.setAttribute('role', 'status');
    feedback.dataset.kind = kind;
    const download = button('btn btn-primary', t('adultsDownload', locale), () => void this.download(feedback));
    const del = button('btn btn-small btn-danger', t('adultsDelete', locale), () => this.showConfirm());
    const back = button('btn btn-small', t('back', locale), () => this.showMenu());
    this.show(text('panel-title', t('adultsDataCard', locale)), text('panel-feedback', trf('adultsDataIntro', locale, { name: nickname })), box(text('panel-note', t('adultsExpiry', locale))), download, del, feedback, back);
  }

  private showFamily(): void {
    new FamilyPanel(this.root, this.locale, {
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
    const yes = button('btn btn-small btn-danger', t('adultsConfirmYes', locale), () => void this.remove(yes, feedback));
    const no = button('btn btn-primary', t('adultsConfirmNo', locale), () => this.showData(localStorage.getItem(NICKNAME_KEY) ?? ''));
    // Lo seguro (volver) es lo que recibe el foco.
    this.root.replaceChildren(text('panel-title', t('adultsConfirmTitle', locale)), text('panel-feedback', t('adultsConfirmText', locale)), feedback, yes, no);
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
      feedback.textContent = t('adultsDownloaded', this.locale);
      feedback.dataset.kind = 'good';
    } catch {
      feedback.textContent = t('adultsDownloadFailed', this.locale);
      feedback.dataset.kind = 'bad';
    } finally {
      this.busy = false;
    }
  }

  private async remove(yes: HTMLButtonElement, feedback: HTMLElement): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    yes.disabled = true;
    feedback.textContent = t('adultsDeleting', this.locale);
    try {
      const b = appBackend();
      if (b) await deleteChildData(b, localStorage);
      else for (const key of Object.keys(localStorage).filter((k) => k.startsWith('kalku:'))) localStorage.removeItem(key);
      this.callbacks.onDeleted();
    } catch {
      // El servidor no confirmó: no se toca nada y se dice.
      this.busy = false;
      this.showConfirm(t('adultsDeleteFailed', this.locale));
    }
  }
}
