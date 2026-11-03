import Phaser from 'phaser';
import { CREATURE_ADD, CREATURE_SUB, createPixelSheet, createPixelTexture, FLOWERS, GRASS, HERO, PALETTE } from '../art/pixelArt';
import { TILE_SIZE, TILESET_KEY, tileFrames } from '../art/tiles';

/** Carga (o genera) todas las texturas antes de empezar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createPixelTexture(this, 'hero', HERO, PALETTE);
    createPixelTexture(this, 'creature-add', CREATURE_ADD, PALETTE);
    createPixelTexture(this, 'creature-sub', CREATURE_SUB, PALETTE);
    createPixelTexture(this, 'tile-grass', GRASS, PALETTE);
    createPixelTexture(this, 'tile-flowers', FLOWERS, PALETTE);
    // Tileset del mapa: todas las casillas (con las 16 orillas de agua y de camino) en una tira.
    createPixelSheet(this, TILESET_KEY, tileFrames(), PALETTE, TILE_SIZE / 8);

    // El juego empieza en el mapa. Para desarrollo, el combate de prueba sigue en ?combate.
    const battle = new URLSearchParams(window.location.search).has('combate');
    this.scene.start(battle ? 'battle' : 'world');
  }
}
