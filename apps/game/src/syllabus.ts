import { parseSyllabus, questionExercise, syllabusQuestions, type Syllabus } from '@kalku/content';
import { generateExercise, type Exercise, type Rng } from '@kalku/exercises';

/**
 * Temarios de los centros (docs/TEMARIO.md). Cada JSON de
 * `packages/content/temarios/` entra solo en el juego: no hay que tocar código.
 * Se activa en un dispositivo con `?temario=<id>` (y se quita con `?temario=`).
 */
const FILES = import.meta.glob<unknown>('../../../packages/content/temarios/*.json', { eager: true, import: 'default' });

const STORAGE_KEY = 'kalku.temario';

export const SYLLABI: Syllabus[] = Object.values(FILES).flatMap((raw) => {
  const { syllabus } = parseSyllabus(raw);
  return syllabus ? [syllabus] : [];
});

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Lee `?temario=` de la dirección y lo recuerda en este dispositivo. */
export function readSyllabusParam(search: string = window.location.search): void {
  const params = new URLSearchParams(search);
  if (!params.has('temario')) return;
  const id = params.get('temario') ?? '';
  try {
    if (id && SYLLABI.some((s) => s.id === id)) storage()?.setItem(STORAGE_KEY, id);
    else storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: se juega con el currículo normal.
  }
}

export function activeSyllabus(): Syllabus | undefined {
  let id: string | null | undefined;
  try {
    id = storage()?.getItem(STORAGE_KEY);
  } catch {
    id = undefined;
  }
  return id ? SYLLABI.find((s) => s.id === id) : undefined;
}

/** El acertijo número `index`: del temario del centro si tiene preguntas; si no, un problema generado. */
export function riddleExercise(rng: Rng, index: number): Exercise {
  const syllabus = activeSyllabus();
  const questions = syllabus ? syllabusQuestions(syllabus) : [];
  const question = questions[index % Math.max(1, questions.length)];
  if (syllabus && question) return questionExercise(syllabus, question, index % questions.length);
  return generateExercise('word-problems-within-10', rng);
}
