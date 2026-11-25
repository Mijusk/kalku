import type { SupabaseClient } from '@supabase/supabase-js';
import { CONTRACT_VERSION } from '@kalku/content';
import { getAdultSupabase } from './supabase';

/**
 * Cuentas de centro y de docente (#51). Un docente entra con un enlace de correo (como el adulto
 * de una familia, con el mismo cliente de adulto), da de alta su centro aceptando el contrato de
 * encargo o se une a uno con el código que le da la dirección. El correo solo vive en el sistema
 * de acceso: ninguna tabla de centros lo guarda.
 */

export type TeacherRole = 'director' | 'docente';

export interface SchoolInfo {
  name: string;
  role: TeacherRole;
}

/** Errores que el servidor dice con su mensaje y que la pantalla sabe explicar. */
export type TeacherErrorCode =
  | 'invalid-code'
  | 'already-in-school'
  | 'not-director'
  | 'director-cannot-leave'
  | 'contract-required'
  | 'invalid-name'
  | 'email-not-confirmed'
  | 'not-adult'
  | 'network';

const KNOWN: readonly TeacherErrorCode[] = [
  'invalid-code',
  'already-in-school',
  'not-director',
  'director-cannot-leave',
  'contract-required',
  'invalid-name',
  'email-not-confirmed',
  'not-adult',
];

export class TeacherError extends Error {
  constructor(readonly code: TeacherErrorCode) {
    super(code);
  }
}

/** Pasa el mensaje de error del servidor a un código conocido (o `network`). */
export function toTeacherError(e: unknown): TeacherError {
  if (e instanceof TeacherError) return e;
  const message = typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '';
  return new TeacherError(KNOWN.find((code) => message.includes(code)) ?? 'network');
}

/** Código en grupos de 4 para leerlo y dictarlo mejor («ABCD 2345»). */
export function formatSchoolCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** Lo que la pantalla del docente necesita del servidor (se sustituye por uno falso en los tests). */
export interface TeacherBackend {
  /** Id del adulto si hay sesión de adulto, o `null`. */
  adultId(): Promise<string | null>;
  sendLoginLink(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  /** El centro del adulto, o `null` si no tiene. */
  mySchool(): Promise<SchoolInfo | null>;
  /** Da de alta un centro (y acepta el contrato de esa versión). Devuelve el código en claro, una sola vez. */
  createSchool(name: string, contractVersion: string, accepts: boolean): Promise<{ name: string; code: string }>;
  /** Solo el director: código nuevo; el anterior deja de valer. */
  rotateCode(): Promise<string>;
  joinWithCode(code: string): Promise<{ name: string }>;
  leaveSchool(): Promise<void>;
}

export function supabaseTeacherBackend(adult: SupabaseClient): TeacherBackend {
  return {
    async adultId() {
      const { data } = await adult.auth.getSession();
      const user = data.session?.user;
      return user && !user.is_anonymous ? user.id : null;
    },
    async sendLoginLink(email, redirectTo) {
      const { error } = await adult.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
      if (error) throw toTeacherError(error);
    },
    async signOut() {
      await adult.auth.signOut({ scope: 'local' });
    },
    async mySchool() {
      const { data: me, error } = await adult.from('teachers').select('school_id, role').maybeSingle();
      if (error) throw toTeacherError(error);
      if (!me?.school_id) return null;
      const { data: school, error: schoolError } = await adult.from('schools').select('name').eq('id', me.school_id).maybeSingle();
      if (schoolError) throw toTeacherError(schoolError);
      if (!school) return null;
      return { name: String(school.name), role: me.role === 'director' ? 'director' : 'docente' };
    },
    async createSchool(name, contractVersion, accepts) {
      const { data, error } = await adult.rpc('create_school', { p_name: name, p_contract_version: contractVersion, p_accepts: accepts });
      if (error) throw toTeacherError(error);
      const r = (data ?? {}) as { name?: unknown; code?: unknown };
      if (typeof r.code !== 'string') throw new TeacherError('network');
      return { name: String(r.name ?? name), code: r.code };
    },
    async rotateCode() {
      const { data, error } = await adult.rpc('rotate_school_code');
      if (error || typeof data !== 'string') throw toTeacherError(error);
      return data;
    },
    async joinWithCode(code) {
      const { data, error } = await adult.rpc('join_school_with_code', { p_code: code });
      if (error) throw toTeacherError(error);
      return { name: String((data as { name?: unknown } | null)?.name ?? '') };
    },
    async leaveSchool() {
      const { error } = await adult.rpc('leave_school');
      if (error) throw toTeacherError(error);
    },
  };
}

let cached: TeacherBackend | null | undefined;

/** Backend de docentes de la app (null sin variables de entorno). */
export function appTeacherBackend(): TeacherBackend | null {
  if (cached === undefined) {
    const adult = getAdultSupabase();
    cached = adult ? supabaseTeacherBackend(adult) : null;
  }
  return cached;
}

/** Qué pantalla toca: sin sesión, con sesión pero sin centro, o con centro. */
export type TeacherView = { kind: 'login' } | { kind: 'no-school' } | { kind: 'school'; school: SchoolInfo };

export async function loadTeacherView(backend: TeacherBackend): Promise<TeacherView> {
  if (!(await backend.adultId())) return { kind: 'login' };
  const school = await backend.mySchool();
  return school ? { kind: 'school', school } : { kind: 'no-school' };
}

/**
 * Alta de centro: el responsable acepta el contrato (de la versión vigente) y recibe el código.
 * Sin aceptar no se llama al servidor.
 */
export async function registerSchool(backend: TeacherBackend, name: string, acceptsContract: boolean): Promise<{ name: string; code: string }> {
  const clean = name.trim();
  if (!clean || clean.length > 80) throw new TeacherError('invalid-name');
  if (!acceptsContract) throw new TeacherError('contract-required');
  return backend.createSchool(clean, CONTRACT_VERSION, true);
}

/** Enlace al texto del contrato de encargo (plantilla pendiente de revisión legal), en cada idioma. */
export const CONTRACT_URL = {
  es: 'https://github.com/Mijusk/kalku/blob/main/docs/legal/contrato-encargo-tratamiento.es.md',
  ca: 'https://github.com/Mijusk/kalku/blob/main/docs/legal/contrato-encargo-tratamiento.ca.md',
} as const;
