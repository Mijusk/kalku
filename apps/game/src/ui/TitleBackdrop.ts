import { CREATURES } from '@kalku/content';
import {
  drawCloud,
  drawCreature,
  drawFloatingIsland,
  drawFlowers,
  drawGlyph,
  drawGrass,
  drawTallGrass,
  drawTitleLandscape,
  drawTree,
  GLYPH_CHARS,
  gridToRgba,
  TILE_PX,
  titleLayout,
  type Grid,
  type TitleLayout,
} from '@kalku/art';
import { createRng, type Rng } from '@kalku/exercises';
import { reducedMotion } from './fx';

/** Semilla fija: la portada es igual para todos (y en las capturas). */
const SEED = 2027;
const FPS = 30;

/** Una rejilla de `@kalku/art` como lienzo para pintarla con drawImage. */
function toCanvas(g: Grid): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g.width;
  c.height = g.height;
  const ctx = c.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(g.width, g.height);
    image.data.set(gridToRgba(g));
    ctx.putImageData(image, 0, 0);
  }
  return c;
}

/** Tamaño del píxel en pantalla: grande en pantallas grandes, siempre entero. */
export function pixelScale(width: number, height: number): number {
  return Math.max(2, Math.min(8, Math.round(Math.sqrt((width * height) / (300 * 190)))));
}

interface Cloud {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  speed: number;
}
interface Walker {
  frames: HTMLCanvasElement[];
  x: number;
  baseY: number;
  phase: number;
  speed: number;
}
interface Spark {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  vy: number;
  sway: number;
  born: number;
  life: number;
}

/**
 * Fondo animado de la pantalla de inicio en un `<canvas>` que cubre toda la
 * pantalla (también en móvil vertical): el paisaje fijo sale de `@kalku/art`
 * y aquí se mueven las nubes, las estrellas, la isla, las criaturas y los
 * números que suben como luciérnagas. Con «reducir movimiento» se queda quieto.
 */
