import { drawStar, gridToRgba, STAR_SIZE } from '@kalku/art';
import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { sfx } from '../audio/sound';
import { speak } from '../speech';

/** Cuánto se queda el aviso en pantalla antes de quitarse solo. */
const SHOW_MS = 2600;

function starCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'levelup-star';
  canvas.width = STAR_SIZE;
  canvas.height = STAR_SIZE;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  ctx?.putImageData(new ImageData(gridToRgba(drawStar()) as Uint8ClampedArray<ArrayBuffer>, STAR_SIZE, STAR_SIZE), 0, 0);
  return canvas;
}

/**
 * Celebración al subir de nivel: estrella en pixel art (dibujada por código) y mensaje en letra clara.
 * Con «reducir movimiento» no hay animación, solo el aviso. Con voz automática, lo lee el navegador.
 * No bloquea el juego: se quita sola.
 */
export function showLevelUp(container: HTMLElement, level: number, locale: Locale, autoVoice: boolean): void {
  container.querySelector('.levelup')?.remove();
  const root = document.createElement('div');
  root.className = 'levelup';
  root.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'levelup-text';
  const message = tr('levelUp', locale);
  text.textContent = message;
  const number = document.createElement('p');
  number.className = 'levelup-level';
  number.textContent = `${tr('level', locale)} ${level}`;
  root.append(starCanvas(), text, number);
  container.append(root);
  sfx('levelUp');
  if (autoVoice) speak(`${message} ${tr('level', locale)} ${level}`, locale);
  setTimeout(() => root.remove(), SHOW_MS);
}
