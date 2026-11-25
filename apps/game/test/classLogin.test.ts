import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SECRET_ANIMALS, normalizeCode } from '@kalku/content';
import { createProfile } from '@kalku/exercises';
import { hashStudentCode } from '../src/classes';
import { CLASS_ACTIVE_KEY, CLASS_DEVICE_KEY, activeClassId, classIdFromSearch, classIdFromText, isClassDevice, wipeAbandonedClassData } from '../src/classDevice';
import { ClassLoginError, enterClass, leaveSharedDevice, type ClassLoginBackend } from '../src/classLogin';
import { tr, type StringKey } from '../src/i18n';
import { defaultProgress, loadLocalProgress, saveProgress } from '../src/progress';
import { LOCAL_KEYS, NICKNAME_KEY, OWNER_KEY, type Backend, type KeyValueStore } from '../src/sync';
import * as functionCode from '../../../supabase/functions/class-session/code';

const CLASS = '11111111-1111-4111-8111-111111111111';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

/** El servidor de la clase: dos alumnos, cada uno con su animal, su código y su progreso. */
function fakeServer() {
  const students = [
    { id: 's-ana', nickname: 'Ana', animal: 'owl', code: 'LUNA-47', childId: 'kid-ana', coins: 7 },
    { id: 's-leo', nickname: 'Leo', animal: 'fox', code: 'PINO-12', childId: 'kid-leo', coins: 30 },
  ];
  const state = { session: null as string | null, signedOut: 0, offline: false };
  const login: ClassLoginBackend = {
    async listNicknames() {
      return students.map((s) => ({ id: s.id, nickname: s.nickname }));
    },
    async enterWithAnimal(classId, studentId, animal) {
      const s = students.find((x) => x.id === studentId);
      if (classId !== CLASS || !s || s.animal !== animal) throw new ClassLoginError('wrong');
      state.session = s.childId;
      return { childId: s.childId, nickname: s.nickname };
    },
    async enterWithCode(classId, code) {
      const s = students.find((x) => x.code === normalizeCode(code));
      if (classId !== CLASS || !s) throw new ClassLoginError('wrong');
      state.session = s.childId;
      return { childId: s.childId, nickname: s.nickname };
    },
    async signOut() {
      state.session = null;
      state.signedOut++;
    },
  };
  // Lo que ve el juego con esa sesión: el progreso del alumno en el servidor.
  const sync: Backend = {
    async userId() {
      return state.session;
    },
    async signInAnonymously() {
      throw new Error('no se crea cuenta nueva');
    },
    async fetchChild(id) {
      const s = students.find((x) => x.childId === id);
      return s ? { nickname: s.nickname, extra: { coins: s.coins, placementDone: true, version: 1 } } : null;
    },
    async fetchProgress() {
      return [{ skill: 'add-within-10', mastery: 40, attempts: 5, correct: 4 }];
    },
    async save() {},
    async answer() {
      return {};
    },
    async exportData() {
      return {};
    },
    async deleteAccount() {},
  };
  return { students, state, login, sync };
}

afterEach(() => vi.unstubAllGlobals());

describe('entrar en la clase', () => {
  it('con su animal entra y baja SU progreso', async () => {
    const { login, sync, state } = fakeServer();
    const local = memoryStore();
    vi.stubGlobal('localStorage', local);
    const entry = await enterClass(login, sync, local, memoryStore(), CLASS, { kind: 'animal', studentId: 's-ana', animal: 'owl' });
    expect(entry).toEqual({ childId: 'kid-ana', nickname: 'Ana' });
    expect(state.session).toBe('kid-ana');
    expect(loadLocalProgress()?.coins).toBe(7);
    expect(local.data[NICKNAME_KEY]).toBe('Ana');
    expect(local.data[OWNER_KEY]).toBe('kid-ana');
  });

  it('con otro animal no entra: no hay sesión ni datos', async () => {
    const { login, sync, state } = fakeServer();
    const local = memoryStore();
    const session = memoryStore();
    vi.stubGlobal('localStorage', local);
    for (const animal of SECRET_ANIMALS.map((a) => a.id).filter((a) => a !== 'owl')) {
      await expect(enterClass(login, sync, local, session, CLASS, { kind: 'animal', studentId: 's-ana', animal })).rejects.toMatchObject({ code: 'wrong' });
    }
    expect(state.session).toBeNull();
    expect(local.data).toEqual({});
    expect(session.data).toEqual({});
  });

  it('si falla no toca lo que había en el aparato (otro niño sigue como estaba)', async () => {
    const { login, sync } = fakeServer();
    const local = memoryStore({ [OWNER_KEY]: 'kid-casa', [NICKNAME_KEY]: 'Casa' });
    await expect(enterClass(login, sync, local, memoryStore(), CLASS, { kind: 'animal', studentId: 's-ana', animal: 'fox' })).rejects.toBeInstanceOf(ClassLoginError);
    expect(local.data[OWNER_KEY]).toBe('kid-casa');
    expect(local.data[NICKNAME_KEY]).toBe('Casa');
  });

  it('el código de la tarjeta entra con o sin tilde, guion o minúsculas; el de otra clase no', async () => {
    const { login, sync } = fakeServer();
    for (const code of ['LUNA-47', 'luna 47', 'Lúna–47', ' luna47 ']) {
      const local = memoryStore();
      vi.stubGlobal('localStorage', local);
      const entry = await enterClass(login, sync, local, memoryStore(), CLASS, { kind: 'code', code });
      expect(entry.childId, code).toBe('kid-ana');
    }
    await expect(enterClass(login, sync, memoryStore(), memoryStore(), '22222222-2222-4222-8222-222222222222', { kind: 'code', code: 'LUNA-47' })).rejects.toMatchObject({ code: 'wrong' });
    await expect(enterClass(login, sync, memoryStore(), memoryStore(), CLASS, { kind: 'code', code: 'LUNA-48' })).rejects.toMatchObject({ code: 'wrong' });
  });

  it('un alumno no hereda el progreso del anterior en el mismo aparato', async () => {
    const { login, sync } = fakeServer();
    const local = memoryStore();
    const session = memoryStore();
    vi.stubGlobal('localStorage', local);
    await enterClass(login, sync, local, session, CLASS, { kind: 'animal', studentId: 's-ana', animal: 'owl' });
    expect(loadLocalProgress()?.coins).toBe(7);
    await leaveSharedDevice(login, local, session, { flush: async () => {} });
    await enterClass(login, sync, local, session, CLASS, { kind: 'animal', studentId: 's-leo', animal: 'fox' });
    expect(loadLocalProgress()?.coins).toBe(30);
    expect(local.data[NICKNAME_KEY]).toBe('Leo');
  });
});

