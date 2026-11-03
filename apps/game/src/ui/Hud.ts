import type { Locale } from '@kalku/exercises';
import { tr } from '../i18n';

export interface HudState {
  locale: Locale;
  coins: number;
  gems: number;
  skillName: string;
  /** Dominio de la habilidad actual, 0–100. */
  mastery: number;
}

/** Marcador superior: Cifras, gemas y dominio de la habilidad actual. */
export class Hud {
  private readonly root: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    container.append(this.root);
  }

  update(state: HudState): void {
    const coins = document.createElement('span');
    coins.className = 'hud-coins';
    coins.textContent = `● ${state.coins} ${tr('coins', state.locale)}`;

    const gems = document.createElement('span');
    gems.className = 'hud-gems';
    gems.textContent = `◆ ${state.gems}`;

    const skill = document.createElement('span');
    skill.className = 'hud-skill';
    skill.textContent = `${state.skillName} · ${tr('mastery', state.locale)}`;

    const bar = document.createElement('span');
    bar.className = 'hud-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(state.mastery));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const fill = document.createElement('span');
    fill.style.width = `${state.mastery}%`;
    bar.append(fill);

    this.root.replaceChildren(coins, gems, skill, bar);
  }
}