export class TitleBackdrop {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private layout!: TitleLayout;
  private still!: HTMLCanvasElement;
  private island = toCanvas(drawFloatingIsland(SEED));
  private clouds: Cloud[] = [];
  private stars: { x: number; y: number; phase: number }[] = [];
  private walkers: Walker[] = [];
  private sparks: Spark[] = [];
  private glyphs: HTMLCanvasElement[] = [];
  private rng: Rng = createRng(SEED);
  private frame = 0;
  private last = 0;
  private nextSpark = 0;
  private readonly onResize = (): void => this.resize();

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'title-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    container.prepend(this.canvas);
    const colors: [number, number][] = [
      [0xfff3b0, 0xc26722],
      [0xdaf4ff, 0x3274b9],
      [0xffe2ee, 0xc4517e],
      [0xecdcff, 0x6c4caa],
    ];
    for (const ch of GLYPH_CHARS) for (const [c, b] of colors) this.glyphs.push(toCanvas(drawGlyph(ch, c, b)));
    this.resize();
    window.addEventListener('resize', this.onResize);
    if (reducedMotion()) this.draw(0);
    else this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.onResize);
    this.canvas.remove();
  }

  private resize(): void {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const p = pixelScale(vw, vh);
    const w = Math.max(64, Math.ceil(vw / p));
    const h = Math.max(96, Math.ceil(vh / p));
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * p}px`;
    this.canvas.style.height = `${h * p}px`;
    this.layout = titleLayout(w, h);
    this.rng = createRng(SEED);
    this.still = this.paintStill();
    this.setupMoving();
    if (reducedMotion()) this.draw(0);
  }

  /** Paisaje + suelo de casillas del mundo, pintado una vez por tamaño. */
  private paintStill(): HTMLCanvasElement {
    const { width: w, height: h, groundTop } = this.layout;
    const c = toCanvas(drawTitleLandscape(w, h, SEED));
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    const rng = this.rng;
    const grass = [0, 1, 2, 3].map((i) => toCanvas(drawGrass(100 + i)));
    const flowers = [0, 1].map((i) => toCanvas(drawFlowers(120 + i)));
    const tall = [0, 1].map((i) => toCanvas(drawTallGrass(130 + i)));
    const cols = Math.ceil(w / TILE_PX);
    for (let y = groundTop; y < h; y += TILE_PX) {
      for (let col = 0; col < cols; col++) {
        const edge = col === 0 || col === cols - 1;
        const pool = edge ? tall : rng.chance(0.18) ? flowers : grass;
        ctx.drawImage(rng.pick(pool), col * TILE_PX, y);
      }
    }
    // Árboles del mundo enmarcando los lados.
    const tree = toCanvas(drawTree(140));
    ctx.drawImage(tree, 0, groundTop - TILE_PX + 4);
    ctx.drawImage(tree, w - TILE_PX, groundTop - TILE_PX + 2);
    if (w > 200) ctx.drawImage(tree, TILE_PX - 4, groundTop - TILE_PX + 8);
    return c;
  }

  private setupMoving(): void {
    const { width: w, horizon, groundTop } = this.layout;
    const rng = this.rng;
    this.clouds = Array.from({ length: Math.max(3, Math.round(w / 70)) }, (_, i) => ({
      img: toCanvas(drawCloud(SEED + i, 22 + rng.int(0, 26))),
      x: rng.int(0, w),
      y: Math.round(horizon * (0.12 + rng.next() * 0.45)),
      speed: 1.5 + rng.next() * 3,
    }));
    this.stars = Array.from({ length: Math.round((w * horizon) / 260) }, () => ({ x: rng.int(0, w - 1), y: rng.int(0, Math.round(horizon * 0.4)), phase: rng.next() * 6.28 }));
    // Criaturas de Pradera Uno saltando en la hierba; una pasea de lado a lado.
    const pool = CREATURES.filter((c) => !c.boss).slice(0, 6);
    const count = Math.max(2, Math.min(5, Math.floor(w / 60)));
    this.walkers = Array.from({ length: count }, (_, i) => {
      const creature = pool[i % pool.length];
      const frames = creature ? drawCreature(creature.look).map(toCanvas) : [];
      return {
        frames,
        x: Math.round(((i + 0.5) / count) * w - 16 + rng.int(-8, 8)),
        baseY: groundTop + Math.min(10, Math.round((this.layout.height - groundTop) * 0.25)) - 6 + rng.int(0, 4),
        phase: rng.next() * 6.28,
        speed: i === 1 ? 6 : 0,
      };
    });
    this.sparks = [];
  }

  private tick(t: number): void {
    this.frame = requestAnimationFrame((n) => this.tick(n));
    if (t - this.last < 1000 / FPS) return;
    this.last = t;
    this.draw(t / 1000);
  }

  private draw(s: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: w, height: h, horizon, lakeBottom, groundTop } = this.layout;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.still, 0, 0);

    // Estrellas que titilan en lo alto del cielo.
    for (const star of this.stars) {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(s * 1.7 + star.phase));
      ctx.fillStyle = `rgba(255, 246, 214, ${a.toFixed(2)})`;
      ctx.fillRect(star.x, star.y, 1, 1);
      if (a > 0.95) {
        ctx.fillStyle = 'rgba(255, 246, 214, 0.45)';
        ctx.fillRect(star.x - 1, star.y, 3, 1);
        ctx.fillRect(star.x, star.y - 1, 1, 3);
      }
    }
    // Nubes que pasan despacio.
    for (const c of this.clouds) {
      const span = w + c.img.width;
      const x = Math.round((((c.x - s * c.speed) % span) + span) % span) - c.img.width;
      ctx.drawImage(c.img, x, c.y);
    }
    // Isla flotante con su cascada.
    if (w >= 110) {
      const ix = Math.round(w * 0.1);
      const iy = Math.round(horizon * (w < h ? 0.5 : 0.3) + Math.sin(s * 0.9) * 2);
      ctx.drawImage(this.island, ix, iy);
      ctx.fillStyle = '#c6efff';
      for (let i = 0; i < 4; i++) {
        const k = (s * 0.8 + i / 4) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillRect(ix + 33 + (i % 2), iy + 40 + Math.round(k * 22), 1, 2);
      }
      ctx.globalAlpha = 1;
    }
    // Brillos en el lago.
    for (let i = 0; i < 6; i++) {
      const k = Math.floor(s * 2 + i * 7.3);
      const r = createRng(k * 31 + i);
      const y = horizon + r.int(0, Math.max(0, lakeBottom - horizon - 1));
      ctx.fillStyle = '#ffe9bc';
      ctx.fillRect(r.int(0, w - 3), y, 2 + r.int(0, 2), 1);
    }
    // Criaturas: respiran (8 fotogramas), saltan de vez en cuando y una pasea.
    for (const m of this.walkers) {
      if (m.frames.length === 0) continue;
      const img = m.frames[Math.floor(s * 8 + m.phase * 3) % m.frames.length];
      if (!img) continue;
      const hop = Math.max(0, Math.sin(s * 2.2 + m.phase)) ** 6 * 7;
      let x = m.x;
      let flip = false;
      if (m.speed > 0) {
        const span = w + 64;
        const pos = (m.x + s * m.speed) % (span * 2);
        flip = pos >= span;
        x = Math.round(flip ? span * 2 - pos - 32 : pos - 32);
      }
      ctx.fillStyle = 'rgba(28, 36, 48, 0.25)';
      ctx.fillRect(x + 8, m.baseY + 29, 16, 2);
      if (flip) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, -x - 32, Math.round(m.baseY - hop));
        ctx.restore();
      } else ctx.drawImage(img, x, Math.round(m.baseY - hop));
    }
    // Números que suben como luciérnagas.
    if (s > this.nextSpark && this.glyphs.length > 0) {
      this.nextSpark = s + 0.45 + this.rng.next() * 0.5;
      const img = this.rng.pick(this.glyphs);
      this.sparks.push({ img, x: this.rng.int(4, w - 9), y: groundTop + this.rng.int(-4, 10), vy: 7 + this.rng.next() * 7, sway: this.rng.next() * 6.28, born: s, life: 5 + this.rng.next() * 3 });
    }
    this.sparks = this.sparks.filter((p) => s - p.born < p.life);
    for (const p of this.sparks) {
      const age = s - p.born;
      const k = age / p.life;
      ctx.globalAlpha = Math.min(1, age * 2, (1 - k) * 2.5);
      ctx.drawImage(p.img, Math.round(p.x + Math.sin(age * 1.5 + p.sway) * 3), Math.round(p.y - age * p.vy));
    }
    ctx.globalAlpha = 1;
    // Luciérnagas sueltas sobre la hierba.
    for (let i = 0; i < Math.round(w / 25); i++) {
      const a = Math.max(0, Math.sin(s * 1.3 + i * 2.1));
      if (a < 0.2) continue;
      ctx.fillStyle = `rgba(255, 236, 140, ${a.toFixed(2)})`;
      ctx.fillRect(Math.round((i * 53.7 + Math.sin(s * 0.5 + i) * 6) % w), Math.round(groundTop - 6 + ((i * 17) % Math.max(1, h - groundTop)) + Math.cos(s * 0.7 + i) * 3), 1, 1);
    }
  }
}
