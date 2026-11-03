import Phaser from 'phaser';
import { CREATURE_ADD, CREATURE_SUB, createPixelTexture, FLOWERS, GRASS, HERO, PALETTE } from '../art/pixelArt';

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
    this.scene.start('battle');
  }
}
