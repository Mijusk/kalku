import type { KeyValueStore } from './sync';
import type { AnswerBody } from './sync';

/**
 * Cola de respuestas pendientes de enviar (#54).
 *
 * Una respuesta entra aquí antes de enviarse y sale solo cuando el servidor la
 * ha aceptado o rechazado. Así jugar sin conexión no pierde nada. Sin datos
 * personales: solo la semilla, lo respondido y la habilidad.
 */
export interface QueueItem {
  /** Orden de llegada: crece siempre. */
  id: number;
  body: AnswerBody;
}

export interface QueueStore {
  add(body: AnswerBody): Promise<void>;
  /** Todo lo pendiente, en el orden en que se jugó. */
  all(): Promise<QueueItem[]>;
  remove(id: number): Promise<void>;
}

/** Cola en memoria (tests y último recurso). */
export function memoryQueue(): QueueStore {
  let next = 1;
  let items: QueueItem[] = [];
  return {
    async add(body) {
      items.push({ id: next++, body });
    },
    async all() {
      return [...items];
    },
    async remove(id) {
      items = items.filter((i) => i.id !== id);
    },
  };
}

const LS_KEY = 'kalku:queue';

/** Cola sobre un almacén de claves (localStorage): para navegadores sin IndexedDB y para tests. */
export function keyValueQueue(store: KeyValueStore): QueueStore {
  const read = (): QueueItem[] => {
    try {
      const raw: unknown = JSON.parse(store.getItem(LS_KEY) ?? '[]');
      return Array.isArray(raw) ? (raw as QueueItem[]).filter((i) => typeof i?.id === 'number' && typeof i.body === 'object') : [];
    } catch {
      return [];
    }
  };
  return {
    async add(body) {
      const items = read();
      const id = (items[items.length - 1]?.id ?? 0) + 1;
      store.setItem(LS_KEY, JSON.stringify([...items, { id, body }]));
    },
    async all() {
      return read();
    },
    async remove(id) {
      store.setItem(LS_KEY, JSON.stringify(read().filter((i) => i.id !== id)));
    },
  };
}

const DB_NAME = 'kalku-queue';
const STORE = 'answers';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
  });
}

/** Cola en IndexedDB. Lanza al abrirse si el navegador no la deja usar. */
export function indexedDbQueue(idb: IDBFactory): QueueStore {
  let opened: Promise<IDBDatabase> | undefined;
  const open = (): Promise<IDBDatabase> => {
    opened ??= new Promise((resolve, reject) => {
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
      req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
    });
    return opened;
  };
  const store = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => (await open()).transaction(STORE, mode).objectStore(STORE);
  return {
    async add(body) {
      await request((await store('readwrite')).add({ body }));
    },
    async all() {
      return (await request((await store('readonly')).getAll())) as QueueItem[];
    },
    async remove(id) {
      await request((await store('readwrite')).delete(id));
    },
  };
}

/** La cola de la app: IndexedDB, y localStorage si el navegador no la ofrece o falla al abrirla. */
export function appQueue(): QueueStore {
  const fallback: QueueStore | null = typeof localStorage === 'undefined' ? null : keyValueQueue(localStorage);
  const idb = typeof indexedDB === 'undefined' ? null : indexedDbQueue(indexedDB);
  if (!idb) return fallback ?? memoryQueue();
  if (!fallback) return idb;
  // Si IndexedDB falla (modo privado), se pasa a localStorage; lo que ya hubiera en IndexedDB no se pierde porque no se pudo escribir.
  let useFallback = false;
  const pick = async <T>(fn: (q: QueueStore) => Promise<T>): Promise<T> => {
    if (!useFallback) {
      try {
        return await fn(idb);
      } catch {
        useFallback = true;
      }
    }
    return fn(fallback);
  };
  return { add: (b) => pick((q) => q.add(b)), all: () => pick((q) => q.all()), remove: (id) => pick((q) => q.remove(id)) };
}
