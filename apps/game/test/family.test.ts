import { afterEach, describe, expect, it, vi } from 'vitest';
import { enterAsChildHere, FamilyError, forgetOtherChild, guardianConsent, joinThisDevice, LINK_CODE_LENGTH, normalizeLinkCode, summarize, toFamilyError, type FamilyBackend } from '../src/family';
import { PRIVACY_VERSION } from '@kalku/content';
import { defaultProgress } from '../src/progress';
import { LOCAL_KEYS, NICKNAME_KEY, OWNER_KEY, type KeyValueStore } from '../src/sync';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

function fakeFamily(overrides: Partial<FamilyBackend> = {}): FamilyBackend & { entered: string[]; joined: string[]; withdrawn: string[] } {
  const f = {
    entered: [] as string[],
    joined: [] as string[],
    withdrawn: [] as string[],
    async adultId() {
      return 'adult';
    },
    async childId() {
      return 'kid-1';
    },
    async sendLoginLink() {},
    async signOutAdult() {},
    async createLinkCode() {
      return 'ABCD2345';
    },
    async joinWithCode(code: string) {
      f.joined.push(code);
      return { childId: 'kid-1', nickname: 'Zorro' };
    },
    async listChildren() {
      return [];
    },
    async leave() {},
    async withdrawConsent(id: string) {
      f.withdrawn.push(id);
    },
    async getSummaryPrefs() {
      return { enabled: true, locale: 'es' as const };
    },
    async setSummaryPrefs() {},
    async enterAsChild(id: string) {
      f.entered.push(id);
    },
    ...overrides,
  };
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe('errores de la familia', () => {
  it('reconoce el mensaje del servidor', () => {
    expect(toFamilyError({ message: 'child-in-family' }).code).toBe('child-in-family');
    expect(toFamilyError({ message: 'P0001: family-full' }).code).toBe('family-full');
    expect(toFamilyError({ message: 'invalid-code' }).code).toBe('invalid-code');
  });

  it('reconoce los errores del consentimiento', () => {
    expect(toFamilyError({ message: 'consent-required' }).code).toBe('consent-required');
    expect(toFamilyError({ message: 'email-not-confirmed' }).code).toBe('email-not-confirmed');
  });

  it('lo desconocido es un fallo de red', () => {
    expect(toFamilyError(new Error('Failed to fetch')).code).toBe('network');
    expect(toFamilyError(null).code).toBe('network');
  });

  it('no envuelve dos veces', () => {
    const e = new FamilyError('family-full');
    expect(toFamilyError(e)).toBe(e);
  });
});

describe('resumen de hijos', () => {
  it('cuenta habilidades con intentos y el dominio medio, solo de cada niño', () => {
    const out = summarize(
      [
        { id: 'a', nickname: 'Ana' },
        { id: 'b', nickname: 'Beto' },
      ],
      [
        { child_id: 'a', skill: 'add-within-10', mastery: 40, attempts: 5 },
        { child_id: 'a', skill: 'sub-within-10', mastery: 21, attempts: 3 },
        { child_id: 'a', skill: 'add-within-20-carry', mastery: 0, attempts: 0 },
        { child_id: 'b', skill: 'add-within-10', mastery: 90, attempts: 9 },
      ],
    );
    expect(out).toEqual([
      { id: 'a', nickname: 'Ana', skillsTried: 2, averageMastery: 31 },
      { id: 'b', nickname: 'Beto', skillsTried: 1, averageMastery: 90 },
    ]);
  });

  it('un niño sin progreso sale con ceros', () => {
    expect(summarize([{ id: 'a', nickname: 'Ana' }], [])).toEqual([{ id: 'a', nickname: 'Ana', skillsTried: 0, averageMastery: 0 }]);
  });
});

describe('unir desde este aparato', () => {
  it('el niño pide el código y el adulto lo usa; devuelve el apodo', async () => {
    const f = fakeFamily();
    expect(await joinThisDevice(f, guardianConsent(true))).toBe('Zorro');
    expect(f.joined).toEqual(['ABCD2345']);
  });

  it('si el servidor rechaza, lanza el error y no inventa nada', async () => {
    const f = fakeFamily({
      async joinWithCode() {
        throw new FamilyError('family-full');
      },
    });
    await expect(joinThisDevice(f, guardianConsent(true))).rejects.toMatchObject({ code: 'family-full' });
  });
});

describe('entrar como un niño', () => {
  it('la copia local de otro niño no se mezcla', async () => {
    const mine = defaultProgress();
    mine.coins = 99;
    const store = memoryStore({ [NICKNAME_KEY]: 'Otro', [OWNER_KEY]: 'kid-2', 'kalku:progress': JSON.stringify(mine) });
    vi.stubGlobal('localStorage', store);
    const f = fakeFamily();
    await enterAsChildHere(f, store, 'kid-1');
    expect(f.entered).toEqual(['kid-1']);
    for (const key of LOCAL_KEYS) expect(store.data[key]).toBeUndefined();
  });

  it('si ya era la copia de ese niño, no se toca', async () => {
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro', [OWNER_KEY]: 'kid-1' });
    vi.stubGlobal('localStorage', store);
    await enterAsChildHere(fakeFamily(), store, 'kid-1');
    expect(store.data[NICKNAME_KEY]).toBe('Zorro');
  });

  it('si el servidor falla, la copia local se queda como estaba', async () => {
    const store = memoryStore({ [NICKNAME_KEY]: 'Otro', [OWNER_KEY]: 'kid-2' });
    vi.stubGlobal('localStorage', store);
    const f = fakeFamily({
      async enterAsChild() {
        throw new FamilyError('network');
      },
    });
    await expect(enterAsChildHere(f, store, 'kid-1')).rejects.toMatchObject({ code: 'network' });
    expect(store.data[NICKNAME_KEY]).toBe('Otro');
    expect(store.data[OWNER_KEY]).toBe('kid-2');
  });

  it('forgetOtherChild borra todas las claves del niño', () => {
    const store = memoryStore(Object.fromEntries(LOCAL_KEYS.map((k) => [k, 'x'])));
    forgetOtherChild(store, 'kid-9');
    expect(Object.keys(store.data)).toEqual([]);
  });
});

describe('consentimiento', () => {
  it('la casilla y la versión de la política vigente viajan al unir', () => {
    expect(guardianConsent(true)).toEqual({ isGuardian: true, policyVersion: PRIVACY_VERSION });
    expect(guardianConsent(false).isGuardian).toBe(false);
  });

  it('unir sin la declaración falla con consent-required y no llega a unir', async () => {
    const f = fakeFamily({
      async joinWithCode() {
        throw new FamilyError('consent-required');
      },
    });
    await expect(joinThisDevice(f, guardianConsent(false))).rejects.toMatchObject({ code: 'consent-required' });
  });
});

describe('código para unir a un niño', () => {
  it('se escribe como sea y se compara limpio, con 8 letras y cifras', () => {
    expect(normalizeLinkCode('k7pm 4xq2')).toBe('K7PM4XQ2');
    expect(normalizeLinkCode(' K7PM-4XQ2 ')).toHaveLength(LINK_CODE_LENGTH);
    // Vacío o a medias no deja pasar al paso del permiso (y no enseña ningún error).
    expect(normalizeLinkCode('')).toHaveLength(0);
    expect(normalizeLinkCode('K7P').length).toBeLessThan(LINK_CODE_LENGTH);
  });
});
