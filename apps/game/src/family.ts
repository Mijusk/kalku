import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { SKILL_IDS } from '@kalku/exercises';
import { PRIVACY_VERSION } from '@kalku/content';
import { appBackend, clearAnswerQueue, LOCAL_KEYS, OWNER_KEY, pullProgress, type KeyValueStore } from './sync';
import { getAdultSupabase, getSupabase } from './supabase';

/**
 * Cuenta de familia (#47). Un adulto entra con un enlace de correo (sin contraseña),
 * une a sus niños (hasta 4) y puede entrar como cualquiera de ellos en otro aparato.
 *
 * El adulto tiene su propio cliente de Supabase (otra sesión) para no pisar la del niño
 * de este aparato. El correo solo existe en el sistema de acceso del adulto: nunca se
 * escribe en nada del niño.
 */

export const MAX_CHILDREN = 4;

/** Errores que el servidor dice con su mensaje y que la interfaz sabe explicar. */
export type FamilyErrorCode = 'invalid-code' | 'child-in-family' | 'family-full' | 'not-adult' | 'not-in-family' | 'no-child' | 'email-not-confirmed' | 'consent-required' | 'network';

export class FamilyError extends Error {
  constructor(readonly code: FamilyErrorCode) {
    super(code);
  }
}

const KNOWN: readonly FamilyErrorCode[] = ['invalid-code', 'child-in-family', 'family-full', 'not-adult', 'not-in-family', 'no-child', 'email-not-confirmed', 'consent-required'];

/** Pasa el mensaje de error del servidor a un código conocido (o `network`). */
export function toFamilyError(e: unknown): FamilyError {
  if (e instanceof FamilyError) return e;
  const message = typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '';
  return new FamilyError(KNOWN.find((code) => message.includes(code)) ?? 'network');
}

/** Consentimiento que da el adulto al unir a un niño (LOPDGDD art. 7). */
export interface Consent {
  /** Declara ser su madre, padre o tutor. */
  isGuardian: boolean;
  /** Versión de la política de privacidad que acepta. */
  policyVersion: string;
}

/** El consentimiento que corresponde a marcar la casilla de la pantalla (con la política vigente). */
export function guardianConsent(isGuardian: boolean): Consent {
  return { isGuardian, policyVersion: PRIVACY_VERSION };
}

export interface FamilyChild {
  id: string;
  nickname: string;
  /** Habilidades con algún intento. */
  skillsTried: number;
  /** Dominio medio de las habilidades con intentos (0 a 100), o 0 si no ha jugado. */
  averageMastery: number;
}

export interface ProgressRow {
  child_id: string;
  skill: string;
  mastery: unknown;
  attempts: unknown;
}

/** Resumen del progreso de cada niño para la lista de la familia. */
export function summarize(children: { id: string; nickname: string }[], rows: ProgressRow[]): FamilyChild[] {
  return children.map((c) => {
    const tried = rows.filter((r) => r.child_id === c.id && (SKILL_IDS as readonly string[]).includes(r.skill) && Number(r.attempts) > 0);
    const sum = tried.reduce((total, r) => total + Number(r.mastery), 0);
    return { id: c.id, nickname: c.nickname, skillsTried: tried.length, averageMastery: tried.length ? Math.round(sum / tried.length) : 0 };
  });
}

/** Lo que la familia necesita del servidor (se sustituye por uno falso en los tests). */
export interface FamilyBackend {
  /** Id del adulto si hay sesión de adulto, o `null`. */
  adultId(): Promise<string | null>;
  /** Id del niño de este aparato, o `null`. */
  childId(): Promise<string | null>;
  sendLoginLink(email: string, redirectTo: string): Promise<void>;
  signOutAdult(): Promise<void>;
  /** Con la sesión del niño: código de un solo uso de 10 minutos. */
  createLinkCode(): Promise<string>;
  /** Con la sesión del adulto: une al niño del código a su familia y registra el consentimiento. */
  joinWithCode(code: string, consent: Consent): Promise<{ childId: string; nickname: string }>;
  listChildren(): Promise<FamilyChild[]>;
  leave(childId: string): Promise<void>;
  /** Retira el consentimiento: borra al niño con todos sus datos. */
  withdrawConsent(childId: string): Promise<void>;
  /** Pide al servidor una sesión de ese niño y la pone en este aparato. */
  enterAsChild(childId: string): Promise<void>;
}

