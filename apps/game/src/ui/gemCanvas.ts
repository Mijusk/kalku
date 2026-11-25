import { drawGem, gridToRgba, GEM_PX } from '@kalku/art';
import type { SkillDefinition } from '@kalku/exercises';

/** Gema de una habilidad como canvas HTML (pixel art escalado por CSS). */
export function gemCanvas(skill: SkillDefinition, lit: boolean, className: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.width = GEM_PX;
  canvas.height = GEM_PX;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(GEM_PX, GEM_PX);
    image.data.set(gridToRgba(drawGem(skill.operator, lit)));
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}
