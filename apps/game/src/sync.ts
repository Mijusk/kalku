import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { SKILL_IDS, type Exercise, type PlacementAnswer, type SkillId, type SkillProgress, type Slot } from '@kalku/exercises';
import {
  defaultProgress,
  fromServerRows,
  hasAttempts,
  applyServerSkills,
  loadLocalProgress,
  loadProgress,
  onProgressSaved,
  toServerRows,
  writeLocalProgress,
  type PlayerProgress,
} from './progress';
import { CLASS_DEVICE_KEY } from './classDevice';
import { appQueue, QUEUE_LS_KEY, type QueueItem, type QueueStore } from './offlineQueue';
import { getSupabase } from './supabase';

/**
 * Sincronización del progreso con Supabase (#45).
 *
 * El servidor manda; localStorage es la copia para jugar sin conexión. Todo
 * fallo de red se traga: el juego sigue con la copia local y se reintenta en
 * el siguiente guardado. Aquí no se guarda ningún dato personal, solo el apodo.
 */

/** Lo que `sync` necesita del servidor (se sustituye por uno falso en los tests). */
export interface Backend {
  /** Id de la sesión actual, o `null` si no hay. */
  userId(): Promise<string | null>;
  signInAnonymously(): Promise<string>;
  fetchChild(id: string): Promise<{ nickname: string; extra: unknown } | null>;
  fetchProgress(id: string): Promise<{ skill: string; mastery: unknown; attempts: unknown; correct: unknown }[]>;
  /** Sube la ficha y el resto del progreso. El dominio NO se sube: lo escribe el servidor al corregir (#46). */
  save(id: string, nickname: string, extra: unknown): Promise<void>;
  /** Manda respuestas a la Edge Function `answer`. Lanza `AnswerRejected` si el servidor las rechaza. */
  answer(body: AnswerBody): Promise<ServerSkills>;
  /** Todo lo que el servidor guarda del niño (RGPD: portabilidad). */
  exportData(): Promise<unknown>;
  /** Borra la cuenta del niño y todas sus filas (RGPD: supresión) y cierra la sesión. */
  deleteAccount(): Promise<void>;
}

/** El servidor respondió, pero no aceptó la respuesta (`code` es su `error`). */
export class AnswerRejected extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`answer ${status} ${code}`);
  }
}

export type AnswerBody =
  | { kind: 'answer'; skill: SkillId; seed: string; given: number; exercise: ExerciseView; helped: boolean; slot: Slot; hintsUsed: 0 | 1 | 2 | 3 }
  | { kind: 'placement'; answers: PlacementAnswer[] };

type ExerciseView = { a: number; b: number; c: number; hidden: Exercise['hidden'] };

/** Dominio que devuelve el servidor, solo de las habilidades que cambiaron. */
export type ServerSkills = Partial<Record<SkillId, SkillProgress>>;

/** La parte del ejercicio que el servidor compara con el que regenera desde la semilla. */
export function exerciseView(exercise: Exercise): ExerciseView {
  return { a: exercise.a, b: exercise.b, c: exercise.c, hidden: exercise.hidden };
}

/** Lee la respuesta del servidor sin fiarse de su forma. */
export function parseServerSkills(raw: unknown): ServerSkills {
  const progress = typeof raw === 'object' && raw !== null ? (raw as { progress?: unknown }).progress : undefined;
  const out: ServerSkills = {};
  if (typeof progress !== 'object' || progress === null) return out;
  for (const skill of SKILL_IDS) {
    const r = (progress as Record<string, unknown>)[skill];
    if (typeof r !== 'object' || r === null) continue;
    const { mastery, attempts, correct } = r as Record<string, unknown>;
    if (typeof mastery === 'number' && typeof attempts === 'number' && typeof correct === 'number' && mastery >= 0 && mastery <= 100) {
      out[skill] = { mastery, attempts, correct };
    }
  }
  return out;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const NICKNAME_KEY = 'kalku:nickname';
export const MIGRATED_KEY = 'kalku:migrated';
/** '1' mientras haya guardados locales que el servidor aún no ha confirmado (jugar sin conexión). */
export const PENDING_KEY = 'kalku:pending';
/** Id del niño al que pertenece la copia local: si la sesión cambia de niño (#47), la copia no se mezcla. */
export const OWNER_KEY = 'kalku:owner';

export function supabaseBackend(client: SupabaseClient): Backend {
  return {
    async userId() {
      const { data } = await client.auth.getSession();
      return data.session?.user.id ?? null;
    },
    async signInAnonymously() {
      const { data, error } = await client.auth.signInAnonymously();
      if (error || !data.user) throw error ?? new Error('Sin usuario');
      return data.user.id;
    },
    async fetchChild(id) {
      const { data, error } = await client.from('children').select('nickname, extra').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async fetchProgress(id) {
      const { data, error } = await client.from('progress').select('skill, mastery, attempts, correct').eq('child_id', id);
      if (error) throw error;
      return data ?? [];
    },
    async save(id, nickname, extra) {
      const child = await client.from('children').upsert({ id, nickname, extra });
      if (child.error) throw child.error;
    },
    async answer(body) {
      const { data, error } = await client.functions.invoke('answer', { body });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const res = error.context as Response;
          const detail = (await res.json().catch(() => ({}))) as { error?: unknown };
          throw new AnswerRejected(res.status, typeof detail.error === 'string' ? detail.error : '');
        }
        throw error;
      }
      return parseServerSkills(data);
    },
    async exportData() {
      const { data, error } = await client.rpc('export_my_data');
      if (error) throw error;
      return data;
    },
    async deleteAccount() {
      const { error } = await client.rpc('delete_my_account');
      if (error) throw error;
      // La cuenta ya no existe: se cierra la sesión solo en este aparato.
      await client.auth.signOut({ scope: 'local' });
    },
  };
}

