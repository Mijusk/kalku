import Phaser from 'phaser';
import { appClassLoginBackend, enterClass } from '../classLogin';
import { applyTextSize, loadProgress } from '../progress';
import { appBackend } from '../sync';
import { tr } from '../i18n';
import { ClassLoginPanel } from '../ui/ClassLoginPanel';
import { text } from '../ui/dom';

export interface ClassLoginData {
  /** Id de la clase del QR; sin él se pide el enlace. */
  classId?: string | null;
}

/** Entrada del niño a su clase (#53): apodo + animal, o el código de la tarjeta. */
export class ClassLoginScene extends Phaser.Scene {
  constructor() {
    super('classLogin');
  }

  create(data: ClassLoginData = {}): void {
    const progress = loadProgress();
    applyTextSize(progress.settings);
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();
    const root = document.createElement('div');
    root.className = 'settings';
    ui.append(root);
    const backend = appClassLoginBackend();
    if (!backend) {
      root.append(text('panel-feedback', tr('classLoginNetwork', progress.locale)));
      return;
    }
    const panel = new ClassLoginPanel(root, progress.locale, {
      backend,
      classId: data.classId ?? null,
      // «Volver» deja la entrada de clase: se recarga el juego sin `?clase`.
      onBack: () => window.location.assign(window.location.pathname),
      submit: async (classId, credentials) => {
        await enterClass(backend, appBackend(), localStorage, sessionStorage, classId, credentials);
        // El alumno es nuevo para este aparato: primero la prueba de nivel si no la hizo.
        this.scene.start(loadProgress().placementDone ? 'world' : 'placement');
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      panel.destroy();
      root.remove();
    });
  }
}
