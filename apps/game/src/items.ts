import { CHARACTER_PX, drawCharacter, gridToRgba } from '@kalku/art';
import { dateKey, newlyEarned, outfitPieces, type LockReason, type Outfit, type OutfitPiece, type WardrobeState } from '@kalku/content';
import { capCoins, SKILLS, type CapResult, type Locale, type SkillProgress, type Slot } from '@kalku/exercises';
import { tr, trf } from './i18n';
import type { PlayerProgress } from './progress';
import { ZONES } from '@kalku/content';

/** Lo que el armario necesita saber del progreso. */
export function wardrobeOf(progress: PlayerProgress): WardrobeState {
  // Copias: el combate añade gemas con push y hay que poder comparar el antes y el después.
  return { owned: [...progress.owned], treasures: [...progress.treasures], gems: [...progress.gems], xp: progress.xp };
}

/**
 * Suma las Cifras de un acierto con el límite diario (#13): lo ya dominado da
 * hasta un tope al día; lo que cuesta, un pequeño extra. Nunca resta.
 */
export function addAnswerCoins(progress: PlayerProgress, coins: number, skillBefore: SkillProgress, slot: Slot, now = new Date()): CapResult {
  const result = capCoins({ coins, skill: skillBefore, slot }, progress.coinDay, dateKey(now));
  progress.coins += result.coins;
  progress.coinDay = result.state;
  return result;
}

/** Texto del candado de una pieza: «Desde el nivel 5», «En el cofre de: Cueva»… */
export function lockText(reason: LockReason, locale: Locale): string {
  switch (reason.kind) {
    case 'level':
      return trf('lockLevel', locale, { n: reason.level });
    case 'gem': {
      const skill = SKILLS.find((s) => s.id === reason.gem);
      return trf('lockGem', locale, { skill: skill ? skill.name[locale] : reason.gem });
    }
    case 'treasure': {
      const zone = ZONES.find((z) => z.id === reason.zone);
      return trf('lockTreasure', locale, { zone: zone ? zone.name[locale] : reason.zone });
    }
    case 'gift':
      return tr('lockGift', locale);
    case 'price':
      return trf('lockPrice', locale, { n: reason.price });
  }
}

/** El personaje con un atuendo, como canvas HTML de 16 px (se escala por CSS, en pixel art). */
export function heroCanvas(outfit: Outfit, className: string, frame = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.width = CHARACTER_PX;
  canvas.height = CHARACTER_PX;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(CHARACTER_PX, CHARACTER_PX);
    image.data.set(gridToRgba(drawCharacter(outfitPieces(outfit).map((p) => p.art), frame)));
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}

/** Piezas que se acaban de ganar entre dos momentos (subir de nivel, gema, tesoro). */
export function earnedSince(before: WardrobeState, after: PlayerProgress): OutfitPiece[] {
  return newlyEarned(before, wardrobeOf(after));
}