describe('salir en un aparato compartido', () => {
  it('no deja ninguna clave del alumno en localStorage, ni su sesión', async () => {
    const { login, sync, state } = fakeServer();
    const local = memoryStore();
    const session = memoryStore();
    vi.stubGlobal('localStorage', local);
    await enterClass(login, sync, local, session, CLASS, { kind: 'animal', studentId: 's-ana', animal: 'owl' });
    // Juega: guarda progreso y hay algo pendiente de subir.
    const progress = defaultProgress();
    progress.coins = 99;
    progress.profile = createProfile();
    saveProgress(progress);
    local.setItem('kalku:pending', '1');
    expect(Object.keys(local.data).length).toBeGreaterThan(0);

    let queueCleared = false;
    const classId = await leaveSharedDevice(login, local, session, {
      flush: async () => {},
      clearQueue: async () => {
        queueCleared = true;
      },
    });
    expect(classId).toBe(CLASS);
    // Las respuestas sin enviar no pasan al siguiente niño del aparato.
    expect(queueCleared).toBe(true);
    expect(local.data).toEqual({});
    expect(session.data).toEqual({});
    expect(state.session).toBeNull();
    expect(activeClassId(session)).toBeNull();
    // Todas las claves del niño, también las que se añadan a LOCAL_KEYS, quedan fuera.
    for (const key of LOCAL_KEYS) expect(local.getItem(key)).toBeNull();
  });

  it('sin red borra igualmente, y espera como mucho el tiempo dado a lo pendiente', async () => {
    const { login } = fakeServer();
    login.signOut = () => new Promise<void>(() => undefined); // sin red: nunca contesta
    const local = memoryStore({ 'kalku:progress': '{}', [NICKNAME_KEY]: 'Ana', [CLASS_DEVICE_KEY]: '1' });
    const session = memoryStore({ [CLASS_ACTIVE_KEY]: CLASS });
    vi.useFakeTimers();
    const done = leaveSharedDevice(login, local, session, { waitMs: 3000, flush: () => new Promise<void>(() => undefined) });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(1000);
    await done;
    vi.useRealTimers();
    expect(local.data).toEqual({});
    expect(session.data).toEqual({});
  });
});

describe('aparato de clase', () => {
  it('lee el id de la clase del QR y lo que se pega', () => {
    expect(classIdFromSearch(`?clase=${CLASS}`)).toBe(CLASS);
    expect(classIdFromSearch('?clase=hola')).toBeNull();
    expect(classIdFromSearch('')).toBeNull();
    expect(classIdFromText(`https://kalku.app/?clase=${CLASS.toUpperCase()}`)).toBe(CLASS);
    expect(classIdFromText(` ${CLASS} `)).toBe(CLASS);
    expect(classIdFromText('nada')).toBeNull();
  });

  it('es aparato de clase con ?clase (también sin id) o con un alumno dentro', () => {
    expect(isClassDevice(`?clase=${CLASS}`, undefined)).toBe(true);
    expect(isClassDevice('?clase', undefined)).toBe(true);
    expect(isClassDevice('', memoryStore({ [CLASS_ACTIVE_KEY]: CLASS }))).toBe(true);
    expect(isClassDevice('', memoryStore())).toBe(false);
  });

  it('si cierran la pestaña sin salir, al abrir otra se borran los datos del alumno', () => {
    const local = memoryStore({ 'kalku:progress': '{}', [NICKNAME_KEY]: 'Ana', [CLASS_DEVICE_KEY]: '1' });
    expect(wipeAbandonedClassData(local, memoryStore(), LOCAL_KEYS)).toBe(true);
    expect(local.data).toEqual({});
  });

  it('no borra si el alumno sigue dentro (recargar) ni los datos de un niño de casa', () => {
    const inside = memoryStore({ 'kalku:progress': '{}', [CLASS_DEVICE_KEY]: '1' });
    expect(wipeAbandonedClassData(inside, memoryStore({ [CLASS_ACTIVE_KEY]: CLASS }), LOCAL_KEYS)).toBe(false);
    expect(inside.data['kalku:progress']).toBe('{}');
    const home = memoryStore({ 'kalku:progress': '{}', [NICKNAME_KEY]: 'Casa' });
    expect(wipeAbandonedClassData(home, memoryStore(), LOCAL_KEYS)).toBe(false);
    expect(home.data[NICKNAME_KEY]).toBe('Casa');
  });
});

