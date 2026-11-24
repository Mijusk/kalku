import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CHILD_SESSION_DAYS, childClaims, signJwt } from '../../../supabase/functions/child-session/jwt';

function decode(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

describe('sesión de niño (Edge Function child-session)', () => {
  it('firma un JWT HS256 que otro verificador acepta', async () => {
    const claims = childClaims('11111111-1111-1111-1111-111111111111', 'https://x.supabase.co/auth/v1', 1_000);
    const token = await signJwt(claims, 'secreto');
    const [head, body, signature] = token.split('.') as [string, string, string];
    expect(decode(head)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decode(body)).toEqual(claims);
    expect(signature).toBe(createHmac('sha256', 'secreto').update(`${head}.${body}`).digest('base64url'));
  });

  it('la sesión es del mismo niño, anónima y caduca a los 7 días', () => {
    const claims = childClaims('kid', 'iss', 1_000);
    expect(claims.sub).toBe('kid');
    expect(claims.is_anonymous).toBe(true);
    expect(claims.role).toBe('authenticated');
    expect(claims.exp).toBe(1_000 + CHILD_SESSION_DAYS * 86_400);
  });

  it('con otro secreto la firma cambia', async () => {
    const claims = childClaims('kid', 'iss', 1);
    expect(await signJwt(claims, 'a')).not.toBe(await signJwt(claims, 'b'));
  });
});
