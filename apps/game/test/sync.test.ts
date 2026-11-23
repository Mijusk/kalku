import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '@kalku/exercises';
import { defaultProgress, type PlayerProgress } from '../src/progress';
import {
  AnswerRejected,
  createPusher,
  deleteChildData,
  exportChildData,
  LOCAL_KEYS,
  MIGRATED_KEY,
  needsNickname,
  NICKNAME_KEY,
  parseServerSkills,
  PENDING_KEY,
  pullProgress,
  submitAnswer,
  type AnswerBody,
  type Backend,
  type KeyValueStore,
  type ServerSkills,
} from '../src/sync';

const PROGRESS_KEY = 'kalku:progress';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

function played(coins = 1): PlayerProgress {
  const p = defaultProgress();
  p.coins = coins;
  p.profile = createProfile();
  p.profile['add-within-10'] = { mastery: 16, attempts: 2, correct: 2 };
  return p;
}

interface Fake extends Backend {
  saves: { id: string; nickname: string; extra: unknown }[];
  answers: AnswerBody[];
  /** Qué hace `answer`: devolver dominio, o fallar con un código del servidor. */
  answerWith: (() => ServerSkills) | { reject: string } | 'offline';
  failSave: boolean;
  failDelete: boolean;
  deleted: number;
  offline: boolean;
  session: string | null;
  server: { nickname: string; extra: unknown; rows: { skill: string; mastery: number; attempts: number; correct: number }[] } | null;
}

function fakeBackend(session: string | null = 'kid-1'): Fake {
  const f: Fake = {
    saves: [],
    answers: [],
    answerWith: () => ({}),
    failSave: false,
    failDelete: false,
    deleted: 0,
    offline: false,
    session,
    server: null,
    async userId() {
      return f.session;
    },
    async signInAnonymously() {
      if (f.offline) throw new Error('offline');
      f.session = 'kid-1';
      return 'kid-1';
    },
    async fetchChild() {
      if (f.offline) throw new Error('offline');
      return f.server ? { nickname: f.server.nickname, extra: f.server.extra } : null;
    },
    async fetchProgress() {
      if (f.offline) throw new Error('offline');
      return f.server?.rows ?? [];
    },
    async save(id, nickname, extra) {
      if (f.offline || f.failSave) throw new Error('fallo');
      f.saves.push({ id, nickname, extra });
      f.server = { nickname, extra, rows: f.server?.rows ?? [] };
    },
    async answer(body) {
      f.answers.push(body);
      const how = f.answerWith;
      if (how === 'offline') throw new Error('offline');
      if (typeof how === 'object') {
        // Como el servidor real: sin ficha, rechaza con `no-child` hasta que se sube.
        if (how.reject === 'no-child' && f.server) return { 'add-within-10': { mastery: 8, attempts: 1, correct: 1 } };
        throw new AnswerRejected(how.reject === 'no-child' ? 409 : 422, how.reject);
      }
      return how();
    },
    async exportData() {
      if (f.offline) throw new Error('offline');
      return { children: [{ nickname: f.server?.nickname }], progress: f.server?.rows ?? [], answers: [] };
    },
    async deleteAccount() {
      if (f.offline || f.failDelete) throw new Error('fallo');
      f.deleted++;
      f.server = null;
      f.session = null;
    },
  };
  return f;
}

afterEach(() => vi.unstubAllGlobals());

function withLocal(progress: PlayerProgress | null): ReturnType<typeof memoryStore> {
  const store = memoryStore({ [NICKNAME_KEY]: 'Zorro', ...(progress ? { [PROGRESS_KEY]: JSON.stringify(progress) } : {}) });
  vi.stubGlobal('localStorage', store);
  return store;
}

describe('migración del progreso local', () => {
  it('se sube una sola vez', async () => {
    const store = withLocal(played());
    const b = fakeBackend();
    const first = await pullProgress(b, store);
    expect(first.progress.coins).toBe(1);
    expect(b.saves).toHaveLength(1);
    expect(store.data[MIGRATED_KEY]).toBe('1');
    await pullProgress(b, store);
    expect(b.saves).toHaveLength(1);
  });

  it('si la subida falla no se marca como hecha y no se pierde lo local', async () => {
    const store = withLocal(played());
    const b = fakeBackend();
    b.failSave = true;
    const r = await pullProgress(b, store);
    expect(r.source).toBe('local');
    expect(r.progress.coins).toBe(1);
    expect(store.data[MIGRATED_KEY]).toBeUndefined();
    expect(store.data[PROGRESS_KEY]).toBeDefined();
    b.failSave = false;
    await pullProgress(b, store);
    expect(b.saves).toHaveLength(1);
    expect(store.data[MIGRATED_KEY]).toBe('1');
  });
});

