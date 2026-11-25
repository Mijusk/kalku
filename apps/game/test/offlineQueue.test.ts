import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyAnswer, createProfile, createRng, generateExercise, parseAnswerRequest, validateAnswer, type MasteryProfile, type SkillId } from '@kalku/exercises';
import { keyValueQueue, memoryQueue, type QueueStore } from '../src/offlineQueue';
import { AnswerRejected, drainQueue, exerciseView, NICKNAME_KEY, type AnswerBody, type Backend, type KeyValueStore } from '../src/sync';
import { tr } from '../src/i18n';

const SKILL: SkillId = 'add-within-10';

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = { [NICKNAME_KEY]: 'Zorro' };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

/** Respuestas jugadas con semillas fijas: acierta salvo cada tercera. */
function played(count: number): { bodies: AnswerBody[]; local: MasteryProfile } {
  let local = createProfile();
  const bodies: AnswerBody[] = [];
  for (let seed = 1; seed <= count; seed++) {
    const exercise = generateExercise(SKILL, createRng(seed));
    const right = seed % 3 !== 0;
    const given = right ? exercise.answer : exercise.answer + 1;
    bodies.push({ kind: 'answer', skill: SKILL, seed: String(seed), given, exercise: exerciseView(exercise), helped: false, slot: 'current', hintsUsed: 0 });
    local = applyAnswer(local, SKILL, { correct: right, helped: false, slot: 'current' });
  }
  return { bodies, local };
}

/** Servidor falso con las mismas reglas que la función `answer`: valida con @kalku/exercises y rechaza semillas repetidas. */
function fakeServer() {
  const s = {
    profile: createProfile(),
    seeds: new Set<string>(),
    received: [] as string[],
    online: true,
    /** Se corta la red tras aceptar tantas respuestas (`undefined`: nunca). */
    dropAfter: undefined as number | undefined,
  };
  const backend: Backend = {
    async userId() {
      return 'kid-1';
    },
    async signInAnonymously() {
      return 'kid-1';
    },
    async fetchChild() {
      return null;
    },
    async fetchProgress() {
      return Object.entries(s.profile).map(([skill, p]) => ({ skill, ...p }));
    },
    async save() {},
    async answer(body) {
      if (!s.online) throw new Error('offline');
      if (s.dropAfter !== undefined && s.received.length >= s.dropAfter) {
        s.online = false;
        throw new Error('offline');
      }
      if (body.kind !== 'answer') throw new AnswerRejected(400, 'kind');
      const parsed = parseAnswerRequest(body);
      if (!parsed.ok) throw new AnswerRejected(400, parsed.error);
      if (s.seeds.has(body.seed)) throw new AnswerRejected(409, 'repeated');
      const result = validateAnswer(s.profile, parsed.value);
      if (!result.ok) throw new AnswerRejected(422, result.error);
      s.seeds.add(body.seed);
      s.received.push(body.seed);
      s.profile = result.profile;
      return Object.fromEntries(result.changed.map((k) => [k, result.profile[k]]));
    },
    async exportData() {
      return {};
    },
    async deleteAccount() {},
  };
  return { s, backend };
}

async function fill(queue: QueueStore, bodies: AnswerBody[]): Promise<void> {
  for (const b of bodies) await queue.add(b);
}

afterEach(() => vi.unstubAllGlobals());

