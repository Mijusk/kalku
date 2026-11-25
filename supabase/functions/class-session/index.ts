// Edge Function `class-session` (#53): el niño entra en su clase con apodo + animal o con el código
// de la tarjeta, sin cuenta de adulto.
//
// Quien comprueba es el servidor: la función SQL `class_login` mira el animal (o el hash del código),
// limita los intentos y, si acierta, devuelve el niño del alumno (lo crea la primera vez). Aquí solo se
// firma su sesión, igual que `child-session` (#47), con el secreto `KALKU_JWT_SECRET`.
// No necesita sesión previa (verify_jwt = false en config.toml): el niño todavía no tiene ninguna.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { childClaims, signJwt } from '../child-session/jwt.ts';
import { CLASS_SESSION_DAYS, hashStudentCode, parseLoginRequest, parseLoginResult } from './code.ts';

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
  const request = parseLoginRequest(body);
  if (!request) return json(400, { error: 'request' });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('class_login', {
    p_class: request.classId,
    p_student: request.kind === 'animal' ? request.studentId : null,
    p_animal: request.kind === 'animal' ? request.animal : null,
    p_code_hash: request.kind === 'code' ? await hashStudentCode(request.classId, request.code) : null,
  });
  if (error) return json(500, { error: error.message.includes('class-full') ? 'class-full' : 'db' });

  const result = parseLoginResult(data);
  if (!result) return json(500, { error: 'db' });
  // Mismo mensaje para «no existe» y «no es tu animal»: no se enseña qué alumnos hay.
  if (result.status === 'unknown') return json(403, { error: 'wrong', retry_after: 0 });
  if (result.status === 'locked') return json(429, { error: 'locked', retry_after: result.retryAfter });
  if (result.status === 'wrong') return json(403, { error: 'wrong', retry_after: result.retryAfter });

  const now = Math.floor(Date.now() / 1000);
  const accessToken = await signJwt(childClaims(result.childId, `${url}/auth/v1`, now, CLASS_SESSION_DAYS), secret);
  return json(200, {
    access_token: accessToken,
    expires_in: CLASS_SESSION_DAYS * 24 * 3600,
    child_id: result.childId,
    nickname: result.nickname,
  });
});
