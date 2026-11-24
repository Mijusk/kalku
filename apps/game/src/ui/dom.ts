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
