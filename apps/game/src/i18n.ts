import type { Locale } from '@kalku/exercises';

/**
 * Textos de la interfaz. Toda frase que vea el niño va aquí, en los dos
 * idiomas. Las pistas y los nombres de habilidades viven en @kalku/exercises.
 */
const STRINGS = {
  quickAttack: { es: 'Ataque rápido', ca: 'Atac ràpid' },
  strongAttack: { es: 'Ataque fuerte', ca: 'Atac fort' },
  chooseAction: { es: '¿Qué ataque usas?', ca: 'Quin atac fas servir?' },
  check: { es: 'Comprobar', ca: 'Comprovar' },
  hint: { es: 'Pista', ca: 'Pista' },
  erase: { es: 'Borrar', ca: 'Esborrar' },
  correct: { es: '¡Muy bien!', ca: 'Molt bé!' },
  wrong: { es: 'Casi. Prueba otra vez.', ca: 'Gairebé. Torna-ho a provar.' },
  invalid: { es: 'Escribe un número.', ca: 'Escriu un número.' },
  reveal: { es: 'La respuesta era', ca: 'La resposta era' },
  victory: { es: '¡Has ganado!', ca: 'Has guanyat!' },
  defeat: { es: '¡Uf! Descansa y vuelve a intentarlo.', ca: 'Uf! Descansa i torna-ho a provar.' },
  nextBattle: { es: 'Siguiente combate', ca: 'Següent combat' },
  coins: { es: 'Cifras', ca: 'Xifres' },
  mastery: { es: 'Dominio', ca: 'Domini' },
  gem: { es: '¡Gema de dominio!', ca: 'Gemma de domini!' },
  challenge: { es: 'Reto', ca: 'Repte' },
  review: { es: 'Repaso', ca: 'Repàs' },
  language: { es: 'Català', ca: 'Castellano' },
} as const satisfies Record<string, Record<Locale, string>>;

export type StringKey = keyof typeof STRINGS;

export function tr(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
