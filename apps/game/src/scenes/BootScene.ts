import Phaser from 'phaser';
import { createPixelTexture, HERO, PALETTE } from '../art/pixelArt';
import { createArtTextures } from '../art/textures';
import { activeClassId, classIdFromSearch, wipeAbandonedClassData } from '../classDevice';
import { loadProgress } from '../progress';
import { LOCAL_KEYS, appBackend, needsNickname, startSyncWithTimeout } from '../sync';

/** Carga (o genera) todas las texturas antes de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    createPixelTexture(this, 'hero', HERO, PALETTE);
    // El mundo (con el agua animada) y las criaturas salen de `@kalku/art`.
    createArtTextures(this);

    // El juego empieza en el mapa. Para desarrollo, el combate de prueba sigue en ?combate.
    const params = new URLSearchParams(window.location.search);
    const battle = params.has('combate');
    // Aparato de clase (#53): si una pestaña anterior dejó datos de un alumno sin salir, se borran.
    wipeAbandonedClassData(localStorage, sessionStorage, LOCAL_KEYS);
    // Con el QR de la tarjeta (`?clase=<id>`) o «Entro con mi clase» (`?clase`), el niño elige quién es.
    // Si ya hay un alumno dentro en esta pestaña, sigue jugando.
    if (!battle && params.has('clase') && activeClassId(sessionStorage) === null) {
      this.scene.start('classLogin', { classId: classIdFromSearch(window.location.search) });
      return;
    }
    // Sin cuenta, primero el apodo (nunca un nombre real ni correo). ?combate se lo salta.
    if (!battle && (await needsNickname(appBackend(), localStorage))) {
      this.scene.start('nickname');
      return;
    }
    // Baja el progreso del servidor (sin red o sin servidor, sigue la copia local).
    await startSyncWithTimeout();
    // La primera vez, una prueba corta de nivel (?combate se la salta).
    const placement = !battle && !loadProgress().placementDone;
    this.scene.start(battle ? 'battle' : placement ? 'placement' : 'world');
  }
}
