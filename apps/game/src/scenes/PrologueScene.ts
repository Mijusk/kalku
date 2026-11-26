import Phaser from 'phaser';
import { CREATURES } from '@kalku/content';
import { playMusic, sfx } from '../audio/sound';
import { buildingTexture, mapSpriteKey, portraitKey } from '../art/textures';
import { applySettings, loadProgress } from '../progress';
import { applyStoryEvent, goToStory, playScenes } from '../storyFlow';
import { reducedMotion } from '../ui/fx';
import { drawBattleBackground, ensureFxTextures, FX_TEXTURES } from './battleFx';
import { GAME_HEIGHT, GAME_WIDTH } from './BattleScene';

/**
 * Prólogo: cuatro viñetas dibujadas por código mientras el narrador cuenta
 * la llegada del Gran Borrón. Se puede saltar y solo sale una vez.
 */
export class PrologueScene extends Phaser.Scene {
  private panel: Phaser.GameObjects.Container | undefined;
  private grey: Phaser.FX.ColorMatrix | undefined;

  constructor() {
    super('prologue');
  }

  create(): void {
    const progress = loadProgress();
    applySettings(progress.settings);
    document.getElementById('ui')?.replaceChildren();
    ensureFxTextures(this);
    playMusic('story');
    this.grey = this.cameras.main.postFX?.addColorMatrix();
    this.showPanel(0);
    void playScenes(['prologue'], { skippable: true, onLine: (i) => this.showPanel(i) }).then(() => this.done());
  }

  private done(): void {
    applyStoryEvent({ type: 'prologueSeen' });
    void goToStory(this);
  }

  private showPanel(index: number): void {
    const old = this.panel;
    const panel = this.add.container(0, 0);
    this.panel = panel;
    this.grey?.reset();
    [this.kalku, this.borronArrives, this.greyTown, this.wakeUp][index]?.call(this, panel);
    if (old) {
      if (reducedMotion()) old.destroy();
      else {
        panel.setAlpha(0);
        this.tweens.add({ targets: panel, alpha: 1, duration: 350 });
        this.tweens.add({ targets: old, alpha: 0, duration: 350, onComplete: () => old.destroy() });
      }
    }
  }

  /** El pueblo con sus casas y las criaturas contentas. */
  private town(panel: Phaser.GameObjects.Container, mood: 'day' | 'dusk'): void {
    panel.add(drawBattleBackground(this, GAME_WIDTH, GAME_HEIGHT, mood));
    const house = buildingTexture(this, { kind: 'house', width: 3, height: 2 });
    const shop = buildingTexture(this, { kind: 'shop', width: 3, height: 2 });
    panel.add([
      this.add.image(70, 150, house).setScale(2),
      this.add.image(190, 140, shop).setScale(2),
      this.add.image(330, 150, house).setScale(2),
    ]);
  }

  private kalku(panel: Phaser.GameObjects.Container): void {
    this.town(panel, 'day');
    // Sol y números de colores flotando en el cielo.
    const sun = this.add.circle(420, 40, 18, 0xffd84a).setStrokeStyle(3, 0xe8a020);
    panel.add(sun);
    const creatures = CREATURES.slice(0, 4);
    creatures.forEach((c, i) => {
      const img = this.add.image(90 + i * 95, 222, c.sprite, 0).setScale(1.5);
      panel.add(img);
      if (!reducedMotion()) this.tweens.add({ targets: img, y: 212, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    for (let i = 0; i < 9; i++) {
      const star = this.add.image(40 + i * 48, 40 + (i % 3) * 18, FX_TEXTURES.star).setScale(2);
      panel.add(star);
      if (!reducedMotion()) this.tweens.add({ targets: star, y: star.y - 8, duration: 700 + i * 60, yoyo: true, repeat: -1 });
    }
  }

  private borronArrives(panel: Phaser.GameObjects.Container): void {
    this.town(panel, 'dusk');
    const borron = this.add.image(GAME_WIDTH / 2, -60, mapSpriteKey('borron')).setScale(4);
    panel.add(borron);
    sfx('door');
    if (reducedMotion()) borron.setY(80);
    else {
      this.tweens.add({ targets: borron, y: 80, duration: 900, ease: 'Bounce.easeOut' });
      this.tweens.add({ targets: borron, scaleX: 4.3, duration: 500, yoyo: true, repeat: -1, delay: 900 });
      this.cameras.main.shake(400, 0.006);
    }
    // Las estrellas (los números) se van hacia su boca.
    for (let i = 0; i < 10; i++) {
      const star = this.add.image(30 + i * 45, 200 - (i % 4) * 25, FX_TEXTURES.star).setScale(2);
      panel.add(star);
      if (!reducedMotion()) {
        this.tweens.add({ targets: star, x: GAME_WIDTH / 2, y: 100, scale: 0, duration: 900, delay: 900 + i * 180, ease: 'Quad.easeIn' });
      }
    }
  }

  private greyTown(panel: Phaser.GameObjects.Container): void {
    this.town(panel, 'day');
    this.grey?.grayscale(0.9);
    // Criaturas asustadas que tiemblan, medio escondidas.
    CREATURES.slice(0, 3).forEach((c, i) => {
      const img = this.add.image(110 + i * 130, 236, c.sprite, 0).setScale(1.5);
      panel.add(img);
      if (!reducedMotion()) this.tweens.add({ targets: img, x: img.x + 2, duration: 60, yoyo: true, repeat: -1 });
    });
    const grass = this.add.graphics();
    grass.fillStyle(0x3f8a2c);
    for (let x = 0; x < GAME_WIDTH; x += 6) grass.fillTriangle(x, 270, x + 3, 236 + ((x * 7) % 10), x + 6, 270);
    panel.add(grass);
  }

  private wakeUp(panel: Phaser.GameObjects.Container): void {
    const sky = this.add.graphics();
    sky.fillStyle(0x14203a).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    sky.fillStyle(0x2a3a5a).fillRect(0, 190, GAME_WIDTH, 80);
    panel.add(sky);
    for (let i = 0; i < 30; i++) panel.add(this.add.rectangle((i * 83) % GAME_WIDTH, (i * 37) % 170, 2, 2, 0xffffff));
    const house = this.add.image(GAME_WIDTH / 2, 160, buildingTexture(this, { kind: 'house', width: 3, height: 2 })).setScale(3);
    panel.add(house);
    // La ventana se enciende y aparece Uni.
    const light = this.add.rectangle(GAME_WIDTH / 2 - 8, 170, 14, 12, 0xffd84a, 0);
    panel.add(light);
    const uni = this.add.image(GAME_WIDTH / 2 + 60, 110, portraitKey('uni')).setScale(3).setAlpha(0);
    panel.add(uni);
    if (reducedMotion()) {
      light.setFillStyle(0xffd84a, 1);
      uni.setAlpha(1);
      return;
    }
    this.tweens.add({ targets: light, fillAlpha: 1, duration: 600, delay: 500 });
    this.tweens.add({ targets: uni, alpha: 1, y: 100, duration: 600, delay: 1100 });
    this.tweens.add({ targets: uni, y: 92, duration: 700, yoyo: true, repeat: -1, delay: 1700, ease: 'Sine.easeInOut' });
  }
}
