import type { Locale, SkillDefinition } from '@kalku/exercises';
import { tr } from '../i18n';
import { gemCanvas } from './gemCanvas';

/** Cuánto dura la animación de la gema (ms). Solo es visual: no suma ni quita nada. */
const DURATION_MS = 2400;

/** Gema grande que aparece, gira y brilla con el nombre de la habilidad. No bloquea el juego. */
export function showGemCelebration(skill: SkillDefinition, locale: Locale): void {
  const ui = document.getElementById('ui');
  if (!ui) return;
  const overlay = document.createElement('div');
  overlay.className = 'gem-celebration';
  overlay.setAttribute('role', 'status');
  const glow = document.createElement('div');
  glow.className = 'gem-glow';
  const title = document.createElement('p');
  title.className = 'gem-celebration-title';
  title.textContent = tr('gem', locale);
  const name = document.createElement('p');
  name.className = 'gem-celebration-name';
  name.textContent = skill.name[locale];
  overlay.append(glow, gemCanvas(skill, true, 'gem-big'), title, name);
  ui.append(overlay);
  window.setTimeout(() => overlay.remove(), DURATION_MS);
}
