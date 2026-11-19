import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from '../src/supabase';

describe('cliente de Supabase', () => {
  it('sin variables no revienta: devuelve null', () => {
    expect(createSupabaseClient(undefined, undefined)).toBeNull();
    expect(createSupabaseClient('https://x.supabase.co', '')).toBeNull();
  });

  it('una URL inválida no revienta: devuelve null', () => {
    expect(createSupabaseClient('no es una url', 'clave')).toBeNull();
  });

  it('con variables válidas crea el cliente', () => {
    expect(createSupabaseClient('https://x.supabase.co', 'clave-publica')).not.toBeNull();
  });
});
