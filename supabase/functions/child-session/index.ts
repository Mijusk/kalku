// Edge Function `child-session` (#47): el adulto de una familia entra como uno de sus niños en otro aparato.
//
// Recibe el token del adulto (login por enlace de correo) y el id de un niño de su familia.
// Si el niño es de su familia, devuelve una sesión DEL MISMO NIÑO (mismo `sub`): su id no
// cambia, así que no se copia ni se mueve ninguna fila. La firma usa un secreto que solo
// existe en el servidor (`KALKU_JWT_SECRET`, el JWT secret del proyecto).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { childClaims, CHILD_SESSION_DAYS, signJwt } from './jwt.ts';

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secret = Deno.env.get('KALKU_JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET');
  if (!url || !key || !secret) return json(500, { error: 'config' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Quién es el adulto: sale del token. Un niño (login anónimo) no puede usar esta función.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: 'auth' });
  if (auth.user.is_anonymous) return json(403, { error: 'not-adult' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'json' });
  }
  const childId = typeof body === 'object' && body !== null ? (body as { childId?: unknown }).childId : undefined;
  if (typeof childId !== 'string' || !UUID.test(childId)) return json(400, { error: 'child' });

  // ¿Es de su familia?
  const { data: family, error: familyError } = await admin.from('families').select('id').eq('owner_id', auth.user.id).maybeSingle();
  if (familyError) return json(500, { error: 'db' });
  if (!family) return json(403, { error: 'not-in-family' });
  const { data: link, error: linkError } = await admin
    .from('family_children')
    .select('child_id')
    .eq('family_id', family.id)
    .eq('child_id', childId.toLowerCase())
    .maybeSingle();
  if (linkError) return json(500, { error: 'db' });
  if (!link) return json(403, { error: 'not-in-family' });

  const { data: child } = await admin.from('children').select('nickname').eq('id', childId.toLowerCase()).maybeSingle();

  const now = Math.floor(Date.now() / 1000);
  const accessToken = await signJwt(childClaims(link.child_id, `${url}/auth/v1`, now), secret);
  return json(200, {
    access_token: accessToken,
    expires_in: CHILD_SESSION_DAYS * 24 * 3600,
    nickname: child?.nickname ?? '',
  });
});
