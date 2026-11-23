import type { SupabaseClient } from '@supabase/supabase-js';
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
  save(id: string, nickname: string, extra: unknown, rows: { skill: string; mastery: number; attempts: number; correct: number }[]): Promise<void>;
  /** Todo lo que el servidor guarda del niño (RGPD: portabilidad). */
  exportData(): Promise<unknown>;
  /** Borra la cuenta del niño y todas sus filas (RGPD: supresión) y cierra la sesión. */
  deleteAccount(): Promise<void>;
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
    async save(id, nickname, extra, rows) {
      const child = await client.from('children').upsert({ id, nickname, extra });
      if (child.error) throw child.error;
      const now = new Date().toISOString();
      const progress = await client
        .from('progress')
        .upsert(rows.map((r) => ({ child_id: id, ...r, updated_at: now })), { onConflict: 'child_id,skill' });
      if (progress.error) throw progress.error;
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
  const { extra, rows } = toServerRows(progress);
  await backend.save(id, nickname, extra, rows);
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
export const LOCAL_KEYS = ['kalku:progress', NICKNAME_KEY, MIGRATED_KEY, PENDING_KEY] as const;

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
