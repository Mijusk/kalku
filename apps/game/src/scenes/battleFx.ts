import Phaser from 'phaser';
import { reducedMotion } from '../ui/fx';

/**
 * Efectos del combate dibujados por código: escenario, chispas, rayos y
 * explosiones de partículas. Paleta por material y luz desde arriba a la
 * izquierda, como el resto de dibujos (ver docs/maquetas/dibujos-por-codigo.html).
 */

export const FX_TEXTURES = { spark: 'fx-spark', dot: 'fx-dot', puff: 'fx-puff', star: 'fx-star' } as const;

/** Crea (una vez) las texturas pequeñas de los efectos. */
export function ensureFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(FX_TEXTURES.spark)) return;
  const g = scene.make.graphics({}, false);
  // Chispa: rombo de 7 px con centro blanco.
  g.fillStyle(0xffe066).fillRect(3, 0, 1, 7).fillRect(0, 3, 7, 1).fillRect(2, 2, 3, 3);
  g.fillStyle(0xffffff).fillRect(3, 2, 1, 3).fillRect(2, 3, 3, 1);
  g.generateTexture(FX_TEXTURES.spark, 7, 7);
  g.clear();
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
  g.generateTexture(FX_TEXTURES.dot, 2, 2);
  g.clear();
  // Bolita del borrón: gris con borde oscuro.
  g.fillStyle(0x4b4658).fillCircle(4, 4, 4);
  g.fillStyle(0x9a94a8).fillCircle(4, 4, 3);
  g.fillStyle(0xc9c4d6).fillRect(2, 2, 2, 2);
  g.generateTexture(FX_TEXTURES.puff, 8, 8);
  g.clear();
  // Estrella de 9 px.
  g.fillStyle(0x7a5a00).fillRect(4, 0, 1, 9).fillRect(0, 4, 9, 1);
  g.fillStyle(0xffd84a).fillRect(4, 1, 1, 7).fillRect(1, 4, 7, 1).fillRect(3, 3, 3, 3);
  g.fillStyle(0xffffff).fillRect(4, 3, 1, 1);
  g.generateTexture(FX_TEXTURES.star, 9, 9);
  g.destroy();
}

/**
 * Escenario del combate: cielo en franjas, colinas lejanas, nubes, suelo y
 * dos tarimas de hierba donde se ponen el personaje y la criatura.
 */
export function drawBattleBackground(scene: Phaser.Scene, width: number, height: number, mood: 'day' | 'dusk' | 'cave' = 'day'): void {
  const g = scene.add.graphics().setDepth(-10);
  const skies: Record<typeof mood, number[]> = {
    day: [0x7cc8f2, 0x8fd3f5, 0xa6dcf7, 0xbfe6f9, 0xd6effb],
    dusk: [0x3b2d5c, 0x5b3d73, 0x8a4f7d, 0xc46d6d, 0xeea36b],
    cave: [0x14121c, 0x1b1826, 0x221f30, 0x2a263b, 0x322d45],
  };
  const sky = skies[mood];
  const band = Math.ceil((height * 0.62) / sky.length);
  sky.forEach((c, i) => g.fillStyle(c).fillRect(0, i * band, width, band + 1));

  const horizon = Math.round(height * 0.58);
  if (mood !== 'cave') {
    // Nubes de bloques.
    const cloud = (x: number, y: number, s: number): void => {
      g.fillStyle(0xffffff, 0.9).fillRect(x, y + 4 * s, 28 * s, 6 * s).fillRect(x + 6 * s, y, 14 * s, 6 * s);
      g.fillStyle(0xdbeaf3, 0.9).fillRect(x, y + 9 * s, 28 * s, 2 * s);
    };
    cloud(40, 26, 1);
    cloud(300, 14, 1.4);
    cloud(190, 48, 0.8);
  }
  // Colinas lejanas y cercanas.
  const hills = (color: number, base: number, amp: number, step: number, phase: number): void => {
    g.fillStyle(color);
    for (let x = 0; x < width; x += step) {
      const h = Math.round(amp * (0.6 + 0.4 * Math.sin((x + phase) / 37)) + amp * 0.3 * Math.sin((x + phase) / 13));
      g.fillRect(x, base - h, step, h + 2);
    }
  };
  if (mood === 'cave') {
    hills(0x2e2a40, horizon, 40, 6, 0);
    hills(0x3a3550, horizon + 6, 26, 6, 90);
  } else {
    hills(mood === 'dusk' ? 0x4a3a6a : 0x6fb38a, horizon, 36, 4, 0);
    hills(mood === 'dusk' ? 0x3b5a4a : 0x4f9a5c, horizon + 8, 22, 4, 120);
  }
  // Suelo.
  const ground = mood === 'cave' ? [0x3d3852, 0x353048, 0x2d2940] : [0x6cc04a, 0x5fae3f, 0x4f9a35];
  const rows = ground.length;
  const gh = height - horizon;
  ground.forEach((c, i) => g.fillStyle(c).fillRect(0, horizon + Math.floor((gh * i) / rows), width, Math.ceil(gh / rows) + 1));
  // Matas de hierba sueltas, siempre en el mismo sitio.
  g.fillStyle(mood === 'cave' ? 0x4a4463 : 0x3f8a2c);
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % width;
    const y = horizon + 8 + ((i * 53) % (gh - 12));
    g.fillRect(x, y, 1, 3).fillRect(x + 2, y - 1, 1, 4).fillRect(x + 4, y, 1, 3);
  }
}

