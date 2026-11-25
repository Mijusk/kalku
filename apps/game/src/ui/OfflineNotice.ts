import { tr } from '../i18n';
import { loadProgress } from '../progress';
import { onPendingChange, pendingAnswers } from '../sync';

/**
 * Franja discreta «sin conexión» (#54). Sale solo mientras no hay red o quedan
 * respuestas por enviar, sin contador y sin bloquear el juego.
 */
export function mountOfflineNotice(): void {
  const el = document.createElement('div');
  el.className = 'offline-notice';
  el.setAttribute('role', 'status');
  el.hidden = true;
  document.body.append(el);

  const update = (): void => {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    el.hidden = !(offline || pendingAnswers() > 0);
    if (!el.hidden) el.textContent = tr('offlineNotice', loadProgress().locale);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  onPendingChange(update);
  update();
}
