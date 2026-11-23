// Edge Function `answer` (#46): corrige las respuestas del niño en el servidor.
//
// El niño manda qué ejercicio le salió (habilidad + semilla) y qué respondió; aquí
// se regenera el ejercicio con @kalku/exercises, se corrige y se aplica el dominio.
// El navegador ya no puede escribir `progress` ni `answers`: solo esta función, con
// la clave `service_role` que Supabase pone en el entorno (nunca está en el repo).
//
// Deno no sabe importar @kalku/exercises tal cual (sus imports acaban en .js); por
// eso `npm run build:function` empaqueta este fichero en `dist/index.js`, que es
// el que registra `config.toml`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createProfile,
  parseAnswerRequest,
  parsePlacementRequest,
  SKILL_IDS,
  validateAnswer,
  validatePlacement,
  type MasteryProfile,
  type Validation,
} from '@kalku/exercises';

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
  if (!url || !key) return json(500, { error: 'config' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Quién es el niño: sale del token, nunca del cuerpo de la petición.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: 'auth' });
  const childId = auth.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'json' });
  }
  const kind = typeof body === 'object' && body !== null ? (body as { kind?: unknown }).kind : undefined;
  // Se valida el cuerpo antes de tocar la base de datos.
  let validate: (profile: MasteryProfile) => Validation;
  if (kind === 'answer') {
    const parsed = parseAnswerRequest(body);
    if (!parsed.ok) return json(400, { error: parsed.error });
    validate = (profile) => validateAnswer(profile, parsed.value);
  } else if (kind === 'placement') {
    const parsed = parsePlacementRequest(body);
    if (!parsed.ok) return json(400, { error: parsed.error });
    validate = (profile) => validatePlacement(profile, parsed.value);
  } else {
    return json(400, { error: 'kind' });
  }

  const { data: child, error: childError } = await admin.from('children').select('id').eq('id', childId).maybeSingle();
  if (childError) return json(500, { error: 'db' });
  if (!child) return json(409, { error: 'no-child' });

  const { data: rows, error: rowsError } = await admin
    .from('progress')
    .select('skill, mastery, attempts, correct')
    .eq('child_id', childId);
  if (rowsError) return json(500, { error: 'db' });
  const profile: MasteryProfile = createProfile();
  for (const row of rows ?? []) {
    if ((SKILL_IDS as readonly string[]).includes(row.skill)) {
      profile[row.skill as keyof MasteryProfile] = { mastery: Number(row.mastery), attempts: Number(row.attempts), correct: Number(row.correct) };
    }
  }

  const result = validate(profile);
  if (!result.ok) return json(422, { error: result.error });

  const { error: saveError } = await admin.rpc('record_answers', {
    p_child: childId,
    p_answers: result.records.map((r) => ({ skill: r.skill, seed: r.seed, given: r.given, correct: r.correct, hints_used: r.hintsUsed })),
    p_progress: result.changed.map((skill) => ({ skill, ...result.profile[skill] })),
  });
  if (saveError) {
    // 23505: la semilla ya estaba respondida; no se guarda nada.
    if (saveError.code === '23505') return json(409, { error: 'repeated' });
    return json(500, { error: 'db' });
  }

  return json(200, {
    correct: result.records.length === 1 ? result.records[0]?.correct : undefined,
    progress: Object.fromEntries(result.changed.map((skill) => [skill, result.profile[skill]])),
  });
});