/** Crea la cuenta anónima si no hay sesión. Lanza si no hay red. */
export async function ensureAccount(backend: Backend): Promise<string> {
  return (await backend.userId()) ?? (await backend.signInAnonymously());
}

export interface PullResult {
  progress: PlayerProgress;
  source: 'server' | 'local';
}

/**
 * Al arrancar: decide con qué progreso se juega.
 * - Gana el servidor, salvo que no tenga ningún intento y el local sí; entonces
 *   el local se sube (migración, una sola vez: `kalku:migrated`).
 * - Sin sesión o sin red: la copia local.
 */
export async function pullProgress(backend: Backend, store: KeyValueStore): Promise<PullResult> {
  try {
    const id = await backend.userId();
    // Si la sesión es de otro niño que la copia local, la copia se descarta antes de leerla.
    if (id) claimLocalCopy(store, id);
  } catch {
    // Sin red o sin sesión legible: se sigue con la copia local tal cual.
  }
  const local = loadLocalProgress();
  const fallback: PullResult = { progress: local ?? defaultProgress(), source: 'local' };
  try {
    const id = await backend.userId();
    if (!id) return fallback;
    const [child, rows] = await Promise.all([backend.fetchChild(id), backend.fetchProgress(id)]);
    // Sin apodo guardado en este aparato (almacenamiento borrado a medias): se recupera del servidor.
    if (child?.nickname && !store.getItem(NICKNAME_KEY)) store.setItem(NICKNAME_KEY, child.nickname);
    // Partida sin conexión que no llegó a subirse: es más nueva que el servidor, no se pisa.
    if (local && store.getItem(PENDING_KEY) === '1') {
      await pushProgress(backend, store, local);
      store.setItem(PENDING_KEY, '0');
      return { progress: local, source: 'local' };
    }
    const server = fromServerRows(child?.extra, rows);
    const serverHasPlayed = hasAttempts(server.profile);
    if (!serverHasPlayed && local && hasAttempts(local.profile)) {
      if (store.getItem(MIGRATED_KEY) !== '1') {
        await pushProgress(backend, store, local);
        store.setItem(MIGRATED_KEY, '1');
      }
      return { progress: local, source: 'local' };
    }
    // Servidor sin intentos y local sin intentos: lo del servidor (ajustes, idioma) si hay ficha.
    if (!child && local) return fallback;
    writeLocalProgress(server);
    return { progress: server, source: 'server' };
  } catch {
    return fallback;
  }
}

/** Sube el progreso. Lanza si falla (sin apodo, sin red…). */
export async function pushProgress(backend: Backend, store: KeyValueStore, progress: PlayerProgress): Promise<void> {
  const nickname = store.getItem(NICKNAME_KEY);
  if (!nickname) throw new Error('Sin apodo');
  const id = await ensureAccount(backend);
  const { extra } = toServerRows(progress);
  await backend.save(id, nickname, extra);
}

/** Lo que queda tras intentar vaciar la cola. */
export interface DrainResult {
  /** Dominio que devolvió el servidor (el último gana), o `null` si no llegó nada. */
  skills: ServerSkills | null;
  /** Respuestas que siguen en la cola (sin red o servidor caído). */
  left: number;
}

/** El servidor dijo que esa respuesta no vale (cuerpo o ejercicio incorrecto): no se reintenta. */
function isRejection(e: unknown): boolean {
  return e instanceof AnswerRejected && (e.status === 400 || e.status === 422);
}

/** Envía una respuesta; si la ficha del niño aún no existe, la crea y reintenta una vez. */
async function sendOne(backend: Backend, store: KeyValueStore, body: AnswerBody): Promise<ServerSkills> {
  await ensureAccount(backend);
  try {
    return await backend.answer(body);
  } catch (e) {
    if (!(e instanceof AnswerRejected && e.code === 'no-child')) throw e;
    await pushProgress(backend, store, loadLocalProgress() ?? defaultProgress());
    return await backend.answer(body);
  }
}

