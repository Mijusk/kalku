// Código de la tarjeta y entrada de la petición. Mismas reglas que `normalizeCode` de @kalku/content
// y `hashStudentCode` de apps/game/src/classes.ts (un test comprueba que dan lo mismo).

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ANIMALS = ['fox', 'owl', 'frog', 'whale', 'hedgehog', 'turtle'] as const;

/** Sesión del alumno en un aparato compartido: un día, no una semana. */
export const CLASS_SESSION_DAYS = 1;

/** «luna 47», «LUNA-47» y «lúna–47» son el mismo código: «LUNA-47». */
export function normalizeCode(raw: string): string {
  const clean = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const m = /^([A-Z]+)(\d{2})$/.exec(clean);
  return m ? `${m[1]}-${m[2]}` : clean;
}

/** sha-256 de «<id de la clase>:<CÓDIGO>» en hexadecimal: lo que guarda la base. */
export async function hashStudentCode(classId: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${classId}:${normalizeCode(code)}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type LoginRequest =
  | { kind: 'animal'; classId: string; studentId: string; animal: string }
  | { kind: 'code'; classId: string; code: string };

/** Lee el cuerpo sin fiarse de él. `null` si no vale. */
export function parseLoginRequest(body: unknown): LoginRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { classId, studentId, animal, code } = body as Record<string, unknown>;
  if (typeof classId !== 'string' || !UUID.test(classId)) return null;
  if (typeof code === 'string') {
    // Un código de verdad mide una decena de letras: lo demás ni se calcula.
    if (code.length === 0 || code.length > 30) return null;
    return { kind: 'code', classId: classId.toLowerCase(), code };
  }
  if (typeof studentId !== 'string' || !UUID.test(studentId)) return null;
  if (typeof animal !== 'string' || !(ANIMALS as readonly string[]).includes(animal)) return null;
  return { kind: 'animal', classId: classId.toLowerCase(), studentId: studentId.toLowerCase(), animal };
}

export type LoginResult =
  | { status: 'ok'; childId: string; nickname: string }
  | { status: 'wrong' | 'locked'; retryAfter: number }
  | { status: 'unknown' };

/** Lee lo que devuelve `class_login` (jsonb) sin fiarse de su forma. */
export function parseLoginResult(raw: unknown): LoginResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.status === 'ok' && typeof r.child_id === 'string' && UUID.test(r.child_id)) {
    return { status: 'ok', childId: r.child_id, nickname: typeof r.nickname === 'string' ? r.nickname : '' };
  }
  if (r.status === 'wrong' || r.status === 'locked') {
    return { status: r.status, retryAfter: typeof r.retry_after === 'number' ? r.retry_after : 0 };
  }
  if (r.status === 'unknown') return { status: 'unknown' };
  return null;
}
