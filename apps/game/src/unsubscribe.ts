/**
 * Baja del resumen semanal desde el enlace del correo (#56). El token va en el fragmento (`#`) de la
 * dirección: el navegador no lo envía a ningún servidor al abrir la página; solo se manda a la
 * función `unsubscribe`, que comprueba su firma.
 */
import type { Locale } from '@kalku/exercises';

export type UnsubscribeResult = { kind: 'done'; locale: Locale } | { kind: 'bad-link' } | { kind: 'failed' };

/** Token del fragmento (`#<id>.<firma>`), o `null` si no tiene la forma esperada. */
export function tokenFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, '');
  return /^[0-9a-f-]{36}\.[0-9a-f]{64}$/i.test(raw) ? raw : null;
}

/** Llama a la función de baja. `fetcher` se sustituye en los tests. */
export async function unsubscribe(baseUrl: string, token: string, fetcher: typeof fetch = fetch): Promise<UnsubscribeResult> {
  try {
    const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}/functions/v1/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      referrerPolicy: 'no-referrer',
    });
    if (response.status === 400) return { kind: 'bad-link' };
    if (!response.ok) return { kind: 'failed' };
    const body = (await response.json()) as { locale?: unknown };
    return { kind: 'done', locale: body.locale === 'ca' ? 'ca' : 'es' };
  } catch {
    return { kind: 'failed' };
  }
}
