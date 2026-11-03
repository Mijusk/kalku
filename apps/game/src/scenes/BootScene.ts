import Phaser from 'phaser';
import {
  CREATURE_ADD,
  CREATURE_SUB,
  createPixelTexture,
  edgedTile,
  FLOWERS,
  GRASS,
  HERO,
  PALETTE,
  PATH,
  WATER,
} from '../art/pixelArt';

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
    // Autotiling provisional: una textura por máscara de lados (0–15), con la clave
    // tile-water-<variante> / tile-path-<variante> de WATER_TILES y PATH_TILES.
    for (let mask = 0; mask < 16; mask++) {
      createPixelTexture(this, `tile-water-${mask}`, edgedTile(mask, WATER, 'e'), PALETTE);
      createPixelTexture(this, `tile-path-${mask}`, edgedTile(mask, PATH, 'g'), PALETTE);
    }
    this.scene.start('battle');
  }
}
