import type { SupabaseClient } from '@supabase/supabase-js';
import { CLASS_MAX_STUDENTS, SECRET_ANIMALS, codeHint, generateStudentCode, normalizeCode, type StudentCode } from '@kalku/content';
import type { Rng } from '@kalku/exercises';
import { getAdultSupabase } from './supabase';
import { checkNickname } from './nickname';
import { TeacherError, toTeacherError } from './teacher';

/**
 * Clases y tarjetas de alumno (#52). El docente crea una clase y añade alumnos con un apodo; cada
 * uno recibe un código («LUNA-47») y un animal secreto. El servidor solo guarda el hash del código
 * y una pista: el código en claro existe un momento en este aparato, el justo para imprimir la tarjeta.
 */

export const STUDENT_NICKNAME_MAX = 20;
export { CLASS_MAX_STUDENTS };

export interface ClassInfo {
  id: string;
  name: string;
}

export interface StudentInfo {
  id: string;
  nickname: string;
  /** Pista del código (sus dos primeras letras): el código entero no se puede volver a ver. */
  hint: string;
  animal: string;
}

/** Lo que hay que imprimir en una tarjeta. */
export interface StudentCard {
  nickname: string;
  code: string;
  animal: string;
}

export interface ClassBackend {
  listClasses(): Promise<ClassInfo[]>;
  createClass(name: string): Promise<ClassInfo>;
  listStudents(classId: string): Promise<StudentInfo[]>;
  addStudent(classId: string, nickname: string, codeHash: string, hint: string, animal: string): Promise<string>;
  regenerateCode(studentId: string, codeHash: string, hint: string, animal: string): Promise<void>;
  removeStudent(studentId: string): Promise<void>;
}

/** Hash que guarda el servidor: sha-256 de «<id de la clase>:<CÓDIGO>». Lleva la clase para que no se pueda tabular una vez para todas. */
export async function hashStudentCode(classId: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${classId}:${normalizeCode(code)}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Dirección que lleva el QR de la tarjeta: la entrada del juego y el id de la clase; nada del alumno. */
export function classEntryUrl(origin: string, classId: string): string {
  return `${origin}/?clase=${encodeURIComponent(classId)}`;
}

export interface StudentNicknameCheck {
  ok: boolean;
  nickname: string;
  /** Dos o más palabras: puede ser un nombre y apellido. */
  looksLikeName: boolean;
}

export function checkStudentNickname(raw: string): StudentNicknameCheck {
  const c = checkNickname(raw);
  return { ok: c.ok && [...c.nickname].length <= STUDENT_NICKNAME_MAX, nickname: c.nickname, looksLikeName: c.looksLikeName };
}

const MAX_ATTEMPTS = 25;

/**
 * Genera un código para el alumno y lo guarda. Si el servidor dice que ya existe en la clase
 * (`code-taken`), lo recuerda y prueba con otro; nunca da dos veces el mismo en la clase.
 */
async function withFreshCode(
  classId: string,
  rng: Rng,
  taken: Set<string>,
  save: (card: StudentCode, hash: string) => Promise<void>,
): Promise<StudentCode> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = generateStudentCode(rng, taken);
    taken.add(candidate.code);
    try {
      await save(candidate, await hashStudentCode(classId, candidate.code));
      return candidate;
    } catch (e) {
      if (toTeacherError(e).code !== 'code-taken') throw e;
    }
  }
  throw new TeacherError('code-taken');
}

/** Añade un alumno y devuelve su tarjeta (con el código en claro, una sola vez). */
export async function addStudentWithCard(
  backend: ClassBackend,
  classId: string,
  rawNickname: string,
  rng: Rng,
  taken: Set<string> = new Set(),
): Promise<StudentCard & { id: string }> {
  const check = checkStudentNickname(rawNickname);
  if (!check.ok) throw new TeacherError('invalid-nickname');
  let id = '';
  const made = await withFreshCode(classId, rng, taken, async (c, hash) => {
    id = await backend.addStudent(classId, check.nickname, hash, codeHint(c.code), c.animal);
  });
  return { id, nickname: check.nickname, code: made.code, animal: made.animal };
}

/** Código y animal nuevos para un alumno que perdió la tarjeta. El anterior deja de valer. */
export async function regenerateStudentCard(
  backend: ClassBackend,
  classId: string,
  student: StudentInfo,
  rng: Rng,
  taken: Set<string> = new Set(),
): Promise<StudentCard> {
  const made = await withFreshCode(classId, rng, taken, (c, hash) => backend.regenerateCode(student.id, hash, codeHint(c.code), c.animal));
  return { nickname: student.nickname, code: made.code, animal: made.animal };
}

/** Nombre del animal secreto en el idioma pedido (el id si no se conoce). */
export function animalName(id: string, locale: 'es' | 'ca'): string {
  return SECRET_ANIMALS.find((a) => a.id === id)?.name[locale] ?? id;
}

export function supabaseClassBackend(adult: SupabaseClient): ClassBackend {
  return {
    async listClasses() {
      const { data, error } = await adult.from('classes').select('id, name').order('created_at');
      if (error) throw toTeacherError(error);
      return (data ?? []).map((c) => ({ id: String(c.id), name: String(c.name) }));
    },
    async createClass(name) {
      const { data, error } = await adult.rpc('create_class', { p_name: name });
      if (error || typeof data !== 'string') throw toTeacherError(error);
      return { id: data, name: name.trim() };
    },
    async listStudents(classId) {
      const { data, error } = await adult
        .from('class_students')
        .select('id, nickname, code_hint, animal')
        .eq('class_id', classId)
        .order('created_at');
      if (error) throw toTeacherError(error);
      return (data ?? []).map((s) => ({ id: String(s.id), nickname: String(s.nickname), hint: String(s.code_hint), animal: String(s.animal) }));
    },
    async addStudent(classId, nickname, codeHash, hint, animal) {
      const { data, error } = await adult.rpc('add_student', {
        p_class: classId,
        p_nickname: nickname,
        p_code_hash: codeHash,
        p_code_hint: hint,
        p_animal: animal,
      });
      if (error || typeof data !== 'string') throw toTeacherError(error);
      return data;
    },
    async regenerateCode(studentId, codeHash, hint, animal) {
      const { error } = await adult.rpc('regenerate_student_code', { p_student: studentId, p_code_hash: codeHash, p_code_hint: hint, p_animal: animal });
      if (error) throw toTeacherError(error);
    },
    async removeStudent(studentId) {
      const { error } = await adult.rpc('remove_student', { p_student: studentId });
      if (error) throw toTeacherError(error);
    },
  };
}

let cached: ClassBackend | null | undefined;

export function appClassBackend(): ClassBackend | null {
  if (cached === undefined) {
    const adult = getAdultSupabase();
    cached = adult ? supabaseClassBackend(adult) : null;
  }
  return cached;
}
