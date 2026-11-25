import { describe, expect, it } from 'vitest';
import { tokenFromHash, unsubscribe } from '../src/unsubscribe';

const TOKEN = `11111111-2222-4333-8444-555555555555.${'a'.repeat(64)}`;

describe('tokenFromHash', () => {
  it('lee el token del fragmento', () => {
    expect(tokenFromHash(`#${TOKEN}`)).toBe(TOKEN);
  });
  it('rechaza lo que no tiene la forma', () => {
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash('#hola')).toBeNull();
    expect(tokenFromHash(`#${TOKEN}x`)).toBeNull();
  });
});

describe('unsubscribe', () => {
  const reply = (status: number, body: unknown = {}): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

  it('da la baja y devuelve el idioma de la familia', async () => {
    expect(await unsubscribe('https://x.supabase.co/', TOKEN, reply(200, { ok: true, locale: 'ca' }))).toEqual({ kind: 'done', locale: 'ca' });
  });
  it('envía el token en el cuerpo, no en la dirección', async () => {
    let seen = { url: '', body: '' };
    const spy = (async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return new Response('{"locale":"es"}', { status: 200 });
    }) as unknown as typeof fetch;
    await unsubscribe('https://x.supabase.co', TOKEN, spy);
    expect(seen.url).toBe('https://x.supabase.co/functions/v1/unsubscribe');
    expect(seen.body).toBe(JSON.stringify({ token: TOKEN }));
  });
  it('un enlace malo no es un fallo de red', async () => {
    expect(await unsubscribe('https://x.supabase.co', TOKEN, reply(400, { error: 'token' }))).toEqual({ kind: 'bad-link' });
  });
  it('un fallo del servidor o de red se puede reintentar', async () => {
    expect(await unsubscribe('https://x.supabase.co', TOKEN, reply(500))).toEqual({ kind: 'failed' });
    const down = (async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch;
    expect(await unsubscribe('https://x.supabase.co', TOKEN, down)).toEqual({ kind: 'failed' });
  });
});
