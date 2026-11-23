import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { SKILL_IDS, type Exercise, type PlacementAnswer, type SkillId, type SkillProgress, type Slot } from '@kalku/exercises';
import {
  defaultProgress,
  fromServerRows,
  hasAttempts,
  loadLocalProgress,
  onProgressSaved,
  toServerRows,
  writeLocalProgress,
  type PlayerProgress,
} from './progress';
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
}

export const NICKNAME_KEY = 'kalku:nickname';
export const MIGRATED_KEY = 'kalku:migrated';
/** '1' mientras haya guardados locales que el servidor aún no ha confirmado (jugar sin conexión). */
export const PENDING_KEY = 'kalku:pending';

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

/**
 * Manda una respuesta (o la prueba de nivel) al servidor y devuelve el dominio
 * que él calcula, o `null` si no se pudo (sin red, función sin desplegar, rechazo):
 * el juego se queda entonces con la copia local. Las respuestas sin conexión no se
 * reintentan todavía (bloque 8).
 */
export async function submitAnswer(backend: Backend, store: KeyValueStore, progress: PlayerProgress, body: AnswerBody): Promise<ServerSkills | null> {
  try {
    await ensureAccount(backend);
    try {
      return await backend.answer(body);
    } catch (e) {
      // La ficha del niño aún no está en el servidor (primer uso o sin red al empezar): se crea y se reintenta una vez.
      if (!(e instanceof AnswerRejected && e.code === 'no-child')) throw e;
      await pushProgress(backend, store, progress);
      return await backend.answer(body);
    }
  } catch {
    return null;
  }
}

let sending: Promise<unknown> = Promise.resolve();

/** Como `submitAnswer` con el servidor de la app, y de una en una para que lleguen en orden. */
export function sendAnswer(progress: PlayerProgress, body: AnswerBody): Promise<ServerSkills | null> {
  const b = appBackend();
  if (!b || typeof localStorage === 'undefined') return Promise.resolve(null);
  const result = sending.then(() => submitAnswer(b, localStorage, progress, body));
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

let backend: Backend | null | undefined;

/** Backend de la app (null sin variables de entorno: el juego sigue en local). */
export function appBackend(): Backend | null {
  if (backend === undefined) {
    const client = getSupabase();
    backend = client ? supabaseBackend(client) : null;
  }
  return backend;
}

/** Arranque del juego: baja el progreso y empieza a subir cada guardado. */
export async function startSync(): Promise<void> {
  const b = appBackend();
  if (!b || typeof localStorage === 'undefined') return;
  const pusher = createPusher(b, localStorage);
  onProgressSaved((p) => pusher.push(p));
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
