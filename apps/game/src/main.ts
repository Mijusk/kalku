import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BattleScene, GAME_HEIGHT, GAME_WIDTH } from './scenes/BattleScene';
import { CollectionScene } from './scenes/CollectionScene';
import { BootScene } from './scenes/BootScene';
import { NicknameScene } from './scenes/NicknameScene';
import { PlacementScene } from './scenes/PlacementScene';
import { WorldScene } from './scenes/WorldScene';
import { mountOfflineNotice } from './ui/OfflineNotice';
import { getAdultSupabase } from './supabase';
import './ui/styles.css';

// El cliente del adulto lee el enlace de acceso del correo al abrir el juego (#47).
getAdultSupabase();

mountOfflineNotice();

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
  scene: [BootScene, NicknameScene, PlacementScene, WorldScene, BattleScene, CollectionScene],
});

// Web instalable: el service worker guarda el juego para jugar sin conexión.
registerSW({ immediate: true });
