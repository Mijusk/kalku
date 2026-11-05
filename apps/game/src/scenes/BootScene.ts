import Phaser from 'phaser';
import { createPixelTexture, HERO, PALETTE } from '../art/pixelArt';
import { createArtTextures } from '../art/textures';

/** Carga (o genera) todas las texturas antes de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createPixelTexture(this, 'hero', HERO, PALETTE);
    // El mundo (con el agua animada) y las criaturas salen de `@kalku/art`.
    createArtTextures(this);

    // El juego empieza en el mapa. Para desarrollo, el combate de prueba sigue en ?combate.
    const battle = new URLSearchParams(window.location.search).has('combate');
    this.scene.start(battle ? 'battle' : 'world');
  }
}