describe('Edge Function class-session', () => {
  it('normaliza y calcula el hash igual que el cliente y que el docente', async () => {
    for (const code of ['LUNA-47', 'luna 47', 'Lúna–47', 'PINO12']) {
      expect(functionCode.normalizeCode(code)).toBe(normalizeCode(code));
      expect(await functionCode.hashStudentCode(CLASS, code)).toBe(await hashStudentCode(CLASS, code));
    }
  });

  it('lee la petición sin fiarse: ids válidos y uno de los 6 animales', () => {
    expect(functionCode.parseLoginRequest({ classId: CLASS, studentId: CLASS, animal: 'fox' })).toMatchObject({ kind: 'animal', animal: 'fox' });
    expect(functionCode.parseLoginRequest({ classId: CLASS, code: 'LUNA-47' })).toEqual({ kind: 'code', classId: CLASS, code: 'LUNA-47' });
    expect(functionCode.parseLoginRequest({ classId: CLASS, studentId: CLASS, animal: 'perro' })).toBeNull();
    expect(functionCode.parseLoginRequest({ classId: 'x', code: 'LUNA-47' })).toBeNull();
    expect(functionCode.parseLoginRequest({ classId: CLASS, studentId: 'x', animal: 'fox' })).toBeNull();
    expect(functionCode.parseLoginRequest({ classId: CLASS, code: 'A'.repeat(31) })).toBeNull();
    expect(functionCode.parseLoginRequest(null)).toBeNull();
    // Los animales de la función son los de @kalku/content.
    expect([...functionCode.ANIMALS]).toEqual(SECRET_ANIMALS.map((a) => a.id));
  });

  it('lee lo que devuelve la base', () => {
    expect(functionCode.parseLoginResult({ status: 'ok', child_id: CLASS, nickname: 'Ana' })).toEqual({ status: 'ok', childId: CLASS, nickname: 'Ana' });
    expect(functionCode.parseLoginResult({ status: 'locked', retry_after: 30 })).toEqual({ status: 'locked', retryAfter: 30 });
    expect(functionCode.parseLoginResult({ status: 'wrong', retry_after: 0 })).toEqual({ status: 'wrong', retryAfter: 0 });
    expect(functionCode.parseLoginResult({ status: 'unknown' })).toEqual({ status: 'unknown' });
    expect(functionCode.parseLoginResult({ status: 'ok', child_id: 'no' })).toBeNull();
    expect(functionCode.parseLoginResult(null)).toBeNull();
  });
});

const CLASS_KEYS: StringKey[] = [
  'classLoginTitle', 'classLoginPickName', 'classLoginPickAnimal', 'classLoginHello', 'classLoginHaveCode', 'classLoginCodeInput',
  'classLoginCodeGo', 'classLoginEntering', 'classLoginWrong', 'classLoginHelp', 'classLoginNetwork', 'classLoginNoStudents',
  'classLoginNoClass', 'classLoginLink', 'classLoginBadLink', 'classLoginContinue', 'classLoginMine', 'classLeave', 'classLeaving',
];

describe('textos y botones de entrar en clase', () => {
  it('todos los textos existen en castellano y catalán', () => {
    for (const key of CLASS_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
    }
    for (const a of SECRET_ANIMALS) {
      expect(a.name.es.length).toBeGreaterThan(0);
      expect(a.name.ca.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });

  it('los botones de la entrada miden al menos 48 px', () => {
    const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
    const minHeight = (selector: string): number => {
      const block = css.split('}').find((b) => b.trim().startsWith(selector));
      const m = /min-height:\s*(\d+)px/.exec(block ?? '');
      return m ? Number(m[1]) : 0;
    };
    expect(minHeight('.class-grid .btn {')).toBeGreaterThanOrEqual(48);
    expect(minHeight('.class-grid .btn-animal')).toBeGreaterThanOrEqual(48);
    expect(minHeight('.btn-small')).toBeGreaterThanOrEqual(48);
  });
});
