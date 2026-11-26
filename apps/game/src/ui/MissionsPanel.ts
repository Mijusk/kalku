import { missionText } from '@kalku/content';
import { tr } from '../i18n';
import { missionProgress } from '../missions';
import type { PlayerProgress } from '../progress';

/**
 * Panel «Misiones» del mapa: las 3 de hoy y la de la semana, con su barra.
 * Sin cuenta atrás ni rachas: solo lo que lleva (regla 2 y 3).
 */
export function openMissionsPanel(container: HTMLElement, progress: PlayerProgress): Promise<void> {
  const locale = progress.locale;
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'settings missions-panel';
    root.setAttribute('role', 'dialog');
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    const title = (text: string): HTMLElement => {
      const p = document.createElement('p');
      p.className = 'panel-title';
      p.textContent = text;
      return p;
    };
    const list = (weekly: boolean): HTMLElement => {
      const ul = document.createElement('ul');
      ul.className = 'missions-list';
      for (const { mission, have, done } of missionProgress(progress).filter((m) => m.mission.weekly === weekly)) {
        const li = document.createElement('li');
        li.className = 'mission';
        li.dataset.done = String(done);
        const text = document.createElement('span');
        text.className = 'mission-text';
        text.textContent = `${done ? '✅ ' : ''}${missionText(mission, locale)}`;
        const bar = document.createElement('span');
        bar.className = 'progress-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.round((100 * have) / mission.need)}%`;
        bar.append(fill);
        const count = document.createElement('span');
        count.className = 'mission-count';
        count.textContent = `${have}/${mission.need} · +${mission.reward} ${tr('coins', locale)}`;
        li.append(text, bar, count);
        ul.append(li);
      }
      return ul;
    };
    const note = document.createElement('p');
    note.className = 'panel-feedback';
    note.textContent = tr('missionsNote', locale);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn-primary';
    close.textContent = tr('back', locale);
    close.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    root.append(title(tr('missionsToday', locale)), list(false), title(tr('missionsWeek', locale)), list(true), note, close);
    container.append(root);
    close.focus();
  });
}
