import type { Locale } from '@kalku/exercises';
import { tr, type StringKey } from './i18n';
import { pickPrivacyLocale, readStoredProgress } from './privacyLocale';
import { tokenFromHash, unsubscribe } from './unsubscribe';
import './privacidad.css';

const root = document.getElementById('baja');

function paint(locale: Locale, message: StringKey, retry?: () => void): void {
  if (!root) return;
  document.documentElement.lang = locale;
  const title = document.createElement('h1');
  title.textContent = tr('unsubscribeTitle', locale);
  const text = document.createElement('p');
  text.setAttribute('role', 'status');
  text.textContent = tr(message, locale);
  root.replaceChildren(title, text);
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tr('unsubscribeRetry', locale);
    button.addEventListener('click', retry);
    root.append(button);
  }
}

async function run(): Promise<void> {
  const guess = pickPrivacyLocale('', readStoredProgress(), navigator.languages);
  const token = tokenFromHash(window.location.hash);
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!token) return paint(guess, 'unsubscribeBadLink');
  if (!baseUrl) return paint(guess, 'unsubscribeFailed');
  paint(guess, 'unsubscribeWorking');
  const result = await unsubscribe(baseUrl, token);
  if (result.kind === 'done') paint(result.locale, 'unsubscribeDone');
  else if (result.kind === 'bad-link') paint(guess, 'unsubscribeBadLink');
  else paint(guess, 'unsubscribeFailed', () => void run());
}

void run();
