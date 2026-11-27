import type Phaser from 'phaser';
import { REGION_STORIES, regionIndex, regionStory } from '@kalku/content';
import { loadProgress, saveProgress, type PlayerProgress } from '../progress';
import { applyQuestEvent } from '../storyFlow';
import { banner } from '../ui/fx';
import { ARRIVAL_KEY, WORLD_STATE_KEY } from '../worldState';
import { completeMissions, completeQuest, finishRegion, jumpToRegion, masterAll, skipStep } from './devActions';

/**
 * Panel de desarrollo para Luis: pasar la historia, saltar de región, ganar
 * combates de un toque… Solo existe en local (`npm run dev`) y en las vistas
 * previas de Cloudflare; la web publicada (rama main) ni siquiera lo descarga
 * (`__DEV_TOOLS__` en vite.config.ts). Es una herramienta de adulto, sin
 * traducir: nunca la ve un niño.
 */

const CSS = `
.dev-toggle { position: fixed; left: 8px; bottom: 8px; z-index: 90; min-width: 48px; min-height: 48px; border-radius: 12px;
  border: 2px solid #f3ecd6; background: #7a2d8c; color: #fff; font: 700 14px/1 system-ui, sans-serif; cursor: pointer; opacity: .85; }
.dev-panel { position: fixed; left: 8px; bottom: 64px; z-index: 90; width: 230px; max-height: calc(100vh - 80px); overflow-y: auto;
  padding: 10px; border-radius: 12px; background: rgba(27, 20, 40, .94); color: #f3ecd6; font: 600 13px/1.3 system-ui, sans-serif;
  display: flex; flex-direction: column; gap: 6px; }
.dev-panel[hidden] { display: none; }
.dev-panel h3 { margin: 4px 0 0; font-size: 12px; text-transform: uppercase; opacity: .7; }
.dev-panel button { min-height: 40px; border-radius: 8px; border: 0; background: #f3ecd6; color: #1b2a1f; font: inherit; cursor: pointer; text-align: left; padding: 0 10px; }
.dev-panel button.dev-danger { background: #e8a0a0; }
.dev-panel .dev-state { font-weight: 400; opacity: .85; }
`;

export function mountDevTools(game: Phaser.Game): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const panel = document.createElement('div');
  panel.className = 'dev-panel';
  panel.hidden = true;
  const toggle = document.createElement('button');
  toggle.className = 'dev-toggle';
  toggle.textContent = 'DEV';
  toggle.title = 'Herramientas de desarrollo';
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  });
  document.body.append(panel, toggle);

  const active = (key: string): Phaser.Scene | undefined => game.scene.getScenes(true).find((s) => s.scene.key === key);

  /** Guarda y vuelve a montar el mapa (en otra pantalla, se verá al volver). */
  function apply(change: (p: PlayerProgress) => boolean | void, message: string, options: { arrival?: string } = {}): void {
    // El combate y los acertijos guardan su propia copia al terminar y pisarían el cambio.
    if (active('battle') || active('riddle')) return void banner('Vuelve al mapa primero', 'info');
    const progress = loadProgress();
    if (change(progress) === false) return void banner('Nada que hacer', 'info');
    saveProgress(progress);
    // Si hay encargo, que el mapa lo cree enseguida (solo sale con la historia de la región terminada).
    applyQuestEvent(undefined, progress);
    game.registry.remove(WORLD_STATE_KEY);
    if (options.arrival) game.registry.set(ARRIVAL_KEY, options.arrival);
    const world = active('world');
    if (world) world.scene.restart();
    else game.scene.getScenes(true)[0]?.scene.start('world');
    banner(message, 'info');
    render();
  }

  function render(): void {
    const progress = loadProgress();
    const story = progress.story;
    panel.replaceChildren();
    const state = document.createElement('div');
    state.className = 'dev-state';
    state.textContent = `Historia: ${story.region} · paso ${story.step} · en ${progress.at} · ${progress.coins} Cifras`;
    panel.append(state);

    section('Combate');
    add('Ganar de un toque', () => {
      const battle = active('battle') as (Phaser.Scene & { devWin?: () => void }) | undefined;
      const riddle = active('riddle') as (Phaser.Scene & { devSolve?: () => void }) | undefined;
      if (battle?.devWin) battle.devWin();
      else if (riddle?.devSolve) riddle.devSolve();
      else banner('No hay combate ni acertijo', 'info');
    });

    section('Historia');
    add('Pasar este paso', () => apply(skipStep, 'Paso saltado'));
    add('Terminar la región', () => apply(finishRegion, 'Región terminada'));
    for (const region of REGION_STORIES) {
      add(`Ir a ${region.name.es}`, () => {
        // La primera vez que se llega, el mapa cuenta la llegada.
        const first = regionIndex(region.id) > regionIndex(regionStory(loadProgress().story.region).id);
        apply((p) => void jumpToRegion(p, region.id), `Ahora en ${region.name.es}`, first ? { arrival: region.id } : {});
      });
    }

    section('Encargos y misiones');
    add('Completar el encargo', () => apply(completeQuest, 'Encargo completado'));
    add('Completar las misiones', () => apply((p) => completeMissions(p) > 0, 'Misiones completadas'));

    section('Progreso');
    add('Dominar todas las habilidades', () => apply(masterAll, 'Todo dominado'));
    add('+1000 Cifras', () => apply((p) => void (p.coins += 1000), '+1000 Cifras'));
    let armed = false;
    const reset = add('Borrar la partida', () => {
      if (!armed) {
        armed = true;
        reset.textContent = '¿Seguro? Toca otra vez';
        return;
      }
      // También la cuenta anónima (sb-…): si no, el servidor devolvería el progreso.
      for (const key of Object.keys(localStorage)) if (key.startsWith('kalku') || key.startsWith('sb-')) localStorage.removeItem(key);
      window.location.reload();
    });
    reset.classList.add('dev-danger');
  }

  function section(title: string): void {
    const h = document.createElement('h3');
    h.textContent = title;
    panel.append(h);
  }

  function add(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', onClick);
    panel.append(b);
    return b;
  }
}
