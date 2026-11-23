import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { supabaseFamilyBackend } from '../src/family';
import { defaultProgress } from '../src/progress';
import { NICKNAME_KEY, pushProgress, supabaseBackend, type KeyValueStore } from '../src/sync';

/**
 * Con Supabase local (`supabase start`). La CI de la base de datos define las tres
 * variables; en un `npm test` normal no hay servidor y este fichero no se ejecuta.
 * La Edge Function `child-session` no se prueba aquí (la CI no arranca el runtime de funciones).
 */
const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

const make = (key: string): SupabaseClient =>
  createClient(url as string, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

/** Un «navegador» de adulto nuevo: entra por el enlace de correo (generado por el servidor, sin correo real). */
async function adultBrowser(admin: SupabaseClient, email: string): Promise<SupabaseClient> {
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const hash = link.data.properties?.hashed_token;
  if (!hash) throw new Error('Sin enlace');
  const client = make(anonKey as string);
  const { error } = await client.auth.verifyOtp({ token_hash: hash, type: 'magiclink' });
  if (error) throw error;
  return client;
}

async function childBrowser(admin: SupabaseClient, nickname: string, mastery: number): Promise<{ client: SupabaseClient; id: string }> {
  const client = make(anonKey as string);
  const backend = supabaseBackend(client);
  const id = await backend.signInAnonymously();
  const store = memoryStore();
  store.setItem(NICKNAME_KEY, nickname);
  await pushProgress(backend, store, defaultProgress());
  // El dominio lo escribe el servidor al corregir (#46); aquí, con la clave de servicio.
  const seeded = await admin.from('progress').upsert({ child_id: id, skill: 'add-within-10', mastery, attempts: 5, correct: 4 });
  expect(seeded.error).toBeNull();
  return { client, id };
}

describe.skipIf(!url || !anonKey || !serviceKey)('cuenta de familia en Supabase local', () => {
  it('una familia une un niño y ve su progreso desde otro navegador, sin perder ni duplicar nada', async () => {
    const admin = make(serviceKey as string);
    const email = `adulto-${Date.now()}@example.com`;
    expect((await admin.auth.admin.createUser({ email, email_confirm: true })).error).toBeNull();

    const kid = await childBrowser(admin, 'Zorro', 40);
    const adult1 = await adultBrowser(admin, email);
    const family1 = supabaseFamilyBackend(kid.client, adult1);
    expect(await family1.adultId()).not.toBeNull();
    expect(await family1.childId()).toBe(kid.id);

    const before = await admin.from('progress').select('*').eq('child_id', kid.id);

    // Une al niño de este aparato (niño pide el código, adulto lo usa).
    const joined = await family1.joinWithCode(await family1.createLinkCode());
    expect(joined).toEqual({ childId: kid.id, nickname: 'Zorro' });

    // Otro navegador: el adulto entra de nuevo por enlace y ve el mismo progreso.
    const adult2 = await adultBrowser(admin, email);
    const family2 = supabaseFamilyBackend(make(anonKey as string), adult2);
    const children = await family2.listChildren();
    expect(children).toEqual([{ id: kid.id, nickname: 'Zorro', skillsTried: 1, averageMastery: 40 }]);

    // Unir otra vez al mismo niño no cambia nada.
    await family1.joinWithCode(await family1.createLinkCode());
    expect(await family2.listChildren()).toEqual(children);
    const after = await admin.from('progress').select('*').eq('child_id', kid.id);
    expect(after.data).toEqual(before.data);

    // El adulto no puede escribir el dominio de su hijo.
    const forged = await adult2.from('progress').update({ mastery: 100 }).eq('child_id', kid.id).select();
    expect(forged.data ?? []).toHaveLength(0);

    // El correo está solo en el adulto: ni la ficha ni la exportación del niño lo llevan.
    const row = await admin.from('children').select('*').eq('id', kid.id).single();
    expect(JSON.stringify(row.data)).not.toContain(email);
    const exported = await supabaseBackend(kid.client).exportData();
    expect(JSON.stringify(exported)).not.toContain(email);
    const users = await admin.auth.admin.getUserById(kid.id);
    expect(users.data.user?.email ?? '').toBe('');

    // El niño no ve nada de la familia.
    expect((await kid.client.from('families').select('*')).data ?? []).toHaveLength(0);
  });

  it('un niño de otra familia se rechaza y soltarlo no borra nada', async () => {
    const admin = make(serviceKey as string);
    const emailA = `a-${Date.now()}@example.com`;
    const emailB = `b-${Date.now()}@example.com`;
    await admin.auth.admin.createUser({ email: emailA, email_confirm: true });
    await admin.auth.admin.createUser({ email: emailB, email_confirm: true });
    const kid = await childBrowser(admin, 'Luna', 20);
    const familyA = supabaseFamilyBackend(kid.client, await adultBrowser(admin, emailA));
    const familyB = supabaseFamilyBackend(kid.client, await adultBrowser(admin, emailB));

    await familyA.joinWithCode(await familyA.createLinkCode());
    await expect(familyB.joinWithCode(await familyB.createLinkCode())).rejects.toMatchObject({ code: 'child-in-family' });
    await expect(familyB.joinWithCode('ZZZZZZZZ')).rejects.toMatchObject({ code: 'invalid-code' });

    await familyA.leave(kid.id);
    expect(await familyA.listChildren()).toEqual([]);
    const still = await admin.from('progress').select('mastery').eq('child_id', kid.id);
    expect(still.data).toHaveLength(1);
    // Ya suelto, otra familia puede unirlo.
    await familyB.joinWithCode(await familyB.createLinkCode());
    expect(await familyB.listChildren()).toHaveLength(1);
  });
});
