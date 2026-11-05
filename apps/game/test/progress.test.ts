import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '@kalku/exercises';
import { defaultProgress, loadProgress } from '../src/progress';

function stubStorage(value: unknown): void {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  vi.stubGlobal('localStorage', { getItem: () => raw, setItem: () => undefined });
}

afterEach(() => vi.unstubAllGlobals());

describe('placementDone al cargar', () => {
  it('sin guardado, la prueba está pendiente', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    expect(loadProgress().placementDone).toBe(false);
  });

  it('un guardado sin el campo y sin intentos sigue pendiente', () => {
    const { placementDone: _omit, ...old } = defaultProgress();
    stubStorage(old);
    expect(loadProgress().placementDone).toBe(false);
  });

  it('un guardado antiguo con intentos cuenta como hecho', () => {
    const { placementDone: _omit, ...old } = defaultProgress();
    const profile = createProfile();
    profile['add-within-10'] = { mastery: 8, attempts: 1, correct: 1 };
    stubStorage({ ...old, profile });
    expect(loadProgress().placementDone).toBe(true);
  });

  it('respeta true y false guardados', () => {
    stubStorage({ ...defaultProgress(), placementDone: true });
    expect(loadProgress().placementDone).toBe(true);
    stubStorage({ ...defaultProgress(), placementDone: false });
    expect(loadProgress().placementDone).toBe(false);
  });

  it('un valor corrupto se ignora', () => {
    stubStorage({ ...defaultProgress(), placementDone: 'sí' });
    expect(loadProgress().placementDone).toBe(false);
  });

  it('un guardado ilegible da el progreso por defecto', () => {
    stubStorage('{no es json');
    expect(loadProgress().placementDone).toBe(false);
  });
});
