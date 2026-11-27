import Phaser from 'phaser';
import { OUTFIT_LAYERS, ownsPiece, piecesForLayer, setPiece, type OutfitLayer } from '@kalku/content';
import { wardrobeOf } from '../items';
import { playMusic, sfx } from '../audio/sound';
import { createHeroTexture, HERO_KEY } from '../art/textures';
import { tr, trf, type StringKey } from '../i18n';
import { stepTag } from '../ui/dom';
import { applySettings, loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { applyStoryEvent, goToStory, playScenes } from '../storyFlow';
import { reducedMotion } from '../ui/fx';
import { GAME_WIDTH } from './BattleScene';

const LAYER_LABEL: Record<OutfitLayer, StringKey> = {
  back: 'outfitBack',
  body: 'outfitBody',
  hair: 'outfitHair',
  clothes: 'outfitClothes',
  accessory: 'outfitAccessory',
  hat: 'outfitHat',
};

/**
 * «Crea tu personaje»: piel, pelo, ropa y accesorio con flechas grandes y
 * el personaje en grande. Al empezar la historia (paso «create») y desde
 * Ajustes («Cambiar mi personaje»), con `{ fromSettings: true }`.
 */
export class CreateScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private hero!: Phaser.GameObjects.Image;
  private fromSettings = false;

  constructor() {
    super('create');
  }

  create(data?: { fromSettings?: boolean }): void {
    this.fromSettings = data?.fromSettings === true;
    this.progress = loadProgress();
    applySettings(this.progress.settings);
    playMusic('story');
    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();

    const g = this.add.graphics();
    g.fillGradientStyle(0x8fd3f5, 0x8fd3f5, 0xd6effb, 0xd6effb).fillRect(0, 0, GAME_WIDTH, 270);
    g.fillStyle(0x8fd46a).fillEllipse(GAME_WIDTH / 2, 230, 220, 60);
    g.fillStyle(0xa8e284).fillEllipse(GAME_WIDTH / 2 - 20, 224, 120, 20);
    this.hero = this.add.image(GAME_WIDTH / 2, 140, HERO_KEY, 0).setScale(9);
    if (!reducedMotion()) {
      let frame = 0;
      this.time.addEvent({ delay: 400, loop: true, callback: () => this.hero.setFrame((frame = (frame + 1) % 4)) });
    }

    if (this.fromSettings) this.render(ui);
    else void playScenes(['uni-hello']).then(() => this.render(ui));
  }

  private render(ui: HTMLElement): void {
    const locale = this.progress.locale;
    const root = document.createElement('div');
    root.className = 'panel create-panel';
    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = tr('createTitle', locale);
    if (!this.fromSettings) root.append(stepTag(trf('setupStep', locale, { n: 3, total: 3 })));
    root.append(title);
    const state = wardrobeOf(this.progress);
    for (const layer of OUTFIT_LAYERS) {
      // Solo lo que ya tiene; las capas con una sola opción («nada») no salen.
      const pieces = piecesForLayer(layer).filter((p) => ownsPiece(p, state));
      if (pieces.length < 2) continue;
      const row = document.createElement('div');
      row.className = 'create-row';
      const label = document.createElement('span');
      label.className = 'create-label';
      const name = document.createElement('span');
      name.className = 'create-piece';
      const refresh = (): void => {
        label.textContent = tr(LAYER_LABEL[layer], locale);
        name.textContent = pieces.find((p) => p.id === this.progress.outfit[layer])?.name[locale] ?? '';
      };
      const cycle = (delta: number): void => {
        const i = pieces.findIndex((p) => p.id === this.progress.outfit[layer]);
        const next = pieces[(i + delta + pieces.length) % pieces.length];
        if (!next) return;
        this.progress.outfit = setPiece(this.progress.outfit, layer, next.id);
        createHeroTexture(this, this.progress.outfit);
        this.hero.setTexture(HERO_KEY, 0);
        if (!reducedMotion()) this.tweens.add({ targets: this.hero, scale: 10, duration: 90, yoyo: true });
        refresh();
      };
      const prev = arrow('◀', tr('outfitPrev', locale), () => cycle(-1));
      const nextBtn = arrow('▶', tr('outfitNext', locale), () => cycle(1));
      const mid = document.createElement('div');
      mid.className = 'create-mid';
      mid.append(label, name);
      row.append(prev, mid, nextBtn);
      root.append(row);
      refresh();
    }
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'btn btn-primary';
    done.textContent = tr('createDone', locale);
    done.addEventListener('click', () => this.finish());
    root.append(done);
    ui.replaceChildren(root);
    done.focus();
  }

  private finish(): void {
    saveProgress(this.progress);
    sfx('quest');
    if (this.fromSettings) {
      this.scene.start('world');
      return;
    }
    applyStoryEvent({ type: 'created' });
    void goToStory(this);
  }
}

function arrow(text: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn create-arrow';
  b.textContent = text;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}
