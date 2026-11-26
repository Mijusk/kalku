import { SCENES, type Band, type DialogLine, type SceneId } from './scenes.js';
import { SCENES_OLDER } from './scenesOlder.js';

/** Los globos de una escena en el tramo del niño; si falta la de mayores, la de pequeños. */
export function sceneLines(id: SceneId, band: Band = 'young'): readonly DialogLine[] {
  if (band === 'older') return SCENES_OLDER[id] ?? SCENES[id];
  return SCENES[id];
}