/** Tarima elíptica bajo un luchador (sombra y borde de hierba). */
export function drawPlatform(scene: Phaser.Scene, x: number, y: number, w: number, cave = false): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-5);
  g.fillStyle(cave ? 0x262236 : 0x3c7f2a).fillEllipse(x, y + 3, w + 8, w / 3.2 + 6);
  g.fillStyle(cave ? 0x4a4463 : 0x8fd46a).fillEllipse(x, y, w, w / 3.2);
  g.fillStyle(cave ? 0x5a5476 : 0xa8e284).fillEllipse(x - w / 8, y - 2, w / 2, w / 8);
  return g;
}

/** Ráfaga de partículas en un punto: chispas de colores (y bolitas grises si se le cae el borrón). */
export function burst(scene: Phaser.Scene, x: number, y: number, kind: 'spark' | 'puff' | 'star', count = 14): void {
  if (reducedMotion()) return;
  const texture = FX_TEXTURES[kind];
  const emitter = scene.add.particles(x, y, texture, {
    speed: { min: 60, max: kind === 'star' ? 200 : 150 },
    angle: { min: 0, max: 360 },
    scale: { start: kind === 'puff' ? 1.4 : 1.2, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: kind === 'puff' ? 700 : 550,
    gravityY: kind === 'puff' ? -60 : 160,
    emitting: false,
  });
  emitter.setDepth(20);
  emitter.explode(count);
  scene.time.delayedCall(1000, () => emitter.destroy());
}

/**
 * Lanza el hechizo de `from` a `to`: una chispa (o un rayo, más grande y
 * azul) que viaja en arco dejando estela. Llama a `onHit` al llegar.
 */
export function castSpell(
  scene: Phaser.Scene,
  from: { x: number; y: number },
  to: { x: number; y: number },
  strong: boolean,
  onHit: () => void,
): void {
  if (reducedMotion()) {
    onHit();
    return;
  }
  const projectile = scene.add.image(from.x, from.y, FX_TEXTURES.spark).setDepth(15).setScale(strong ? 4 : 2.5);
  if (strong) projectile.setTint(0x9fe8ff);
  const trail = scene.add.particles(0, 0, FX_TEXTURES.dot, {
    follow: projectile,
    frequency: 16,
    lifespan: 320,
    speed: { min: 5, max: 30 },
    scale: { start: strong ? 2.5 : 1.8, end: 0 },
    tint: strong ? [0x9fe8ff, 0xffffff, 0x5ab8ff] : [0xffe066, 0xffffff, 0xffb347],
  });
  trail.setDepth(14);
  const peak = Math.min(from.y, to.y) - (strong ? 30 : 50);
  const curve = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(from.x, from.y),
    new Phaser.Math.Vector2((from.x + to.x) / 2, peak),
    new Phaser.Math.Vector2(to.x, to.y),
  );
  const state = { t: 0 };
  scene.tweens.add({
    targets: state,
    t: 1,
    duration: strong ? 420 : 480,
    ease: strong ? 'Quad.easeIn' : 'Sine.easeInOut',
    onUpdate: () => {
      const p = curve.getPoint(state.t);
      projectile.setPosition(p.x, p.y);
      projectile.rotation += 0.35;
    },
    onComplete: () => {
      projectile.destroy();
      trail.stop();
      scene.time.delayedCall(400, () => trail.destroy());
      onHit();
    },
  });
}
