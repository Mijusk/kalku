import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createProfile } from '@kalku/exercises';
import { defaultProgress } from '../src/progress';
import { NICKNAME_KEY, pullProgress, pushProgress, supabaseBackend, type KeyValueStore } from '../src/sync';

/**
 * Con Supabase local (`supabase start`). La CI de la base de datos define
 * SUPABASE_TEST_URL y SUPABASE_TEST_ANON_KEY; en un `npm test` normal no hay
 * servidor local y este fichero no se ejecuta.
 */
const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

describe.skipIf(!url || !anonKey)('progreso en Supabase local', () => {
  it('login anónimo → guardar → cliente nuevo con la misma sesión → recupera lo guardado', async () => {
    // Almacén de sesión compartido: es lo que hace el navegador con localStorage.
    const sessionStore = memoryStore();
    const make = () =>
      createClient(url as string, anonKey as string, {
        auth: { persistSession: true, autoRefreshToken: false, storage: { getItem: (k) => sessionStore.getItem(k), setItem: (k, v) => sessionStore.setItem(k, v), removeItem: () => undefined } },
      });

    const store = memoryStore();
    store.setItem(NICKNAME_KEY, 'Zorro');
    const first = supabaseBackend(make());
    const id = await first.signInAnonymously();
    expect(id).toBeTruthy();

    const progress = defaultProgress();
    progress.coins = 12;
    progress.gems = ['add-within-10'];
    progress.placementDone = true;
    progress.profile = createProfile();
    progress.profile['add-within-10'] = { mastery: 24, attempts: 4, correct: 3 };
    await pushProgress(first, store, progress);

    // «Recarga»: cliente nuevo, sin copia local.
    vi.stubGlobal('localStorage', memoryStore());
    const second = supabaseBackend(make());
    const result = await pullProgress(second, store);
    vi.unstubAllGlobals();
    expect(result.source).toBe('server');
    expect(result.progress).toEqual(progress);
  });
});
