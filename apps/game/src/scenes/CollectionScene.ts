import Phaser from 'phaser';
import { collectionStatus, gemStatus, ZONES, type CreatureDefinition } from '@kalku/content';
import { drawChest, gridToRgba, OBJECT_PX } from '@kalku/art';
import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { applySettings, loadProgress } from '../progress';
import { gemCanvas } from '../ui/gemCanvas';

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
    applySettings(progress.settings);
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

    // Cambiar el personaje cuando quiera, sin perder nada.
    const outfit = document.createElement('button');
    outfit.type = 'button';
    outfit.className = 'btn btn-small';
    outfit.textContent = tr('createChange', locale);
    outfit.addEventListener('click', () => this.scene.start('create', { fromSettings: true }));

    const gems = gemStatus(progress.gems);
    const gemsTitle = document.createElement('p');
    gemsTitle.className = 'panel-title';
    gemsTitle.textContent = `${tr('myGems', locale)} · ${gems.filter((g) => g.earned).length}/${gems.length}`;
    const gemGrid = document.createElement('ul');
    gemGrid.className = 'collection-grid gem-grid';
    for (const { skill, earned } of gems) {
      const item = document.createElement('li');
      item.className = 'collection-item gem-item';
      item.dataset.earned = String(earned);
      const name = document.createElement('span');
      name.className = 'collection-name';
      name.textContent = skill.name[locale];
      item.append(gemCanvas(skill, earned, 'gem-sprite'), name);
      if (!earned) {
        const hint = document.createElement('span');
        hint.className = 'gem-hint';
        hint.textContent = `${tr('gemHint', locale)}: ${skill.name[locale]}`;
        item.append(hint);
      }
      gemGrid.append(item);
    }

    const treasuresTitle = document.createElement('p');
    treasuresTitle.className = 'panel-title';
    const owned = ZONES.filter((z) => progress.treasures.includes(z.treasure.id)).length;
    treasuresTitle.textContent = `${tr('treasures', locale)} · ${owned}/${ZONES.length}`;
    const treasureGrid = document.createElement('ul');
    treasureGrid.className = 'collection-grid gem-grid';
    for (const zone of ZONES) {
      const has = progress.treasures.includes(zone.treasure.id);
      const item = document.createElement('li');
      item.className = 'collection-item gem-item';
      item.dataset.earned = String(has);
      const name = document.createElement('span');
      name.className = 'collection-name';
      name.textContent = has ? zone.treasure.name[locale] : '?';
      item.append(this.chestCanvas(has), name);
      if (!has) {
        const hint = document.createElement('span');
        hint.className = 'gem-hint';
        hint.textContent = `${tr('treasureHint', locale)}: ${zone.name[locale]}`;
        item.append(hint);
      }
      treasureGrid.append(item);
    }

    root.append(title, grid, gemsTitle, gemGrid, treasuresTitle, treasureGrid, outfit, back);
    ui.append(root);
  }

  /** Cofre dibujado por código: abierto si ya tienes el tesoro, cerrado si no. */
  private chestCanvas(open: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = 'gem-sprite';
    canvas.width = OBJECT_PX;
    canvas.height = OBJECT_PX;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const image = ctx.createImageData(OBJECT_PX, OBJECT_PX);
      image.data.set(gridToRgba(drawChest(open)));
      ctx.putImageData(image, 0, 0);
    }
    return canvas;
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
