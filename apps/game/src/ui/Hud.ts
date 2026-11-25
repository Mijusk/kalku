import { levelProgress, type Locale } from '@kalku/exercises';
import { tr } from '../i18n';

export interface HudState {
  locale: Locale;
  coins: number;
  /** Experiencia total; de ella salen el nivel y la barra. */
  xp: number;
  gems: number;
  skillName: string;
  /** Dominio de la habilidad actual, 0–100. */
  mastery: number;
}

/** Marcador superior: nivel y barra de XP, Cifras, gemas y dominio de la habilidad actual. */
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

    const lp = levelProgress(state.xp);
    const level = document.createElement('span');
    level.className = 'hud-level';
    level.textContent = `${tr('level', state.locale)} ${lp.level}`;
    const xpBar = document.createElement('span');
    xpBar.className = 'hud-bar hud-xp';
    xpBar.setAttribute('role', 'progressbar');
    xpBar.setAttribute('aria-label', `${tr('level', state.locale)} ${lp.level}`);
    xpBar.setAttribute('aria-valuenow', String(Math.round(lp.fraction * 100)));
    xpBar.setAttribute('aria-valuemin', '0');
    xpBar.setAttribute('aria-valuemax', '100');
    const xpFill = document.createElement('span');
    xpFill.style.width = `${Math.round(lp.fraction * 100)}%`;
    xpBar.append(xpFill);

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

    this.root.replaceChildren(level, xpBar, coins, gems, skill, bar);
  }
}
