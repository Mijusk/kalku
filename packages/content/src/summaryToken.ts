/**
 * Token del enlace de baja del resumen semanal (#56). No se guarda: es `<id de la familia>.<firma>`,
 * con la firma HMAC-SHA256 del id con un secreto que solo existe en el servidor. Así el enlace de
 * cada correo se puede volver a calcular sin guardar nada, y nadie puede darse de baja por otro.
 * Usa WebCrypto (Node 22 y Deno); nada del navegador.
 */

// El paquete no carga los tipos del navegador ni de Node: se declara solo lo que se usa de WebCrypto.
declare const crypto: {
  subtle: {
    importKey(format: 'raw', key: Uint8Array, algorithm: { name: string; hash: string }, extractable: boolean, usages: string[]): Promise<unknown>;
    sign(algorithm: string, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  };
};
declare class TextEncoder {
  encode(input: string): Uint8Array;
}

const ENCODER = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(familyId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', ENCODER.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, ENCODER.encode(`summary-unsubscribe:${familyId}`)));
}

export async function createUnsubscribeToken(familyId: string, secret: string): Promise<string> {
  return `${familyId}.${await sign(familyId, secret)}`;
}

/** Devuelve el id de la familia si la firma es buena, o `null`. */
export async function verifyUnsubscribeToken(token: string, secret: string): Promise<string | null> {
  const [familyId, signature, ...rest] = token.split('.');
  if (!familyId || !signature || rest.length > 0 || !UUID.test(familyId)) return null;
  const expected = await sign(familyId, secret);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0 ? familyId : null;
}
