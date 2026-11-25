import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeCode } from '@kalku/content';
import { CLASS_ACTIVE_KEY, CLASS_DEVICE_KEY, type Store } from './classDevice';
import { forgetOtherChild } from './family';
import { getSupabase } from './supabase';
import { LOCAL_KEYS, flushPending, pullProgress, type Backend, type KeyValueStore } from './sync';

/**
 * Entrar en la clase (#53): el niño toca su apodo y su animal, o escribe el código de su tarjeta.
 * Quien comprueba es el servidor (Edge Function `class-session`): aquí no hay hashes ni animales.
 */

export interface ClassStudentName {
  id: string;
  nickname: string;
}

/** Quién ha entrado: el niño del alumno y su apodo. */
export interface ClassEntry {
  childId: string;
  nickname: string;
}

export type ClassLoginErrorCode =
  /** No es su animal o su código. */
  | 'wrong'
  /** Demasiados fallos: espera `retryAfter` segundos y pide ayuda al docente. */
  | 'locked'
  | 'network';

export class ClassLoginError extends Error {
  constructor(readonly code: ClassLoginErrorCode, readonly retryAfter = 0) {
    super(code);
  }
}

export interface ClassLoginBackend {
  /** Los apodos de la clase (solo id y apodo). */
  listNicknames(classId: string): Promise<ClassStudentName[]>;
  /** Pide la sesión del alumno y la pone en este aparato. Lanza `ClassLoginError`. */
  enterWithAnimal(classId: string, studentId: string, animal: string): Promise<ClassEntry>;
  enterWithCode(classId: string, code: string): Promise<ClassEntry>;
  /** Cierra la sesión del alumno en este aparato. */
  signOut(): Promise<void>;
}

export function supabaseClassLoginBackend(client: SupabaseClient): ClassLoginBackend {
  const enter = async (body: Record<string, string>): Promise<ClassEntry> => {
    const { data, error } = await client.functions.invoke('class-session', { body });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const detail = (await (error.context as Response).json().catch(() => ({}))) as { error?: unknown; retry_after?: unknown };
        const retryAfter = typeof detail.retry_after === 'number' ? detail.retry_after : 0;
        if (detail.error === 'locked') throw new ClassLoginError('locked', retryAfter);
        if (detail.error === 'wrong') throw new ClassLoginError(retryAfter > 0 ? 'locked' : 'wrong', retryAfter);
      }
      throw new ClassLoginError('network');
    }
    const r = (data ?? {}) as { access_token?: unknown; child_id?: unknown; nickname?: unknown };
    if (typeof r.access_token !== 'string' || typeof r.child_id !== 'string') throw new ClassLoginError('network');
    // Sin token de refresco: la sesión dura lo que dice el servidor (un día).
    const { error: sessionError } = await client.auth.setSession({ access_token: r.access_token, refresh_token: 'sin-refresco' });
    if (sessionError) throw new ClassLoginError('network');
    return { childId: r.child_id, nickname: typeof r.nickname === 'string' ? r.nickname : '' };
  };
  return {
    async listNicknames(classId) {
      const { data, error } = await client.rpc('list_class_nicknames', { p_class: classId });
      if (error) throw new ClassLoginError('network');
      return ((data ?? []) as { id: unknown; nickname: unknown }[]).map((s) => ({ id: String(s.id), nickname: String(s.nickname) }));
    },
    enterWithAnimal: (classId, studentId, animal) => enter({ classId, studentId, animal }),
    enterWithCode: (classId, code) => enter({ classId, code: normalizeCode(code) }),
    async signOut() {
      await client.auth.signOut({ scope: 'local' });
    },
  };
}

export type ClassCredentials = { kind: 'animal'; studentId: string; animal: string } | { kind: 'code'; code: string };

/**
 * Entra como un alumno: pide la sesión; solo si llega descarta la copia local de otro niño, marca el
 * aparato como de clase y baja el progreso del alumno. Si el servidor dice que no, no cambia nada.
 */
export async function enterClass(
  login: ClassLoginBackend,
  sync: Backend | null,
  local: KeyValueStore,
  session: Store,
  classId: string,
  credentials: ClassCredentials,
): Promise<ClassEntry> {
  const entry =
    credentials.kind === 'animal'
      ? await login.enterWithAnimal(classId, credentials.studentId, credentials.animal)
      : await login.enterWithCode(classId, credentials.code);
  forgetOtherChild(local, entry.childId);
  local.setItem(CLASS_DEVICE_KEY, '1');
  session.setItem(CLASS_ACTIVE_KEY, classId);
  // El apodo del alumno es el de la clase: así el juego no le pide uno.
  if (entry.nickname) local.setItem('kalku:nickname', entry.nickname);
  if (sync) await pullProgress(sync, local);
  return entry;
}

/** Espera como mucho `ms` a lo que tarde `task`; después sigue pase lo que pase. */
async function upTo(ms: number, task: () => Promise<void>): Promise<void> {
  await Promise.race([task().catch(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

export interface LeaveOptions {
  /** Cuánto esperar a subir lo pendiente (3 s). */
  waitMs?: number;
  /** Sube lo pendiente. Por defecto, el de la app. */
  flush?: () => Promise<void>;
}

/**
 * Salir en un aparato compartido: sube lo pendiente (3 s como mucho), cierra la sesión y borra todo
 * lo que el alumno dejó en el aparato, haya red o no. Devuelve el id de su clase para volver a su entrada.
 */
export async function leaveSharedDevice(
  login: ClassLoginBackend | null,
  local: KeyValueStore,
  session: Store,
  options: LeaveOptions = {},
): Promise<string | null> {
  const classId = session.getItem(CLASS_ACTIVE_KEY);
  await upTo(options.waitMs ?? 3000, options.flush ?? flushPending);
  if (login) await upTo(1000, () => login.signOut());
  for (const key of LOCAL_KEYS) local.removeItem?.(key);
  session.removeItem?.(CLASS_ACTIVE_KEY);
  return classId;
}

let cached: ClassLoginBackend | null | undefined;

/** Backend de la entrada a clase de la app (null sin variables de entorno). */
export function appClassLoginBackend(): ClassLoginBackend | null {
  if (cached === undefined) {
    const client = getSupabase();
    cached = client ? supabaseClassLoginBackend(client) : null;
  }
  return cached;
}
