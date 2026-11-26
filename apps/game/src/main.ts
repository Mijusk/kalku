import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BattleScene, GAME_HEIGHT, GAME_WIDTH } from './scenes/BattleScene';
import { ClassLoginScene } from './scenes/ClassLoginScene';
import { CollectionScene } from './scenes/CollectionScene';
import { BootScene } from './scenes/BootScene';
import { NicknameScene } from './scenes/NicknameScene';
import { PlacementScene } from './scenes/PlacementScene';
import { PrologueScene } from './scenes/PrologueScene';
import { CreateScene } from './scenes/CreateScene';
import { RiddleScene } from './scenes/RiddleScene';
import { WorldScene } from './scenes/WorldScene';
import { readSyllabusParam } from './syllabus';
import { mountOfflineNotice } from './ui/OfflineNotice';
import { installAudioUnlock, setAudioPrefs, sfx } from './audio/sound';
import { loadProgress } from './progress';
import { getAdultSupabase } from './supabase';
import './ui/styles.css';

// El cliente del adulto lee el enlace de acceso del correo al abrir el juego (#47).
getAdultSupabase();

mountOfflineNotice();

// Sonido generado por código: arranca con el primer toque; cada botón hace «clic».
setAudioPrefs(loadProgress().settings);
installAudioUnlock();
readSyllabusParam();
document.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('button')) sfx('tap');
});

const game = new Phaser.Game({
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
  scene: [BootScene, PrologueScene, CreateScene, ClassLoginScene, NicknameScene, PlacementScene, WorldScene, BattleScene, RiddleScene, CollectionScene],
});
// Para probar la historia entera con Playwright (en local y en la web con ?prueba). No da ventajas:
// las respuestas que cuentan las vuelve a comprobar el servidor.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('prueba')) Object.assign(window, { kalkuGame: game });

// Web instalable: el service worker guarda el juego para jugar sin conexión.
registerSW({ immediate: true });
