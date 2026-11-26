import { createRng, randomSeed } from '@kalku/exercises';

/**
 * Efectos en HTML encima del canvas: números que saltan, carteles de racha
 * y confeti. Van en HTML (no en el canvas) para que los números se lean en
 * letra clara y nítida, nunca en fuente pixel.
 */

/** Con «reducir movimiento» del sistema, sin animaciones rápidas. */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Posición en píxeles de #game de un punto del juego (coordenadas de Phaser). */
function toScreen(gameX: number, gameY: number, gameWidth: number): { x: number; y: number } | undefined {
  const host = document.getElementById('game');
  const canvas = host?.querySelector('canvas');
  if (!host || !canvas) return undefined;
  const hostRect = host.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / gameWidth;
  return { x: rect.left - hostRect.left + gameX * scale, y: rect.top - hostRect.top + gameY * scale };
}

export type FloatKind = 'damage' | 'big' | 'heal' | 'info' | 'coins';

/** Texto que salta y sube desde un punto del juego y se quita solo. */
export function floatText(gameX: number, gameY: number, text: string, kind: FloatKind, gameWidth: number): void {
  const pos = toScreen(gameX, gameY, gameWidth);
  const host = document.getElementById('game');
  if (!pos || !host) return;
  const el = document.createElement('div');
  el.className = `fx-float fx-${kind}`;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;
  host.append(el);
  setTimeout(() => el.remove(), 1300);
}

/** Cartel grande en el centro del combate (racha, «¡vuelve a brillar!»). */
export function banner(text: string, kind: 'streak' | 'win' | 'info' = 'info', ms = 1400): void {
  const host = document.getElementById('game');
  if (!host) return;
  host.querySelector('.fx-banner')?.remove();
  const el = document.createElement('div');
  el.className = `fx-banner fx-banner-${kind}`;
  el.setAttribute('role', 'status');
  el.textContent = text;
  host.append(el);
  setTimeout(() => el.remove(), ms);
}

const CONFETTI_COLORS = ['#f4c542', '#5fd35f', '#8fd3ff', '#ff8fa3', '#ffffff', '#c39bff'];

/** Lluvia de confeti en #game. Con «reducir movimiento», no sale. */
export function confetti(pieces = 60): void {
  if (reducedMotion()) return;
  const host = document.getElementById('game');
  if (!host) return;
  const layer = document.createElement('div');
  layer.className = 'fx-confetti';
  layer.setAttribute('aria-hidden', 'true');
  // Solo decorativo, pero con semilla como todo lo aleatorio del juego.
  const rng = createRng(randomSeed());
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('span');
    p.style.left = `${rng.next() * 100}%`;
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#fff';
    p.style.animationDelay = `${rng.next() * 0.5}s`;
    p.style.animationDuration = `${1.4 + rng.next() * 1.2}s`;
    p.style.setProperty('--drift', `${(rng.next() - 0.5) * 120}px`);
    p.style.setProperty('--spin', `${rng.next() * 720 - 360}deg`);
    layer.append(p);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 3200);
}

/** Quita todos los efectos que queden (al cambiar de escena). */
export function clearFx(): void {
  document.querySelectorAll('#game .fx-float, #game .fx-banner, #game .fx-confetti').forEach((e) => e.remove());
}