describe('servidor y local', () => {
  it('gana el servidor aunque el local tenga más', async () => {
    const store = withLocal(played(500));
    const b = fakeBackend();
    b.server = { nickname: 'Zorro', extra: { coins: 7 }, rows: [{ skill: 'add-within-10', mastery: 40, attempts: 5, correct: 4 }] };
    const r = await pullProgress(b, store);
    expect(r.source).toBe('server');
    expect(r.progress.coins).toBe(7);
    expect(JSON.parse(store.data[PROGRESS_KEY] ?? '{}').coins).toBe(7);
    expect(b.saves).toHaveLength(0);
  });

  it('lo jugado sin conexión que no se subió no lo pisa el servidor', async () => {
    const store = withLocal(played(500));
    store.data[PENDING_KEY] = '1';
    const b = fakeBackend();
    b.server = { nickname: 'Zorro', extra: { coins: 7 }, rows: [{ skill: 'add-within-10', mastery: 40, attempts: 5, correct: 4 }] };
    const r = await pullProgress(b, store);
    expect(r.source).toBe('local');
    expect(r.progress.coins).toBe(500);
    expect(b.saves).toHaveLength(1);
    expect(store.data[PENDING_KEY]).toBe('0');
  });

  it('si esa subida falla, se sigue con lo local y queda pendiente', async () => {
    const store = withLocal(played(500));
    store.data[PENDING_KEY] = '1';
    const b = fakeBackend();
    b.failSave = true;
    b.server = { nickname: 'Zorro', extra: { coins: 7 }, rows: [{ skill: 'add-within-10', mastery: 40, attempts: 5, correct: 4 }] };
    const r = await pullProgress(b, store);
    expect(r.progress.coins).toBe(500);
    expect(store.data[PENDING_KEY]).toBe('1');
  });

  it('recupera el apodo del servidor si se perdió en el aparato', async () => {
    const store = memoryStore();
    vi.stubGlobal('localStorage', store);
    const b = fakeBackend();
    b.server = { nickname: 'Cohete', extra: {}, rows: [] };
    await pullProgress(b, store);
    expect(store.data[NICKNAME_KEY]).toBe('Cohete');
  });

  it('servidor sin intentos y local sin intentos: no se sube nada', async () => {
    const store = withLocal(defaultProgress());
    const b = fakeBackend();
    const r = await pullProgress(b, store);
    expect(r.source).toBe('local');
    expect(b.saves).toHaveLength(0);
  });
});

describe('sin conexión', () => {
  it('sin red no lanza error y conserva la copia local', async () => {
    const store = withLocal(played());
    const b = fakeBackend();
    b.offline = true;
    const r = await pullProgress(b, store);
    expect(r.source).toBe('local');
    expect(r.progress.coins).toBe(1);
  });

  it('sin sesión devuelve la copia local', async () => {
    const store = withLocal(played());
    const r = await pullProgress(fakeBackend(null), store);
    expect(r.source).toBe('local');
  });

  it('el pusher no lanza sin red y reintenta en el siguiente guardado', async () => {
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro' });
    const b = fakeBackend(null);
    b.offline = true;
    const pusher = createPusher(b, store, 0);
    pusher.push(played());
    await expect(pusher.flush()).resolves.toBeUndefined();
    expect(b.saves).toHaveLength(0);
    b.offline = false;
    pusher.push(played(2));
    await pusher.flush();
    // La cuenta se crea al volver la conexión.
    expect(b.session).toBe('kid-1');
    expect(b.saves).toHaveLength(1);
    expect(b.saves[0]?.nickname).toBe('Zorro');
    expect(store.data[PENDING_KEY]).toBe('0');
  });
});

describe('needsNickname', () => {
  it('sin servidor no pide apodo', async () => {
    expect(await needsNickname(null, memoryStore())).toBe(false);
  });
  it('sin sesión ni apodo, sí; con apodo o con sesión, no', async () => {
    expect(await needsNickname(fakeBackend(null), memoryStore())).toBe(true);
    expect(await needsNickname(fakeBackend(null), memoryStore({ [NICKNAME_KEY]: 'Zorro' }))).toBe(false);
    expect(await needsNickname(fakeBackend('kid-1'), memoryStore())).toBe(false);
  });
});

