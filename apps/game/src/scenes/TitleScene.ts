import Phaser from 'phaser';
import { levelForXp } from '@kalku/exercises';
import { playMusic } from '../audio/sound';
import { tr, trf } from '../i18n';
import { applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { goToStory, nickname } from '../storyFlow';
import { AdultsPanel } from '../ui/AdultsPanel';
import { button, text } from '../ui/dom';
import { TitleBackdrop } from '../ui/TitleBackdrop';

/**
 * Pantalla de inicio: el atardecer de Pradera Uno animado de fondo, el
 * nombre del juego y solo tres caminos claros: jugar (o seguir), entrar con
 * la clase y la zona de adultos (familias y docentes). El idioma se cambia
 * aquí mismo, antes de que hable nadie.
 */
export class TitleScene extends Phaser.Scene {
  private backdrop: TitleBackdrop | undefined;

  constructor() {
    super('title');
  }

  create(): void {
    const progress = loadProgress();
    applySettings(progress.settings);
    playMusic('story');
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    const root = document.createElement('div');
    root.className = 'title-screen';
    ui.append(root);
    this.backdrop = new TitleBackdrop(root);
    const content = document.createElement('div');
    content.className = 'title-content';
    root.append(content);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.backdrop?.destroy();
      root.remove();
    });
    this.render(root, content, progress);
  }

  private render(root: HTMLElement, content: HTMLElement, progress: PlayerProgress): void {
    const locale = progress.locale;
    document.documentElement.lang = locale;
    const name = nickname();
    const returning = name !== undefined || progress.placementDone;

    const logo = document.createElement('h1');
    logo.className = 'title-logo';
    logo.textContent = 'Kalku';
    const tagline = text('title-tagline', tr('titleTagline', locale));

    const actions = document.createElement('div');
    actions.className = 'title-actions';
    if (returning && name) {
      const hello = text('title-hello', trf('titleHello', locale, { name }));
      const level = document.createElement('span');
      level.className = 'title-level';
      level.textContent = ` · ${tr('level', locale)} ${levelForXp(progress.xp)}`;
      hello.append(level);
      actions.append(hello);
    }
    const play = button('btn btn-primary btn-play', `▶  ${tr(returning ? 'titleContinue' : 'titlePlay', locale)}`, () => {
      play.disabled = true;
      void goToStory(this);
    });
    // Entra como aparato de clase: la sesión vive solo en esta pestaña (#53).
    const classroom = button('btn btn-title', tr('classLoginMine', locale), () => window.location.assign(`${window.location.pathname}?clase`));
    actions.append(play, classroom);

    const footer = document.createElement('div');
    footer.className = 'title-footer';
    const other = locale === 'es' ? 'ca' : 'es';
    const language = button('btn btn-small btn-title', tr('language', locale), () => {
      progress.locale = other;
      saveProgress(progress);
      this.render(root, content, progress);
    });
    language.lang = other;
    const adults = button('btn btn-small btn-title', tr('titleAdults', locale), () => this.openAdults(root, content, progress));
    footer.append(language, adults);

    content.replaceChildren(footer, logo, tagline, actions);
    play.focus();
  }

  /** Zona de adultos encima de la portada; al cerrar se vuelve aquí. */
  private openAdults(root: HTMLElement, content: HTMLElement, progress: PlayerProgress): void {
    const panel = document.createElement('div');
    panel.className = 'settings';
    panel.setAttribute('role', 'dialog');
    content.setAttribute('inert', '');
    root.append(panel);
    const close = (): void => {
      panel.remove();
      content.removeAttribute('inert');
      this.render(root, content, loadProgress());
    };
    new AdultsPanel(panel, progress.locale, { onClose: close, onDeleted: () => window.location.reload() });
  }
}