/**
 * Envía la cola en orden, de una en una.
 * - Aceptada, o `409 repeated` (el servidor ya la tenía): sale de la cola.
 * - Rechazada (400/422): sale de la cola y, al acabar, el dominio local se corrige con el del servidor.
 * - Sin red u otro error: se para y el resto se queda para el siguiente intento.
 * Nunca lanza.
 */
export async function drainQueue(backend: Backend, store: KeyValueStore, queue: QueueStore): Promise<DrainResult> {
  let skills: ServerSkills | null = null;
  let rejected = false;
  let items: QueueItem[];
  try {
    items = await queue.all();
  } catch {
    return { skills: null, left: 0 };
  }
  let left = items.length;
  for (const item of items) {
    try {
      const got = await sendOne(backend, store, item.body);
      skills = { ...(skills ?? {}), ...got };
    } catch (e) {
      if (e instanceof AnswerRejected && e.status === 409 && e.code === 'repeated') {
        // Ya estaba en el servidor: cuenta como hecha.
      } else if (isRejection(e)) {
        rejected = true;
      } else {
        break;
      }
    }
    try {
      await queue.remove(item.id);
    } catch {
      break;
    }
    left--;
  }
  if (rejected) {
    // Alguna respuesta no valió: el servidor manda y el dominio local pasa a ser el suyo (en silencio).
    try {
      const id = await backend.userId();
      if (id) {
        const rows = await backend.fetchProgress(id);
        const server = fromServerRows({}, rows).profile;
        const fromRows: ServerSkills = {};
        for (const row of rows) {
          if ((SKILL_IDS as readonly string[]).includes(row.skill)) fromRows[row.skill as SkillId] = server[row.skill as SkillId];
        }
        skills = { ...(skills ?? {}), ...fromRows };
      }
    } catch {
      // Sin red para corregir: se corregirá con la siguiente respuesta aceptada.
    }
  }
  return { skills, left };
}

let queueStore: QueueStore | undefined;
const noticeListeners = new Set<() => void>();
let pendingCount = 0;

function setPending(n: number): void {
  if (n === pendingCount) return;
  pendingCount = n;
  for (const l of noticeListeners) l();
}

/** Cuántas respuestas esperan a enviarse (para el aviso «sin conexión»). */
export function pendingAnswers(): number {
  return pendingCount;
}

/** Avisa cuando cambia el número de respuestas pendientes. Devuelve cómo dejar de escuchar. */
export function onPendingChange(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

let sending: Promise<unknown> = Promise.resolve();

/**
 * Pone la respuesta (o la prueba de nivel) en la cola y envía lo pendiente en orden.
 * Devuelve el dominio que calcula el servidor, o `null` si no llegó nada (sin red,
 * función sin desplegar): el juego se queda con la copia local y la respuesta
 * sigue en la cola hasta poder enviarse.
 */
export function sendAnswer(_progress: PlayerProgress, body: AnswerBody): Promise<ServerSkills | null> {
  const b = appBackend();
  if (!b || typeof localStorage === 'undefined') return Promise.resolve(null);
  queueStore ??= appQueue();
  const queue = queueStore;
  const result = sending.then(async () => {
    try {
      await queue.add(body);
    } catch {
      return null;
    }
    return flushQueue(b, queue);
  });
  sending = result.catch(() => undefined);
  return result;
}

async function flushQueue(b: Backend, queue: QueueStore): Promise<ServerSkills | null> {
  const r = await drainQueue(b, localStorage, queue);
  setPending(r.left);
  return r.skills;
}

/**
 * Borra las respuestas sin enviar (aparato compartido al salir, o cuando la copia local era de otro niño):
 * si no, se enviarían con la sesión del siguiente. Va en la misma fila que los envíos. Nunca lanza.
 */
export function clearAnswerQueue(): Promise<void> {
  queueStore ??= appQueue();
  const queue = queueStore;
  const result = sending.then(async () => {
    try {
      await queue.clear();
    } catch {
      // Sin almacén: no había nada que borrar.
    }
    setPending(0);
  });
  sending = result.catch(() => undefined);
  return result;
}

/** Vacía la cola pendiente (al arrancar y al volver la conexión) y pone el dominio del servidor en la copia local. */
export function retryQueue(): Promise<void> {
  const b = appBackend();
  if (!b || typeof localStorage === 'undefined') return Promise.resolve();
  queueStore ??= appQueue();
  const queue = queueStore;
  const result = sending.then(async () => {
    const skills = await flushQueue(b, queue);
    if (skills) applyServerSkills(loadProgress(), skills);
  });
  sending = result.catch(() => undefined);
  return result;
}

/** Subida con retardo corto y reintento en el siguiente guardado si falla. */
export function createPusher(backend: Backend, store: KeyValueStore, delayMs = 1500) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: PlayerProgress | undefined;
  let running = false;

  const run = async (): Promise<void> => {
    if (running || !latest) return;
    running = true;
    const sending = latest;
    try {
      await pushProgress(backend, store, sending);
      // Si llegó algo más nuevo mientras subíamos, se sube otra vez.
      if (latest !== sending) schedule();
      else store.setItem(PENDING_KEY, '0');
    } catch {
      // Sin red: queda la copia local; se reintenta en el siguiente guardado.
    } finally {
      running = false;
    }
  };
  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), delayMs);
  };
  return {
    push(progress: PlayerProgress): void {
      latest = progress;
      store.setItem(PENDING_KEY, '1');
      schedule();
    },
    /** Sube ya (para los tests o al cerrar la página). */
    flush: run,
  };
}

