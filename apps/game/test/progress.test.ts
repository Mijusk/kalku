import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '@kalku/exercises';
import { defaultProgress, fromServerRows, loadProgress, parseProgress, toServerRows } from '../src/progress';

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

describe('zonas abiertas y tesoros al cargar', () => {
  it('un guardado antiguo sin zonas se carga vacío', () => {
    const { zonesOpened: _z, treasures: _t, ...old } = defaultProgress();
    stubStorage(old);
    expect(loadProgress().zonesOpened).toEqual([]);
    expect(loadProgress().treasures).toEqual([]);
  });

  it('conserva las zonas y tesoros conocidos y descarta lo demás', () => {
    stubStorage({ ...defaultProgress(), zonesOpened: ['cueva', 'cueva', 'nada', 7], treasures: ['tesoro-cueva', 'x'] });
    expect(loadProgress().zonesOpened).toEqual(['cueva']);
    expect(loadProgress().treasures).toEqual(['tesoro-cueva']);
    stubStorage({ ...defaultProgress(), zonesOpened: 'cueva', treasures: { a: 1 } });
    expect(loadProgress().zonesOpened).toEqual([]);
    expect(loadProgress().treasures).toEqual([]);
  });
});

describe('XP del personaje', () => {
  it('un guardado antiguo sin xp empieza en 0', () => {
    expect(parseProgress({ version: 1, coins: 5 }).xp).toBe(0);
  });

  it('valores corruptos (negativos, texto, NaN) dan 0 y los decimales se redondean hacia abajo', () => {
    for (const bad of [-10, 'mucha', Number.NaN, null, {}]) expect(parseProgress({ version: 1, xp: bad }).xp).toBe(0);
    expect(parseProgress({ version: 1, xp: 450.8 }).xp).toBe(450);
  });

  it('va en children.extra y vuelve del servidor', () => {
    const p = defaultProgress();
    p.xp = 777;
    const { extra, rows } = toServerRows(p);
    expect(extra.xp).toBe(777);
    expect(fromServerRows(JSON.parse(JSON.stringify(extra)), rows).xp).toBe(777);
  });
});

describe('ida y vuelta con el servidor', () => {
  it('PlayerProgress → filas → PlayerProgress sin pérdidas', () => {
    const p = defaultProgress();
    p.coins = 42;
    p.xp = 1234;
    p.gems = ['add-within-10'];
    p.locale = 'ca';
    p.placementDone = true;
    p.settings = { timed: false, textSize: 'large', autoVoice: true };
    p.encounters = { sumus: 3 };
    p.profile['add-within-10'] = { mastery: 37.5, attempts: 10, correct: 8 };
    const { extra, rows } = toServerRows(p);
    // Pasa por JSON, como en la red.
    const back = fromServerRows(JSON.parse(JSON.stringify(extra)), JSON.parse(JSON.stringify(rows)));
    expect(back).toEqual(p);
  });

  it('el extra no lleva el dominio ni datos personales', () => {
    const { extra } = toServerRows(defaultProgress());
    expect(Object.keys(extra).sort()).toEqual(['collection', 'coins', 'xp', 'encounters', 'gems', 'locale', 'placementDone', 'settings', 'zonesOpened', 'treasures'].sort());
  });

  it('el dominio nunca baja de 0 ni sube de 100, y los aciertos no superan los intentos', () => {
    const p = defaultProgress();
    p.profile['add-within-10'] = { mastery: 250, attempts: 3, correct: 9 };
    p.profile['sub-within-10'] = { mastery: -5, attempts: -2, correct: 1 };
    const { rows } = toServerRows(p);
    const add = rows.find((r) => r.skill === 'add-within-10');
    const sub = rows.find((r) => r.skill === 'sub-within-10');
    expect(add).toMatchObject({ mastery: 100, attempts: 3, correct: 3 });
    expect(sub).toMatchObject({ mastery: 0, attempts: 0, correct: 0 });
  });

  it('datos corruptos del servidor se ignoran', () => {
    const back = fromServerRows('basura', [
      { skill: 'no-existe', mastery: 50, attempts: 1, correct: 1 },
      { skill: 'add-within-10', mastery: 'x', attempts: null, correct: {} },
    ]);
    expect(back).toEqual(defaultProgress());
    const odd = fromServerRows({ coins: 'mucho', gems: [1, 'a'], locale: 'fr' }, []);
    expect(odd.coins).toBe(0);
    expect(odd.xp).toBe(0);
    expect(odd.gems).toEqual(['a']);
    expect(odd.locale).toBe('es');
  });

  it('el dominio como texto (numeric) se entiende', () => {
    const back = fromServerRows({}, [{ skill: 'add-within-10', mastery: '40.5', attempts: 5, correct: 4 }]);
    expect(back.profile['add-within-10']).toEqual({ mastery: 40.5, attempts: 5, correct: 4 });
  });
});
