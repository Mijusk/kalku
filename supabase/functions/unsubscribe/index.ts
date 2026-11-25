// Edge Function `unsubscribe` (#56): baja del resumen semanal en un clic.
//
// La llama la página /baja.html con el token del enlace del correo (`{ token }`). No pide inicio de
// sesión: la firma del token (HMAC con un secreto del servidor) demuestra que el enlace es de ese correo.
// Devuelve el idioma de la familia para que la página confirme en su idioma.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyUnsubscribeToken } from '../../../packages/content/src/summaryToken.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secret = Deno.env.get('KALKU_JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET');
  if (!url || !key || !secret) return json(500, { error: 'config' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'json' });
  }
  const token = typeof body === 'object' && body !== null ? (body as { token?: unknown }).token : undefined;
  if (typeof token !== 'string' || token.length > 200) return json(400, { error: 'token' });
  const familyId = await verifyUnsubscribeToken(token, secret);
  if (!familyId) return json(400, { error: 'token' });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('unsubscribe_summary', { p_family: familyId });
  if (error) return json(500, { error: 'db' });
  return json(200, { ok: true, locale: data === 'ca' ? 'ca' : 'es' });
});
