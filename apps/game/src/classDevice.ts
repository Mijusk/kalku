/**
 * Aparato compartido de clase (#53). Cuando un niño entra con la tarjeta, la sesión vive solo en
 * `sessionStorage` (se va al cerrar la pestaña) y `localStorage` guarda la copia para jugar sin red
 * marcada con `CLASS_DEVICE_KEY`. Si la pestaña se cierra sin pulsar «Salir», la copia queda marcada
 * pero ya no hay sesión: al abrir el juego se borra (`wipeAbandonedClassData`).
 * Este fichero no importa nada del juego para que lo use hasta el cliente de Supabase.
 */

/** En `localStorage`: la copia local de este aparato es de un alumno de clase. */
export const CLASS_DEVICE_KEY = 'kalku:class-device';
/** En `sessionStorage`: hay un alumno dentro en esta pestaña; el valor es el id de su clase. */
export const CLASS_ACTIVE_KEY = 'kalku:class-active';
/** Clave de la sesión de Supabase del alumno, en `sessionStorage`. */
export const CLASS_AUTH_KEY = 'kalku-class-auth';

export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Id de clase del QR (`?clase=<id>`), o `null` si no hay o no vale (`?clase` sin id abre la entrada a pedir el enlace). */
export function classIdFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get('clase');
  return value && UUID.test(value) ? (UUID.exec(value)?.[0].toLowerCase() ?? null) : null;
}

/** Id de clase de lo que pegue el niño o el adulto: el enlace de la tarjeta o el id suelto. */
export function classIdFromText(text: string): string | null {
  const match = UUID.exec(text.trim());
  return match ? match[0].toLowerCase() : null;
}

/** ¿Hay un alumno dentro en esta pestaña? Devuelve el id de su clase. */
export function activeClassId(session: Store): string | null {
  const value = session.getItem(CLASS_ACTIVE_KEY);
  return value && UUID.test(value) ? value : null;
}

/** ¿Este aparato juega como aparato de clase? Entonces la sesión no se guarda en `localStorage`. */
export function isClassDevice(search: string, session: Store | undefined): boolean {
  return new URLSearchParams(search).has('clase') || (session !== undefined && activeClassId(session) !== null);
}

/**
 * Si una pestaña anterior dejó datos de un alumno y ya no hay sesión (cerraron sin pulsar «Salir»),
 * los borra. Devuelve si borró algo. `keys` son las claves de `localStorage` del niño.
 */
export function wipeAbandonedClassData(local: Store, session: Store, keys: readonly string[]): boolean {
  if (local.getItem(CLASS_DEVICE_KEY) !== '1' || activeClassId(session) !== null) return false;
  for (const key of keys) local.removeItem?.(key);
  return true;
}
