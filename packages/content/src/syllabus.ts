import { SKILL_IDS, type Exercise, type Localized, type SkillId } from '@kalku/exercises';

/**
 * Temario de un centro (docs/TEMARIO.md): lo que un colegio o un docente
 * quiere que se practique. Son datos en JSON (`packages/content/temarios/`)
 * que Luis o el propio centro pueden escribir a mano.
 *
 * - `skills`: habilidades del currículo de Kalku que la unidad trabaja.
 * - `questions`: preguntas propias (enunciado, respuesta y pista en es/ca).
 *   Salen en los acertijos de Pedrolo. No cuentan para el dominio porque no
 *   son de ninguna habilidad: solo dan monedas y XP como cualquier acierto.
 */
export interface SyllabusQuestion {
  text: Localized;
  answer: number;
  hint?: Localized;
}

export interface SyllabusUnit {
  id: string;
  name: Localized;
  skills: SkillId[];
  questions: SyllabusQuestion[];
}

export interface Syllabus {
  id: string;
  /** Nombre del centro o del temario, tal como lo verá el docente. */
  name: Localized;
  units: SyllabusUnit[];
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function localized(v: unknown, where: string, errors: string[]): Localized | undefined {
  if (!isObject(v)) {
    errors.push(`${where}: falta el texto (con "es" y "ca")`);
    return undefined;
  }
  const es = typeof v.es === 'string' ? v.es.trim() : '';
  const ca = typeof v.ca === 'string' ? v.ca.trim() : '';
  if (!es) errors.push(`${where}: falta el texto en castellano ("es")`);
  if (!ca) errors.push(`${where}: falta el texto en catalán ("ca")`);
  return es && ca ? { es, ca } : undefined;
}

/**
 * Lee un temario sin fiarse de él. Devuelve los errores en castellano, con
 * dónde está cada uno, para que quien lo escribe sepa qué arreglar.
 */
export function parseSyllabus(raw: unknown): { syllabus?: Syllabus; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(raw)) return { errors: ['El temario tiene que ser un objeto JSON { ... }'] };
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!ID.test(id)) errors.push('"id": tiene que ser en minúsculas y con guiones, por ejemplo "colegio-sol"');
  const name = localized(raw.name, '"name"', errors);
  const units: SyllabusUnit[] = [];
  if (!Array.isArray(raw.units) || raw.units.length === 0) errors.push('"units": hace falta al menos una unidad');
  const seen = new Set<string>();
  (Array.isArray(raw.units) ? raw.units : []).forEach((u: unknown, i) => {
    const where = `unidad ${i + 1}`;
    if (!isObject(u)) {
      errors.push(`${where}: tiene que ser un objeto { ... }`);
      return;
    }
    const uid = typeof u.id === 'string' ? u.id : '';
    if (!ID.test(uid)) errors.push(`${where}: "id" en minúsculas y con guiones`);
    else if (seen.has(uid)) errors.push(`${where}: el id "${uid}" está repetido`);
    seen.add(uid);
    const uname = localized(u.name, `${where} "name"`, errors);
    const skills: SkillId[] = [];
    const rawSkills: unknown[] = Array.isArray(u.skills) ? u.skills : [];
    if (u.skills !== undefined && !Array.isArray(u.skills)) errors.push(`${where}: "skills" tiene que ser una lista`);
    for (const s of rawSkills) {
      if (typeof s === 'string' && (SKILL_IDS as readonly string[]).includes(s)) skills.push(s as SkillId);
      else errors.push(`${where}: la habilidad "${String(s)}" no existe (mira la lista en docs/TEMARIO.md)`);
    }
    const questions: SyllabusQuestion[] = [];
    if (u.questions !== undefined && !Array.isArray(u.questions)) errors.push(`${where}: "questions" tiene que ser una lista`);
    (Array.isArray(u.questions) ? u.questions : []).forEach((q: unknown, j) => {
      const qwhere = `${where}, pregunta ${j + 1}`;
      if (!isObject(q)) {
        errors.push(`${qwhere}: tiene que ser un objeto { ... }`);
        return;
      }
      const text = localized(q.text, `${qwhere} "text"`, errors);
      const answer = q.answer;
      if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer > 9999) {
        errors.push(`${qwhere}: "answer" tiene que ser un número entero entre 0 y 9999`);
      }
      const hint = q.hint === undefined ? undefined : localized(q.hint, `${qwhere} "hint"`, errors);
      if (text && typeof answer === 'number') questions.push({ text, answer, ...(hint ? { hint } : {}) });
    });
    if (skills.length === 0 && questions.length === 0 && rawSkills.length === 0) {
      errors.push(`${where}: no tiene ni habilidades ("skills") ni preguntas ("questions")`);
    }
    if (uname) units.push({ id: uid, name: uname, skills, questions });
  });
  if (errors.length > 0 || !name) return { errors };
  return { syllabus: { id, name, units }, errors };
}

/** Todas las preguntas propias del temario, en orden. */
export function syllabusQuestions(syllabus: Syllabus): SyllabusQuestion[] {
  return syllabus.units.flatMap((u) => u.questions);
}

/** Habilidades que trabaja el temario, sin repetir y en orden de currículo. */
export function syllabusSkills(syllabus: Syllabus): SkillId[] {
  const wanted = new Set(syllabus.units.flatMap((u) => u.skills));
  return SKILL_IDS.filter((s) => wanted.has(s));
}

/**
 * Convierte una pregunta del temario en un ejercicio que la interfaz sabe
 * enseñar y corregir: el enunciado va en `story` y la respuesta en `c`.
 * `skill` es solo la etiqueta más cercana (problemas con texto); como va
 * marcado `custom`, no se apunta en el dominio.
 */
export function questionExercise(syllabus: Syllabus, question: SyllabusQuestion, index: number): Exercise {
  return {
    id: `temario:${syllabus.id}:${index}`,
    skill: 'word-problems-within-10',
    format: 'result',
    operator: '+',
    a: question.answer,
    b: 0,
    c: question.answer,
    hidden: 'c',
    answer: question.answer,
    story: question.text,
    ...(question.hint ? { hint: question.hint } : {}),
    custom: true,
    difficulty: 3,
  };
}
