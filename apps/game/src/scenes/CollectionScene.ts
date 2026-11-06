import Phaser from 'phaser';
import { collectionStatus, type CreatureDefinition } from '@kalku/content';
import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { applyTextSize, loadProgress } from '../progress';

/** Color de la silueta de las criaturas que faltan. */
const SILHOUETTE = '#1b2a1f';

/**
 * Colección de criaturas rescatadas: las que ya tienes con su dibujo y su
 * nombre, y las que faltan en silueta y sin nombre. Solo se mira; no da
 * ventaja en el combate. Todo es HTML, como el resto de textos.
 */
export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('collection');
  }

  create(): void {
    const progress = loadProgress();
    const locale = progress.locale;
    applyTextSize(progress.settings);
    this.cameras.main.setBackgroundColor('#2d4a35');

    const ui = document.getElementById('ui');
    if (!ui) throw new Error('Falta el contenedor #ui');
    ui.replaceChildren();

    const status = collectionStatus(progress.collection);
    const rescued = status.filter((s) => s.rescued).length;

    const root = document.createElement('div');
    root.className = 'collection';
    const title = document.createElement('p');
    title.className = 'panel-title';
    title.textContent = `${tr('collection', locale)} · ${rescued}/${status.length} ${tr('collectionCount', locale)}`;

    const grid = document.createElement('ul');
    grid.className = 'collection-grid';
    for (const { creature, rescued: has } of status) {
      const item = document.createElement('li');
      item.className = 'collection-item';
      item.dataset.rescued = String(has);
      const name = document.createElement('span');
      name.className = 'collection-name';
      name.textContent = has ? creature.name[locale] : '?';
      const picture = this.drawCreature(creature, has, locale);
      if (!has) picture.setAttribute('aria-hidden', 'true');
      item.append(picture, name);
      grid.append(item);
    }

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn btn-primary';
    back.textContent = tr('back', locale);
    back.addEventListener('click', () => this.scene.start('world'));

    root.append(title, grid, back);
    ui.append(root);
  }

  /** Primer fotograma de la criatura en un canvas HTML; en silueta si no está rescatada. */
  private drawCreature(creature: CreatureDefinition, rescued: boolean, locale: Locale): HTMLCanvasElement {
    const frame = this.textures.getFrame(creature.sprite, 0);
    const canvas = document.createElement('canvas');
    canvas.className = 'collection-sprite';
    canvas.width = frame.cutWidth;
    canvas.height = frame.cutHeight;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', rescued ? creature.name[locale] : '?');
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
    if (!rescued) {
      // Solo los píxeles dibujados: la silueta conserva la forma y pierde el color.
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = SILHOUETTE;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }
}
