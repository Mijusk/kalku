import Phaser from 'phaser';
import { createArtTextures, createHeroTexture } from '../art/textures';
import { activeClassId, classIdFromSearch, wipeAbandonedClassData } from '../classDevice';
import { loadProgress } from '../progress';
import { goToStory } from '../storyFlow';
import { LOCAL_KEYS, appBackend, clearAnswerQueue, needsNickname, startSyncWithTimeout } from '../sync';

/** Carga (o genera) todas las texturas antes de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    createHeroTexture(this, loadProgress().outfit);
    // El mundo (con el agua animada) y las criaturas salen de `@kalku/art`.
    createArtTextures(this);

    // El juego empieza en el mapa. Para desarrollo, el combate de prueba sigue en ?combate.
    const params = new URLSearchParams(window.location.search);
    const battle = params.has('combate');
    // Aparato de clase (#53): si una pestaña anterior dejó datos de un alumno sin salir, se borran.
    if (wipeAbandonedClassData(localStorage, sessionStorage, LOCAL_KEYS)) void clearAnswerQueue();
    // Con el QR de la tarjeta (`?clase=<id>`) o «Entro con mi clase» (`?clase`), el niño elige quién es.
    // Si ya hay un alumno dentro en esta pestaña, sigue jugando.
    if (!battle && params.has('clase') && activeClassId(sessionStorage) === null) {
      this.scene.start('classLogin', { classId: classIdFromSearch(window.location.search) });
      return;
    }
    // Con cuenta, baja el progreso del servidor (sin red o sin servidor, sigue la copia local).
    // Sin cuenta, no hay nada que bajar: el apodo se pide después del prólogo.
    if (battle || !(await needsNickname(appBackend(), localStorage))) await startSyncWithTimeout();
    if (battle) {
      this.scene.start('battle');
      return;
    }
    // Un alumno que ya está dentro en esta pestaña sigue jugando; si no, la pantalla de inicio.
    if (activeClassId(sessionStorage) !== null) {
      await goToStory(this);
      return;
    }
    this.scene.start('title');
  }
}
