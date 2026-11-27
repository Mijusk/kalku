import Phaser from 'phaser';
import { DAY_LIGHT, type DayTime, type Weather } from '@kalku/content';

const SKY_TEXTURES = { rain: 'sky-rain', snow: 'sky-snow', leaf: 'sky-leaf', petal: 'sky-petal', firefly: 'sky-firefly' } as const;

function ensureSkyTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(SKY_TEXTURES.rain)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xc6efff).fillRect(0, 0, 1, 5);
  g.generateTexture(SKY_TEXTURES.rain, 1, 5);
  g.clear();
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
  g.generateTexture(SKY_TEXTURES.snow, 2, 2);
  g.clear();
  // Hoja: blanca, se tiñe de naranja, ocre o rojo al salir.
  g.fillStyle(0xffffff).fillRect(1, 0, 2, 1).fillRect(0, 1, 3, 1).fillRect(1, 2, 1, 1);
  g.generateTexture(SKY_TEXTURES.leaf, 3, 3);
  g.clear();
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 1).fillRect(1, 1, 1, 1);
  g.generateTexture(SKY_TEXTURES.petal, 2, 2);
  g.clear();
  // Luciérnaga: punto amarillo con halo.
  g.fillStyle(0xfff3a0, 0.35).fillRect(0, 0, 4, 4);
  g.fillStyle(0xfff9c8).fillRect(1, 1, 2, 2);
  g.generateTexture(SKY_TEXTURES.firefly, 4, 4);
  g.destroy();
}

/** Por encima del mapa y de las criaturas, por debajo de nada más (la interfaz va en HTML). */
const SKY_DEPTH = 40;

/**
 * Pinta el cielo sobre el mapa: el velo de luz de la hora, el de las nubes y
 * lo que cae (lluvia, nieve, hojas, pétalos) o las luciérnagas de noche.
 * Todo va pegado a la cámara. Con «menos movimiento» solo queda el color.
 */
export function createSky(scene: Phaser.Scene, weather: Weather, time: DayTime, reducedMotion: boolean): void {
  const { width, height } = scene.scale;
  const veil = (color: number, alpha: number): void => {
    if (alpha <= 0) return;
    // Grande y centrado: con zoom de cámara sigue cubriendo toda la pantalla.
    scene.add.rectangle(width / 2, height / 2, width * 4, height * 4, color, alpha).setScrollFactor(0).setDepth(SKY_DEPTH);
  };
  const light = DAY_LIGHT[time];
  veil(light.color, light.alpha);
  if (weather === 'clouds' || weather === 'rain' || weather === 'snow') veil(0x5d6b80, weather === 'clouds' ? 0.1 : 0.16);
  if (reducedMotion) return;

  ensureSkyTextures(scene);
  const top = { x: { min: -40, max: width + 40 }, y: -8 };
  const emit = (key: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): void => {
    scene.add.particles(0, 0, key, { ...top, ...config }).setScrollFactor(0).setDepth(SKY_DEPTH + 1);
  };
  switch (weather) {
    case 'rain':
      emit(SKY_TEXTURES.rain, { speedY: { min: 240, max: 300 }, speedX: { min: -40, max: -30 }, lifespan: 1300, frequency: 12, quantity: 2, alpha: 0.7 });
      break;
    case 'snow':
      emit(SKY_TEXTURES.snow, { speedY: { min: 18, max: 36 }, speedX: { min: -14, max: 14 }, lifespan: 9000, frequency: 110, alpha: 0.9 });
      break;
    case 'leaves':
      emit(SKY_TEXTURES.leaf, {
        speedY: { min: 22, max: 40 }, speedX: { min: 8, max: 30 }, lifespan: 9000, frequency: 420,
        rotate: { start: 0, end: 360 }, scale: 1.5, tint: [0xf29233, 0xc26722, 0xde5a4c, 0xf3c435],
      });
      break;
    case 'petals':
      emit(SKY_TEXTURES.petal, {
        speedY: { min: 16, max: 30 }, speedX: { min: 10, max: 26 }, lifespan: 10000, frequency: 380,
        rotate: { start: 0, end: 180 }, scale: 1.5, tint: [0xffb0cb, 0xffe2ee, 0xffffff],
      });
      break;
    case 'sun':
    case 'clouds':
      break;
  }
  if (time === 'night' || time === 'dusk') {
    scene.add
      .particles(0, 0, SKY_TEXTURES.firefly, {
        x: { min: 0, max: width },
        y: { min: height * 0.15, max: height },
        speedX: { min: -8, max: 8 },
        speedY: { min: -6, max: 6 },
        lifespan: 4200,
        frequency: time === 'night' ? 260 : 700,
        // Se encienden y se apagan despacio.
        alpha: { onEmit: () => 0, onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * Math.PI) },
      })
      .setScrollFactor(0)
      .setDepth(SKY_DEPTH + 1);
  }
}
