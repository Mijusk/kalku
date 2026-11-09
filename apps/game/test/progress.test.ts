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

describe('colección al cargar', () => {
  it('un guardado antiguo sin colección se carga con la colección vacía', () => {
    const { collection: _omit, ...old } = defaultProgress();
    stubStorage(old);
    expect(loadProgress().collection).toEqual([]);
  });

  it('conserva las criaturas rescatadas y descarta las desconocidas', () => {
    stubStorage({
      ...defaultProgress(),
      collection: [
        { id: 'sumus-brote', date: '2026-11-06' },
        { id: 'dragon', date: '2026-11-06' },
      ],
    });
    expect(loadProgress().collection).toEqual([{ id: 'sumus-brote', date: '2026-11-06' }]);
  });
});

describe('outfit al cargar', () => {
  it('sin guardado, el atuendo por defecto', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    expect(loadProgress().outfit).toEqual(defaultProgress().outfit);
  });

  it('un guardado sin outfit carga el de por defecto', () => {
    const { outfit: _omit, ...old } = defaultProgress();
    stubStorage(old);
    expect(loadProgress().outfit).toEqual(defaultProgress().outfit);
  });

  it('el atuendo guardado se carga', () => {
    const outfit = { ...defaultProgress().outfit, body: 'piel-4', accessory: 'gafas' };
    stubStorage({ ...defaultProgress(), outfit });
    expect(loadProgress().outfit).toEqual(outfit);
  });

  it('piezas inventadas se sustituyen', () => {
    stubStorage({ ...defaultProgress(), outfit: { body: 'x', hair: 'pelo-largo' } });
    const o = loadProgress().outfit;
    expect(o.hair).toBe('pelo-largo');
    expect(o.body).toBe(defaultProgress().outfit.body);
  });
});