describe('exportar y borrar los datos (#50)', () => {
  it('la descarga es el JSON del servidor', async () => {
    const b = fakeBackend();
    b.server = { nickname: 'Zorro', extra: {}, rows: [{ skill: 'add-within-10', mastery: 5, attempts: 1, correct: 1 }] };
    const json = JSON.parse(await exportChildData(b));
    expect(json.children[0].nickname).toBe('Zorro');
    expect(json.progress).toHaveLength(1);
  });

  it('sin cuenta no hay nada que descargar', async () => {
    await expect(exportChildData(fakeBackend(null))).rejects.toThrow();
  });

  it('borrar limpia el servidor y todas las claves locales', async () => {
    const store = memoryStore({ [PROGRESS_KEY]: '{}', [NICKNAME_KEY]: 'Zorro', [MIGRATED_KEY]: '1', [PENDING_KEY]: '1', otra: 'x' });
    const b = fakeBackend();
    await deleteChildData(b, store);
    expect(b.deleted).toBe(1);
    expect(b.server).toBeNull();
    for (const key of LOCAL_KEYS) expect(store.data[key]).toBeUndefined();
    expect(store.data.otra).toBe('x');
  });

  it('si el servidor falla, no se borra nada local', async () => {
    const store = memoryStore({ [PROGRESS_KEY]: '{}', [NICKNAME_KEY]: 'Zorro' });
    const b = fakeBackend();
    b.failDelete = true;
    await expect(deleteChildData(b, store)).rejects.toThrow();
    expect(store.data[NICKNAME_KEY]).toBe('Zorro');
    expect(store.data[PROGRESS_KEY]).toBe('{}');
  });

  it('sin red avisa en lugar de fingir', async () => {
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro' });
    const b = fakeBackend();
    b.offline = true;
    await expect(deleteChildData(b, store)).rejects.toThrow();
    expect(store.data[NICKNAME_KEY]).toBe('Zorro');
  });

  it('sin sesión (nunca llegó a subirse) solo se borra lo local', async () => {
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro' });
    const b = fakeBackend(null);
    await deleteChildData(b, store);
    expect(b.deleted).toBe(0);
    expect(store.data[NICKNAME_KEY]).toBeUndefined();
  });
});

describe('respuestas al servidor (#46)', () => {
  const body: AnswerBody = {
    kind: 'answer',
    skill: 'add-within-10',
    seed: '7',
    given: 5,
    exercise: { a: 2, b: 3, c: 5, hidden: 'c' },
    helped: false,
    slot: 'current',
    hintsUsed: 0,
  };

  it('devuelve el dominio que calcula el servidor', async () => {
    const b = fakeBackend();
    b.answerWith = () => ({ 'add-within-10': { mastery: 8, attempts: 1, correct: 1 } });
    const r = await submitAnswer(b, memoryStore({ [NICKNAME_KEY]: 'Zorro' }), defaultProgress(), body);
    expect(r).toEqual({ 'add-within-10': { mastery: 8, attempts: 1, correct: 1 } });
    expect(b.answers).toEqual([body]);
  });

  it('el dominio no se sube con el resto del progreso: solo lo escribe el servidor', async () => {
    const b = fakeBackend();
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro' });
    const p = played();
    const { pushProgress } = await import('../src/sync');
    await pushProgress(b, store, p);
    expect(JSON.stringify(b.saves[0]?.extra)).not.toContain('mastery');
    expect(b.saves[0]?.extra).toMatchObject({ coins: 1 });
  });

  it('sin ficha en el servidor, la crea y reintenta una vez', async () => {
    const b = fakeBackend();
    b.answerWith = { reject: 'no-child' };
    const store = memoryStore({ [NICKNAME_KEY]: 'Zorro' });
    const r = await submitAnswer(b, store, defaultProgress(), body);
    expect(b.saves).toHaveLength(1);
    expect(b.answers).toHaveLength(2);
    expect(r).toEqual({ 'add-within-10': { mastery: 8, attempts: 1, correct: 1 } });
  });

  it.each([['rechazo', { reject: 'exercise-mismatch' }], ['sin red', 'offline' as const]])('con %s devuelve null y no lanza', async (_n, how) => {
    const b = fakeBackend();
    b.answerWith = how;
    await expect(submitAnswer(b, memoryStore({ [NICKNAME_KEY]: 'Zorro' }), defaultProgress(), body)).resolves.toBeNull();
  });

  it('parseServerSkills ignora lo que no es un dominio válido', () => {
    const raw = { progress: { 'add-within-10': { mastery: 40, attempts: 5, correct: 4 }, 'sub-within-10': { mastery: 500, attempts: 1, correct: 1 }, raro: { mastery: 1, attempts: 1, correct: 1 } } };
    const expected: ServerSkills = { 'add-within-10': { mastery: 40, attempts: 5, correct: 4 } };
    expect(parseServerSkills(raw)).toEqual(expected);
    expect(parseServerSkills(null)).toEqual({});
    expect(parseServerSkills({ progress: 3 })).toEqual({});
  });

  it('AnswerRejected lleva el código', () => {
    expect(new AnswerRejected(409, 'repeated').code).toBe('repeated');
  });
});
