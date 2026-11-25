import type { Locale, Rng } from '@kalku/exercises';

/**
 * Códigos de alumno para las tarjetas de clase (#52): «LUNA-47». Palabra de una lista propia
 * (cortas, fáciles de leer y dictar, sin tildes, sin nada feo ni ofensivo en castellano ni en
 * catalán) más dos cifras. El código solo es único dentro de su clase.
 */
export const CODE_WORDS: readonly string[] = [
  'LUNA', 'SOL', 'MAR', 'RIO', 'NUBE', 'PINO', 'ROSA', 'LIRIO', 'TRIGO', 'MIEL',
  'PERA', 'UVA', 'LIMON', 'FRESA', 'COCO', 'NUEZ', 'PAN', 'QUESO', 'FLOR', 'HOJA',
  'RAMA', 'MUSGO', 'ARENA', 'ROCA', 'COLINA', 'VALLE', 'ISLA', 'FARO', 'BARCO', 'VELA',
  'REMO', 'ANCLA', 'PERLA', 'CONCHA', 'COMETA', 'COHETE', 'ESTRELLA', 'TREN', 'PUENTE', 'TORRE',
  'CASTILLO', 'LLAVE', 'MAPA', 'BRUJULA', 'TAMBOR', 'FLAUTA', 'GUITARRA', 'CAMPANA', 'GLOBO', 'KIWI',
  'MANGO', 'ALBA', 'BRISA', 'NIEVE', 'TRUENO', 'ARCO', 'IRIS', 'NIDO', 'PLUMA', 'ESCALA',
];

export const CODE_NUMBER_MIN = 10;
export const CODE_NUMBER_MAX = 99;
/** Máximo de alumnos de una clase (el límite gratuito del docente, ver #51). */
export const CLASS_MAX_STUDENTS = 30;

/** Palabras que nunca pueden estar en la lista (no deben formar nada feo, con o sin cifras). */
const BANNED: readonly string[] = [
  'CULO', 'PEDO', 'POPO', 'CACA', 'PIS', 'MIERDA', 'PUTA', 'PUTO', 'SEXO', 'TETA', 'POLLA', 'COÑO',
  'NAZI', 'ODIO', 'MUERTE', 'MATAR', 'DROGA', 'TONTO', 'IDIOTA', 'GILIPOLLAS', 'CAGAR', 'FOLLAR',
  'MERDA', 'CUL', 'PUT', 'XUXA', 'GUARRO', 'MORT', 'ODI',
];

export interface SecretAnimal {
  id: string;
  name: Record<Locale, string>;
}

/** Los 6 animales secretos entre los que se elige uno por alumno (datos: añadir uno no toca lógica). */
export const SECRET_ANIMALS: readonly SecretAnimal[] = [
  { id: 'fox', name: { es: 'Zorro', ca: 'Guineu' } },
  { id: 'owl', name: { es: 'Búho', ca: 'Mussol' } },
  { id: 'frog', name: { es: 'Rana', ca: 'Granota' } },
  { id: 'whale', name: { es: 'Ballena', ca: 'Balena' } },
  { id: 'hedgehog', name: { es: 'Erizo', ca: 'Eriçó' } },
  { id: 'turtle', name: { es: 'Tortuga', ca: 'Tortuga' } },
];

export interface StudentCode {
  /** Código legible en mayúsculas, p. ej. «LUNA-47». */
  code: string;
  /** Id de uno de `SECRET_ANIMALS`. */
  animal: string;
}

/** Cuántos códigos distintos caben en una clase. */
export const CODE_SPACE = CODE_WORDS.length * (CODE_NUMBER_MAX - CODE_NUMBER_MIN + 1);

/** Pone el código en forma canónica: sin espacios ni guiones raros, mayúsculas, «LUNA-47». */
export function normalizeCode(raw: string): string {
  const clean = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const m = /^([A-Z]+)(\d{2})$/.exec(clean);
  return m ? `${m[1]}-${m[2]}` : clean;
}

/** Pista que se guarda en el servidor en vez del código: las dos primeras letras de la palabra. */
export function codeHint(code: string): string {
  return normalizeCode(code).slice(0, 2);
}

/**
 * Código y animal nuevos para un alumno. `taken` son los códigos que ya existen en la clase (en
 * forma canónica): nunca se repite ninguno. Falla con un error claro si la clase los agotó.
 */
export function generateStudentCode(rng: Rng, taken: ReadonlySet<string> = new Set()): StudentCode {
  if (taken.size >= CODE_SPACE) throw new RangeError('Se han agotado los códigos de la clase');
  for (let tries = 0; tries < 1000; tries++) {
    const code = `${rng.pick(CODE_WORDS)}-${rng.int(CODE_NUMBER_MIN, CODE_NUMBER_MAX)}`;
    if (!taken.has(code)) return { code, animal: rng.pick(SECRET_ANIMALS).id };
  }
  // Casi llena: se busca el primero libre, sin bucle infinito.
  for (const word of CODE_WORDS) {
    for (let n = CODE_NUMBER_MIN; n <= CODE_NUMBER_MAX; n++) {
      const code = `${word}-${n}`;
      if (!taken.has(code)) return { code, animal: rng.pick(SECRET_ANIMALS).id };
    }
  }
  throw new RangeError('Se han agotado los códigos de la clase');
}

/** Problemas de la lista de palabras y de los animales (vacío si está bien). */
export function validateClassCodes(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const w of CODE_WORDS) {
    if (!/^[A-Z]{3,8}$/.test(w)) problems.push(`Palabra no válida: ${w}`);
    if (seen.has(w)) problems.push(`Palabra repetida: ${w}`);
    seen.add(w);
    for (const bad of BANNED) if (w.includes(bad)) problems.push(`Palabra vetada en ${w}: ${bad}`);
  }
  if (SECRET_ANIMALS.length !== 6) problems.push('Tiene que haber exactamente 6 animales');
  const ids = new Set(SECRET_ANIMALS.map((a) => a.id));
  if (ids.size !== SECRET_ANIMALS.length) problems.push('Animales con id repetido');
  for (const a of SECRET_ANIMALS) if (!a.name.es.trim() || !a.name.ca.trim()) problems.push(`Animal sin nombre: ${a.id}`);
  return problems;
}