export function supabaseFamilyBackend(child: SupabaseClient, adult: SupabaseClient): FamilyBackend {
  return {
    async adultId() {
      const { data } = await adult.auth.getSession();
      const user = data.session?.user;
      return user && !user.is_anonymous ? user.id : null;
    },
    async childId() {
      const { data } = await child.auth.getSession();
      return data.session?.user.id ?? null;
    },
    async sendLoginLink(email, redirectTo) {
      const { error } = await adult.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
      if (error) throw toFamilyError(error);
    },
    async signOutAdult() {
      await adult.auth.signOut({ scope: 'local' });
    },
    async createLinkCode() {
      const { data, error } = await child.rpc('create_link_code');
      if (error || typeof data !== 'string') throw toFamilyError(error);
      return data;
    },
    async joinWithCode(code, consent) {
      const { data, error } = await adult.rpc('join_family_with_code', {
        p_code: code,
        p_policy_version: consent.policyVersion,
        p_is_guardian: consent.isGuardian,
      });
      if (error) throw toFamilyError(error);
      const r = (data ?? {}) as { child_id?: unknown; nickname?: unknown };
      return { childId: String(r.child_id ?? ''), nickname: String(r.nickname ?? '') };
    },
    async listChildren() {
      const { data: members, error } = await adult.from('family_children').select('child_id');
      if (error) throw toFamilyError(error);
      const ids = (members ?? []).map((m) => String(m.child_id));
      if (ids.length === 0) return [];
      const [children, progress] = await Promise.all([
        adult.from('children').select('id, nickname').in('id', ids).order('created_at'),
        adult.from('progress').select('child_id, skill, mastery, attempts').in('child_id', ids),
      ]);
      if (children.error) throw toFamilyError(children.error);
      if (progress.error) throw toFamilyError(progress.error);
      return summarize(
        (children.data ?? []).map((c) => ({ id: String(c.id), nickname: String(c.nickname) })),
        (progress.data ?? []) as ProgressRow[],
      );
    },
    async leave(childId) {
      const { error } = await adult.rpc('leave_family', { p_child: childId });
      if (error) throw toFamilyError(error);
    },
    async withdrawConsent(childId) {
      const { error } = await adult.rpc('withdraw_consent', { p_child: childId });
      if (error) throw toFamilyError(error);
    },
    async enterAsChild(childId) {
      const { data, error } = await adult.functions.invoke('child-session', { body: { childId } });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const detail = (await (error.context as Response).json().catch(() => ({}))) as { error?: unknown };
          throw toFamilyError({ message: typeof detail.error === 'string' ? detail.error : '' });
        }
        throw toFamilyError(error);
      }
      const token = (data as { access_token?: unknown } | null)?.access_token;
      if (typeof token !== 'string') throw new FamilyError('network');
      // Sin token de refresco: la sesión dura lo que dice el servidor (7 días) y luego el adulto vuelve a entrar.
      const { error: sessionError } = await child.auth.setSession({ access_token: token, refresh_token: 'sin-refresco' });
      if (sessionError) throw toFamilyError(sessionError);
    },
  };
}

let cached: FamilyBackend | null | undefined;

/** Backend de la familia de la app (null sin variables de entorno). */
export function appFamilyBackend(): FamilyBackend | null {
  if (cached === undefined) {
    const child = getSupabase();
    const adult = getAdultSupabase();
    cached = child && adult ? supabaseFamilyBackend(child, adult) : null;
  }
  return cached;
}

/** Quita lo que el aparato guardaba de otro niño antes de entrar como este. */
export function forgetOtherChild(store: KeyValueStore, childId: string): void {
  if (store.getItem(OWNER_KEY) === childId) return;
  for (const key of LOCAL_KEYS) store.removeItem?.(key);
  // Las respuestas sin enviar eran del otro niño: no se pueden mandar con la sesión de este.
  void clearAnswerQueue();
}

/**
 * Entra como un niño de la familia: descarta la copia local de otro niño, pide la
 * sesión y baja su progreso del servidor. Si el servidor falla, no cambia nada.
 */
export async function enterAsChildHere(family: FamilyBackend, store: KeyValueStore, childId: string): Promise<void> {
  const backend = appBackend();
  // Primero la sesión; solo si llega se toca la copia local (si falla, el aparato sigue como estaba).
  await family.enterAsChild(childId);
  forgetOtherChild(store, childId);
  if (backend) await pullProgress(backend, store);
}

/**
 * Une al niño de este aparato a la familia del adulto con sesión (mismo aparato):
 * el niño pide el código y el adulto lo usa. Devuelve el apodo.
 */
export async function joinThisDevice(family: FamilyBackend, consent: Consent): Promise<string> {
  const code = await family.createLinkCode();
  return (await family.joinWithCode(code, consent)).nickname;
}
