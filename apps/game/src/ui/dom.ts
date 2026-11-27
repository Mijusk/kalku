import { randomSeed, type Locale } from '@kalku/exercises';
import { checkAdultGate, createAdultGate } from '../adultGate';
import { tr } from '../i18n';

export function text(className: string, content: string): HTMLElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = content;
  return p;
}

export function button(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** Línea de estado (`role=status`) con un color: `info`, `good` o `bad`. */
export function status(content = '', kind = 'info'): HTMLElement {
  const p = text('panel-feedback', content);
  p.setAttribute('role', 'status');
  p.dataset.kind = kind;
  return p;
}

/** Pone un mensaje en una línea de estado. */
export function say(el: HTMLElement, content: string, kind = 'info'): void {
  el.textContent = content;
  el.dataset.kind = kind;
}

/** Pone los nodos en el panel y da el foco al primer campo o botón. */
export function show(root: HTMLElement, ...nodes: HTMLElement[]): void {
  root.replaceChildren(...nodes);
  root.querySelector<HTMLElement>('input, button')?.focus();
}

/** Pantalla de la cuenta (tipo 47 × 6) que un niño de 6 años no resuelve de cabeza. No es seguridad. */
export function showAdultGate(root: HTMLElement, locale: Locale, onPass: () => void, onBack: () => void): void {
  const gate = createAdultGate(randomSeed());
  const input = document.createElement('input');
  input.className = 'nickname-input';
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', tr('adultsGateAnswer', locale));
  input.placeholder = tr('adultsGateAnswer', locale);
  const feedback = status();
  const enter = button('btn btn-primary', tr('adultsEnter', locale), () => {
    if (checkAdultGate(gate, input.value)) onPass();
    else say(feedback, tr('adultsGateWrong', locale), 'bad');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enter.click();
  });
  const back = button('btn btn-small', tr('back', locale), onBack);
  show(root, text('panel-title', tr('adultsGateTitle', locale)), text('panel-feedback', tr('adultsGateHint', locale)), text('panel-title', `${gate.a} × ${gate.b}`), input, feedback, enter, back);
}

/** Tarjeta grande que se toca entera: título en negrita y una frase que explica qué pasa. */
export function choiceCard(title: string, detail: string, onClick: () => void, accent: 'green' | 'blue' | 'gold' | 'grey' = 'green'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `choice-card choice-${accent}`;
  const t = document.createElement('span');
  t.className = 'choice-title';
  t.textContent = title;
  const d = document.createElement('span');
  d.className = 'choice-text';
  d.textContent = detail;
  b.append(t, d);
  b.addEventListener('click', onClick);
  return b;
}

/** Pasos numerados (1, 2, 3…) para explicar qué hacer, en frases cortas. */
export function stepList(items: readonly string[]): HTMLOListElement {
  const ol = document.createElement('ol');
  ol.className = 'step-list';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ol.append(li);
  }
  return ol;
}

/** Lista corta de ventajas o datos, con una marca delante. */
export function bulletList(items: readonly string[], kind: 'yes' | 'no' | 'dot' = 'dot'): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.className = `bullet-list bullet-${kind}`;
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.append(li);
  }
  return ul;
}

/** Etiqueta «Paso 1 de 3» encima del título de un flujo. */
export function stepTag(content: string): HTMLElement {
  return text('step-tag', content);
}

/** Casilla grande con su frase al lado (toda la fila se puede tocar). */
export function checkRow(id: string, label: string): { row: HTMLLabelElement; input: HTMLInputElement } {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  const row = document.createElement('label');
  row.className = 'check-row';
  row.htmlFor = id;
  const span = document.createElement('span');
  span.textContent = label;
  row.append(input, span);
  return { row, input };
}

/** Enlace que se abre en otra pestaña (la política, el contrato…). */
export function externalLink(href: string, label: string, className = 'panel-link'): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = className;
  a.textContent = label;
  return a;
}

/** Caja de un panel con un fondo suave, para agrupar una parte (resumen semanal, opciones…). */
export function box(...nodes: HTMLElement[]): HTMLElement {
  const div = document.createElement('div');
  div.className = 'panel-box';
  div.append(...nodes);
  return div;
}