describe('cola de respuestas sin conexión (#54)', () => {
  it('20 respuestas sin conexión dan en el servidor el mismo dominio que en local', async () => {
    const { bodies, local } = played(20);
    const { s, backend } = fakeServer();
    const queue = memoryQueue();
    await fill(queue, bodies);
    const r = await drainQueue(backend, memoryStore(), queue);
    expect(r.left).toBe(0);
    expect(s.profile).toEqual(local);
    expect(r.skills?.[SKILL]).toEqual(local[SKILL]);
  });

  it('enviar dos veces la misma cola no duplica respuestas ni cambia el dominio', async () => {
    const { bodies, local } = played(20);
    const { s, backend } = fakeServer();
    const first = memoryQueue();
    await fill(first, bodies);
    await drainQueue(backend, memoryStore(), first);
    const second = memoryQueue();
    await fill(second, bodies);
    const r = await drainQueue(backend, memoryStore(), second);
    expect(s.received).toHaveLength(20);
    expect(s.profile).toEqual(local);
    expect(r.left).toBe(0);
    expect(await second.all()).toEqual([]);
  });

  it('las respuestas llegan en el orden en que se jugaron', async () => {
    const { bodies } = played(20);
    const { s, backend } = fakeServer();
    const queue = memoryQueue();
    await fill(queue, bodies);
    await drainQueue(backend, memoryStore(), queue);
    expect(s.received).toEqual(bodies.map((b) => (b.kind === 'answer' ? b.seed : '')));
  });

  it('si la red cae a mitad no se pierde ninguna y al reintentar se completan sin duplicar', async () => {
    const { bodies, local } = played(20);
    const { s, backend } = fakeServer();
    s.dropAfter = 8;
    const queue = memoryQueue();
    await fill(queue, bodies);
    const cut = await drainQueue(backend, memoryStore(), queue);
    expect(cut.left).toBe(12);
    expect(await queue.all()).toHaveLength(12);
    s.online = true;
    s.dropAfter = undefined;
    const done = await drainQueue(backend, memoryStore(), queue);
    expect(done.left).toBe(0);
    expect(s.received).toHaveLength(20);
    expect(s.profile).toEqual(local);
  });

  it('una respuesta rechazada sale de la cola y el dominio local pasa a ser el del servidor', async () => {
    const { bodies } = played(5);
    const forged = bodies.map((b, i) => (i === 2 && b.kind === 'answer' ? { ...b, exercise: { ...b.exercise, a: b.exercise.a + 1 } } : b));
    const { s, backend } = fakeServer();
    const queue = memoryQueue();
    await fill(queue, forged);
    const r = await drainQueue(backend, memoryStore(), queue);
    expect(r.left).toBe(0);
    expect(s.received).toHaveLength(4);
    expect(r.skills?.[SKILL]).toEqual(s.profile[SKILL]);
    expect(s.profile[SKILL].attempts).toBe(4);
  });

  it('sobrevive a recargar la página (almacén de claves) y mantiene el orden', async () => {
    const { bodies } = played(3);
    const store = memoryStore();
    await fill(keyValueQueue(store), bodies);
    const reloaded = keyValueQueue(store);
    expect((await reloaded.all()).map((i) => i.body)).toEqual(bodies);
    await reloaded.remove((await reloaded.all())[0]?.id ?? 0);
    expect(await keyValueQueue(store).all()).toHaveLength(2);
  });

  it('la prueba de nivel también se encola', async () => {
    const queue = memoryQueue();
    const body: AnswerBody = { kind: 'placement', answers: [] };
    await queue.add(body);
    expect((await queue.all())[0]?.body).toEqual(body);
  });

  it('el aviso existe en castellano y catalán', () => {
    for (const locale of ['es', 'ca'] as const) expect(tr('offlineNotice', locale).trim().length).toBeGreaterThan(0);
    expect(tr('offlineNotice', 'ca')).not.toBe(tr('offlineNotice', 'es'));
  });
});

describe('vaciar la cola (aparato compartido, #53)', () => {
  it('clear deja la cola vacía en memoria y en localStorage', async () => {
    const mem = memoryQueue();
    const data = new Map<string, string>();
    const kv = keyValueQueue({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
    for (const q of [mem, kv]) {
      await q.add({ seed: 1, answer: 3, skill: 'add-within-10' } as unknown as AnswerBody);
      await q.add({ seed: 2, answer: 4, skill: 'add-within-10' } as unknown as AnswerBody);
      expect(await q.all()).toHaveLength(2);
      await q.clear();
      expect(await q.all()).toHaveLength(0);
    }
  });
});
