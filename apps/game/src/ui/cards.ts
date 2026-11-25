import qrcode from 'qrcode-generator';
import { animalName, classEntryUrl, type StudentCard } from '../classes';
import { tr } from '../i18n';

/** Tarjetas por hoja A4: 2 columnas × 4 filas. */
export const CARDS_PER_SHEET = 8;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Matriz del QR (true = módulo oscuro), con corrección de errores M. */
export function qrMatrix(data: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => qr.isDark(y, x)));
}

/** QR como SVG (rectángulos negros sobre blanco, con la zona de silencio), sin tocar innerHTML. */
export function qrSvg(data: string): SVGSVGElement {
  const matrix = qrMatrix(data);
  const n = matrix.length;
  const quiet = 2;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n + quiet * 2} ${n + quiet * 2}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.classList.add('card-qr');
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(n + quiet * 2));
  bg.setAttribute('height', String(n + quiet * 2));
  bg.setAttribute('fill', '#fff');
  svg.append(bg);
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (matrix[y]?.[x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000');
  svg.append(path);
  return svg;
}

function el(tag: string, className: string, content?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  if (content !== undefined) e.textContent = content;
  return e;
}

/** Una tarjeta: apodo, código, animal secreto, QR de la clase e instrucciones en los dos idiomas. */
export function renderCard(card: StudentCard, classId: string, origin: string): HTMLElement {
  const root = el('article', 'card');
  const qr = qrSvg(classEntryUrl(origin, classId));
  qr.setAttribute('aria-label', 'QR');
  const steps = el('div', 'card-steps');
  for (const locale of ['es', 'ca'] as const) steps.append(el('p', 'card-step', tr('cardSteps', locale)));
  const main = el('div', 'card-main');
  main.append(
    el('p', 'card-label', `${tr('cardCode', 'es')} / ${tr('cardCode', 'ca')}`),
    el('p', 'card-code', card.code),
    el('p', 'card-label', `${tr('cardAnimal', 'es')} / ${tr('cardAnimal', 'ca')}`),
    el('p', 'card-animal', `${animalName(card.animal, 'es')} · ${animalName(card.animal, 'ca')}`),
    steps,
  );
  const side = el('div', 'card-side');
  side.append(qr, el('p', 'card-brand', 'Kalku'));
  const body = el('div', 'card-body');
  body.append(main, side);
  root.append(el('p', 'card-nickname', card.nickname), body);
  return root;
}

/**
 * Hojas A4 con 8 tarjetas, siempre en es y ca. Se pone fuera de la vista; solo el CSS de impresión la muestra.
 */
export function renderSheets(cards: readonly StudentCard[], classId: string, origin: string): HTMLElement {
  const root = el('div', 'print-sheets');
  for (let i = 0; i < cards.length; i += CARDS_PER_SHEET) {
    const sheet = el('section', 'print-sheet');
    for (const card of cards.slice(i, i + CARDS_PER_SHEET)) sheet.append(renderCard(card, classId, origin));
    root.append(sheet);
  }
  return root;
}

/** Imprime las tarjetas: monta la hoja, abre el diálogo de impresión y la quita. */
export function printCards(cards: readonly StudentCard[], classId: string): void {
  const sheets = renderSheets(cards, classId, window.location.origin);
  document.body.append(sheets);
  document.body.classList.add('printing-cards');
  const cleanup = (): void => {
    sheets.remove();
    document.body.classList.remove('printing-cards');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
