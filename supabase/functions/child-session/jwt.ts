// Firma de tokens HS256 con WebCrypto (sin dependencias, funciona en Deno y en Node).

function base64url(bytes: Uint8Array): string {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encoder = new TextEncoder();

/** Devuelve el JWT firmado con HS256 del `payload` con `secret`. */
export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const head = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${body}`)));
  return `${head}.${body}.${base64url(signature)}`;
}

/** Días que dura la sesión de niño que da el adulto (no se renueva sola). */
export const CHILD_SESSION_DAYS = 7;

/** Claims de la sesión de un niño: el mismo `sub` que su cuenta anónima, marcada como anónima. */
export function childClaims(childId: string, issuer: string, nowSeconds: number, days = CHILD_SESSION_DAYS): Record<string, unknown> {
  return {
    aud: 'authenticated',
    role: 'authenticated',
    sub: childId,
    iss: issuer,
    iat: nowSeconds,
    exp: nowSeconds + days * 24 * 3600,
    is_anonymous: true,
    app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
    user_metadata: {},
  };
}
