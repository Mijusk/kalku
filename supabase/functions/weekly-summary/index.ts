// Edge Function `weekly-summary` (#56): envía a cada familia el resumen de la última semana.
//
// La lanza la tarea semanal de la base de datos (`trigger_weekly_summary`, lunes 07:00 UTC) con
// `Authorization: Bearer <SUMMARY_CRON_SECRET>`. Secretos (`supabase secrets set`, nunca en el repo):
//   BREVO_API_KEY       clave de la API de Brevo. Sin ella el envío queda inactivo y no falla nada.
//   SUMMARY_SENDER      remitente verificado en Brevo.
//   SUMMARY_CRON_SECRET clave que usa la tarea semanal para llamar a esta función.
//   SITE_URL            (opcional) dirección pública del juego; por defecto https://kalku-6ty.pages.dev (hasta tener kalkujuego.com)
// Los datos salen de `weekly_summary_data` (solo familias con correo confirmado, consentimiento y sin baja).
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  brevoRequestBody,
  buildWeeklySummary,
  renderSummaryEmail,
  unsubscribeUrl,
  type SummaryAnswer,
} from '../../../packages/content/src/weeklySummary.ts';
import { createUnsubscribeToken } from '../../../packages/content/src/summaryToken.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const WEEK_MS = 7 * 24 * 3600 * 1000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface FamilyData {
  family_id: string;
  email: string;
  locale: 'es' | 'ca';
  children: { child_id: string; nickname: string; answers: SummaryAnswer[] }[];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const cronSecret = Deno.env.get('SUMMARY_CRON_SECRET');
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!cronSecret || !sameSecret(bearer, cronSecret)) return json(401, { error: 'auth' });

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('SUMMARY_SENDER');
  if (!apiKey || !senderEmail) return json(200, { inactive: true, sent: 0 });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const tokenSecret = Deno.env.get('KALKU_JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET');
  if (!url || !key || !tokenSecret) return json(500, { error: 'config' });
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://kalku-6ty.pages.dev';
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const to = new Date();
  const week = { from: new Date(to.getTime() - WEEK_MS).toISOString(), to: to.toISOString() };
  const { data, error } = await admin.rpc('weekly_summary_data', { p_from: week.from, p_to: week.to });
  if (error) return json(500, { error: 'db' });

  let sent = 0;
  let failed = 0;
  for (const family of (data ?? []) as FamilyData[]) {
    const summary = buildWeeklySummary(
      family.children.map((c) => ({ childId: c.child_id, nickname: c.nickname, answers: c.answers })),
      week,
    );
    // Si nadie ha jugado, no se manda un correo vacío.
    if (summary.every((c) => c.exercises === 0)) continue;
    const token = await createUnsubscribeToken(family.family_id, tokenSecret);
    const email = renderSummaryEmail(summary, family.locale, unsubscribeUrl(siteUrl, token));
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(brevoRequestBody({ email: senderEmail, name: 'Kalku' }, family.email, email)),
    });
    if (response.ok) sent += 1;
    else failed += 1;
  }
  return json(200, { sent, failed });
});
