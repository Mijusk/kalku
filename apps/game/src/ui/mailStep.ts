import type { Locale } from '@kalku/exercises';
import { tr, trf } from '../i18n';
import { bulletList, button, say, show, status, stepList, text } from './dom';

/** Correo con forma de correo (no es validación: el servidor manda el enlace). */
export const looksLikeEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface EmailStepOptions {
  title: string;
  benefits: readonly string[];
  note: string;
  label: string;
  sendLabel: string;
  invalidText: string;
  /** Pide el enlace al servidor; si lanza, se enseña `errorText(e)`. */
  send(email: string): Promise<void>;
  errorText(e: unknown): string;
  extra?: HTMLElement[];
  back: HTMLElement;
}

/**
 * Entrar con el correo, en dos pantallas: primero para qué sirve y el correo;
 * después «Mira tu correo» con los pasos. Sirve para familias y docentes.
 */
export function showEmailStep(root: HTMLElement, locale: Locale, o: EmailStepOptions): void {
  const input = document.createElement('input');
  input.type = 'email';
  input.className = 'nickname-input';
  input.autocomplete = 'email';
  input.setAttribute('aria-label', o.label);
  input.placeholder = o.label;
  const feedback = status();
  let busy = false;
  const send = button('btn btn-primary', o.sendLabel, () => {
    const email = input.value.trim();
    if (!looksLikeEmail(email)) {
      say(feedback, o.invalidText, 'bad');
      return;
    }
    if (busy) return;
    busy = true;
    say(feedback, tr('familyWorking', locale));
    o.send(email)
      .then(() => showCheckMail(root, locale, email, o))
      .catch((e: unknown) => say(feedback, o.errorText(e), 'bad'))
      .finally(() => (busy = false));
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send.click();
  });
  show(root, text('panel-title', o.title), bulletList(o.benefits, 'yes'), text('panel-note', o.note), input, send, feedback, ...(o.extra ?? []), o.back);
}

function showCheckMail(root: HTMLElement, locale: Locale, email: string, o: EmailStepOptions): void {
  const feedback = status();
  let busy = false;
  const resend = button('btn btn-small', tr('mailResend', locale), () => {
    if (busy) return;
    busy = true;
    say(feedback, tr('familyWorking', locale));
    o.send(email)
      .then(() => say(feedback, tr('mailResent', locale), 'good'))
      .catch((e: unknown) => say(feedback, o.errorText(e), 'bad'))
      .finally(() => (busy = false));
  });
  const other = button('btn btn-small', tr('mailOther', locale), () => showEmailStep(root, locale, o));
  show(
    root,
    text('mail-icon', '✉'),
    text('panel-title', tr('mailTitle', locale)),
    stepList([trf('mailStep1', locale, { email }), tr('mailStep2', locale), tr('mailStep3', locale)]),
    feedback,
    resend,
    other,
  );
}
