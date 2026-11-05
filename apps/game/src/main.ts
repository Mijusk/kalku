import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BattleScene, GAME_HEIGHT, GAME_WIDTH } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { PlacementScene } from './scenes/PlacementScene';
import { WorldScene } from './scenes/WorldScene';
import './ui/styles.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b2a1f',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PlacementScene, WorldScene, BattleScene],
});

// Web instalable: el service worker guarda el juego para jugar sin conexión.
registerSW({ immediate: true });
