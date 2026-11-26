import { describe, expect, it } from 'vitest';
import { bandForGrade, SCENES, SCENES_OLDER, sceneLines, type SceneId } from '../src/index.js';

describe('dos inicios por edad', () => {
  const ids = Object.keys(SCENES) as SceneId[];

  it('cada escena tiene versión de mayores, en castellano y catalán', () => {
    for (const id of ids) {
      const lines = SCENES_OLDER[id];
      expect(lines?.length, id).toBeGreaterThan(0);
      for (const line of lines ?? []) {
        expect(line.text.es.trim(), id).not.toBe('');
        expect(line.text.ca.trim(), id).not.toBe('');
      }
    }
  });

  it('el prólogo tiene las mismas viñetas en los dos tramos', () => {
    expect(SCENES_OLDER.prologue.length).toBe(SCENES.prologue.length);
  });

  it('el tramo cambia el texto, no la escena que toca', () => {
    expect(sceneLines('uni-hello', 'young')).toBe(SCENES['uni-hello']);
    expect(sceneLines('uni-hello', 'older')).toBe(SCENES_OLDER['uni-hello']);
    expect(sceneLines('uni-hello')).toBe(SCENES['uni-hello']);
  });

  it('hasta 2.º, Brote; desde 3.º, Aventura', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(bandForGrade)).toEqual(['young', 'young', 'young', 'older', 'older', 'older', 'older']);
  });
});
