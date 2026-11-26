import { drawPortrait, gridToRgba, PORTRAIT_SIZE, type PortraitId } from '@kalku/art';
import { characterName, fillText, PORTRAITS_BY_CHARACTER, type DialogLine } from '@kalku/content';
import type { Locale } from '@kalku/exercises';
import { sfx } from '../audio/sound';
import { tr } from '../i18n';
import { speak, stopSpeaking } from '../speech';
import { reducedMotion } from './fx';

export interface DialogOptions {
  locale: Locale;
  nickname: string | undefined;
  /** Lee cada globo en voz alta (ajuste «Voz automática»). */
  voice: boolean;
  /** Botón «Saltar» para las escenas largas. */
  skippable?: boolean;
  /** Se llama al enseñar cada globo (el prólogo cambia de viñeta). */
  onLine?: (index: number) => void;
}

/** Velocidad del texto letra a letra (ms por letra). */
const TYPE_MS = 22;

function portraitCanvas(id: PortraitId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'dialog-portrait';
  canvas.width = PORTRAIT_SIZE;
  canvas.height = PORTRAIT_SIZE;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(PORTRAIT_SIZE, PORTRAIT_SIZE);
    image.data.set(gridToRgba(drawPortrait(id)));
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}

let open: HTMLElement | undefined;

/** true mientras hay un diálogo en pantalla (el mapa no mueve al personaje). */
export function dialogOpen(): boolean {
  return open?.isConnected === true;
}

/**
 * Enseña los globos de una escena uno detrás de otro, abajo de la pantalla,
 * con el retrato y el nombre de quien habla, en letra clara. El texto sale
 * letra a letra; un toque (o Enter o espacio) lo completa y otro pasa al
 * siguiente. Se resuelve al terminar (o al tocar «Saltar»).
 */
export function playDialog(lines: readonly DialogLine[], options: DialogOptions): Promise<void> {
  open?.remove();
  return new Promise((resolve) => {
    if (lines.length === 0) {
      resolve();
      return;
    }
    const { locale } = options;
    const root = document.createElement('div');
    root.className = 'dialog';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-live', 'polite');
    const box = document.createElement('div');
    box.className = 'dialog-box';
    const portrait = document.createElement('div');
    portrait.className = 'dialog-portrait-slot';
    const body = document.createElement('div');
    body.className = 'dialog-body';
    const name = document.createElement('p');
    name.className = 'dialog-name';
    const text = document.createElement('p');
    text.className = 'dialog-text';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-primary dialog-next';
    body.append(name, text);
    box.append(portrait, body, next);
    root.append(box);
    if (options.skippable) {
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'btn btn-small dialog-skip';
      skip.textContent = tr('skip', locale);
      skip.addEventListener('click', (e) => {
        e.stopPropagation();
        finish();
      });
      root.append(skip);
    }
    document.getElementById('app')?.append(root);
    open = root;

    let index = 0;
    let full = '';
    let shown = 0;
    let timer: number | undefined;

    const typing = (): boolean => shown < full.length;

    const show = (): void => {
      const line = lines[index];
      if (!line) return finish();
      full = fillText(line.text[locale], options.nickname, locale);
      const who = characterName(line.who)[locale];
      name.textContent = who;
      name.hidden = who === '';
      root.dataset.who = line.who;
      const pid = PORTRAITS_BY_CHARACTER[line.who];
      portrait.replaceChildren(...(pid ? [portraitCanvas(pid)] : []));
      portrait.hidden = !pid;
      next.textContent = index === lines.length - 1 ? tr('dialogDone', locale) : tr('dialogNext', locale);
      options.onLine?.(index);
      if (options.voice) speak(full, locale);
      if (reducedMotion()) {
        shown = full.length;
        text.textContent = full;
        return;
      }
      shown = 0;
      text.textContent = '';
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        shown += 1;
        text.textContent = full.slice(0, shown);
        if (shown % 3 === 0) sfx('talk');
        if (!typing()) window.clearInterval(timer);
      }, TYPE_MS);
    };

    const advance = (): void => {
      if (typing()) {
        // Primer toque: el texto sale entero.
        shown = full.length;
        text.textContent = full;
        window.clearInterval(timer);
        return;
      }
      index += 1;
      if (index >= lines.length) finish();
      else show();
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };

    function finish(): void {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onKey, true);
      stopSpeaking();
      root.remove();
      if (open === root) open = undefined;
      resolve();
    }

    root.addEventListener('click', (e) => {
      e.stopPropagation();
      advance();
    });
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    window.addEventListener('keydown', onKey, true);
    show();
    next.focus();
  });
}
