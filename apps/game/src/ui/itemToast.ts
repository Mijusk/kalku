import { setPiece } from '@kalku/content';
import { sfx } from '../audio/sound';
import { tr } from '../i18n';
import { furnitureCanvas, heroCanvas, type NewItem } from '../items';
import type { PlayerProgress } from '../progress';
import './items.css';

/** Cuánto se queda cada aviso. */
const SHOW_MS = 3600;

/**
 * Aviso de objeto nuevo, abajo y sin bloquear: el personaje con la pieza
 * puesta y «¡Nuevo objeto! Capa del bosque · Póntelo en el Armario».
 * Si hay varios, salen uno detrás de otro.
 */
export function showNewItems(pieces: readonly NewItem[], progress: PlayerProgress): void {
  const ui = document.getElementById('ui');
  if (!ui || pieces.length === 0) return;
  const [first, ...rest] = pieces;
  if (!first) return;
  ui.querySelector('.item-toast')?.remove();
  const root = document.createElement('div');
  root.className = 'item-toast';
  root.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'item-toast-text';
  const furniture = !('layer' in first);
  const locale = progress.locale;
  text.textContent = `${tr(furniture ? 'homeNew' : 'wardrobeNew', locale)} ${first.name[locale]} · ${tr(furniture ? 'homeTry' : 'wardrobeTry', locale)}`;
  const art = 'layer' in first ? heroCanvas(setPiece(progress.outfit, first.layer, first.id), '') : furnitureCanvas(first, `item-toast-furniture item-toast-furniture-${first.width}`);
  root.append(art, text);
  ui.append(root);
  sfx('quest');
  setTimeout(() => {
    root.remove();
    showNewItems(rest, progress);
  }, SHOW_MS);
}
