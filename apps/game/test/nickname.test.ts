import { describe, expect, it } from 'vitest';
import { checkNickname, NICKNAMES, NICKNAME_MAX } from '../src/nickname';

describe('apodo', () => {
  it('acepta «Zorro Veloz» pero avisa de que parece un nombre', () => {
    const c = checkNickname('Zorro Veloz');
    expect(c.ok).toBe(true);
    expect(c.looksLikeName).toBe(true);
  });

  it('una palabra no avisa', () => {
    expect(checkNickname('  Zorro ')).toEqual({ ok: true, nickname: 'Zorro', looksLikeName: false });
  });

  it('rechaza vacío y más de 30 caracteres', () => {
    expect(checkNickname('').ok).toBe(false);
    expect(checkNickname('   ').ok).toBe(false);
    expect(checkNickname('a'.repeat(NICKNAME_MAX)).ok).toBe(true);
    expect(checkNickname('a'.repeat(NICKNAME_MAX + 1)).ok).toBe(false);
  });

  it('«Ana García López» avisa', () => {
    expect(checkNickname('Ana García López').looksLikeName).toBe(true);
  });

  it('todos los apodos propuestos existen en es y ca, son válidos y no avisan', () => {
    expect(NICKNAMES.length).toBeGreaterThan(0);
    for (const n of NICKNAMES) {
      for (const locale of ['es', 'ca'] as const) {
        expect(n[locale]).toBeTruthy();
        const c = checkNickname(n[locale]);
        expect(c.ok && !c.looksLikeName).toBe(true);
      }
    }
  });
});
