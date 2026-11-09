import Phaser from 'phaser';
import { createArtTextures, createHeroTexture } from '../art/textures';
import { loadProgress } from '../progress';

/** Carga (o genera) todas las texturas antes de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createHeroTexture(this, loadProgress().outfit);
    // El mundo (con el agua animada) y las criaturas salen de `@kalku/art`.
    createArtTextures(this);

    // El juego empieza en el mapa. Para desarrollo, el combate de prueba sigue en ?combate.
    const battle = new URLSearchParams(window.location.search).has('combate');
    // La primera vez, una prueba corta de nivel (?combate se la salta).
    const placement = !battle && !loadProgress().placementDone;
    this.scene.start(battle ? 'battle' : placement ? 'placement' : 'world');
  }
}