/** ¿Hay que pedir apodo? Solo si hay servidor, no hay apodo guardado y no hay sesión. */
export async function needsNickname(backend: Backend | null, store: KeyValueStore): Promise<boolean> {
  if (!backend || store.getItem(NICKNAME_KEY)) return false;
  try {
    return (await backend.userId()) === null;
  } catch {
    return true;
  }
}

/** Claves de localStorage que son del niño: se borran con la cuenta. */
export const LOCAL_KEYS = ['kalku:progress', NICKNAME_KEY, MIGRATED_KEY, PENDING_KEY, OWNER_KEY, CLASS_DEVICE_KEY, QUEUE_LS_KEY] as const;

/**
 * Marca la copia local como del niño `userId`. Si era de otro niño, la borra antes:
 * dos niños nunca comparten monedas, ajustes ni apodo en un aparato.
 */
export function claimLocalCopy(store: KeyValueStore, userId: string): void {
  const owner = store.getItem(OWNER_KEY);
  if (owner && owner !== userId) {
    for (const key of LOCAL_KEYS) store.removeItem?.(key);
    // Las respuestas sin enviar eran del otro niño: no se pueden mandar con esta sesión.
    void clearAnswerQueue();
  }
  store.setItem(OWNER_KEY, userId);
}

/** Descarga de datos: el JSON del servidor. Lanza si no hay sesión o red. */
export async function exportChildData(backend: Backend): Promise<string> {
  if (!(await backend.userId())) throw new Error('Sin cuenta');
  return JSON.stringify(await backend.exportData(), null, 2);
}

/**
 * Borra la cuenta en el servidor y, solo si ha funcionado, la copia local.
 * Si el servidor falla, lanza y no toca nada: no se finge un borrado.
 */
export async function deleteChildData(backend: Backend, store: KeyValueStore): Promise<void> {
  if (await backend.userId()) await backend.deleteAccount();
  for (const key of LOCAL_KEYS) store.removeItem?.(key);
}

let backend: Backend | null | undefined;

/** Backend de la app (null sin variables de entorno: el juego sigue en local). */
export function appBackend(): Backend | null {
  if (backend === undefined) {
    const client = getSupabase();
    backend = client ? supabaseBackend(client) : null;
  }
  return backend;
}

let activePusher: { flush(): Promise<void> } | undefined;

/** Sube ya lo que esté pendiente (por ejemplo, antes de salir de una clase). Nunca lanza. */
export async function flushPending(): Promise<void> {
  try {
    await retryQueue();
    await activePusher?.flush();
  } catch {
    // Sin red: lo pendiente se pierde al salir (se avisa en la decisión de #53).
  }
}

/** Arranque del juego: baja el progreso y empieza a subir cada guardado. */
export async function startSync(): Promise<void> {
  const b = appBackend();
  if (!b || typeof localStorage === 'undefined') return;
  const pusher = createPusher(b, localStorage);
  activePusher = pusher;
  onProgressSaved((p) => pusher.push(p));
  // Lo jugado sin conexión se envía antes de bajar el dominio, para que el servidor no pise respuestas pendientes.
  await retryQueue();
  if (typeof window !== 'undefined') window.addEventListener('online', () => void retryQueue());
  await pullProgress(b, localStorage);
}

/** Como `startSync`, pero sin esperar más de `ms` por una red lenta. */
export async function startSyncWithTimeout(ms = 4000): Promise<void> {
  await Promise.race([startSync(), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

/** Guarda el apodo y, si hay red, crea la cuenta anónima. Nunca lanza: sin red se crea más tarde. */
export async function createAccount(nickname: string): Promise<void> {
  localStorage.setItem(NICKNAME_KEY, nickname);
  const b = appBackend();
  if (!b) return;
  try {
    await ensureAccount(b);
  } catch {
    // Sin conexión: se crea al volver, en la primera subida.
  }
}
