import { describe, expect, it } from 'vitest';
import { pickPrivacyLocale } from '../src/privacyLocale';

const saved = (locale: string) => JSON.stringify({ locale });

describe('idioma de /privacidad', () => {
  it('usa el ajuste guardado antes que el navegador', () => {
    expect(pickPrivacyLocale('', saved('ca'), ['es-ES'])).toBe('ca');
    expect(pickPrivacyLocale('', saved('es'), ['ca'])).toBe('es');
  });

  it('sin ajuste, usa el idioma del navegador', () => {
    expect(pickPrivacyLocale('', null, ['ca-ES', 'es'])).toBe('ca');
    expect(pickPrivacyLocale('', null, ['en-US', 'es-ES'])).toBe('es');
  });

  it('?lang= manda sobre todo lo demás', () => {
    expect(pickPrivacyLocale('?lang=ca', saved('es'), ['es'])).toBe('ca');
  });

  it('con datos corruptos o idiomas desconocidos, castellano', () => {
    expect(pickPrivacyLocale('', '{no es json', ['en'])).toBe('es');
    expect(pickPrivacyLocale('?lang=fr', saved('xx'), [])).toBe('es');
    expect(pickPrivacyLocale('', 'null', ['fr'])).toBe('es');
  });
});
