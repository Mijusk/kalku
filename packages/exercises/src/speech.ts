import type { Exercise, Locale } from './types.js';

/**
 * Texto para leer un ejercicio en voz alta. Función pura: el navegador
 * (speechSynthesis) solo se encarga de pronunciarlo. Los signos y los números
 * salen en palabras para que el motor de voz no los lea mal.
 */

const NUMBER_WORDS: Record<Locale, readonly string[]> = {
  es: [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  ],
  ca: [
    'zero', 'un', 'dos', 'tres', 'quatre', 'cinc', 'sis', 'set', 'vuit', 'nou', 'deu',
    'onze', 'dotze', 'tretze', 'catorze', 'quinze', 'setze', 'disset', 'divuit', 'dinou', 'vint',
  ],
};

const WORDS = {
  es: { plus: 'más', minus: 'menos', equals: 'son', howMuch: '¿cuánto?', missingFor: '¿cuánto falta para' },
  ca: { plus: 'més', minus: 'menys', equals: 'són', howMuch: 'quant?', missingFor: 'quant falta per a' },
} as const;

/** Un número como palabra (0–20, lo que usa la fase 1); fuera de ese rango, en cifras. */
export function numberToWords(n: number, locale: Locale): string {
  return NUMBER_WORDS[locale][n] ?? String(n);
}

export function speakExercise(exercise: Exercise, locale: Locale): string {
  // Un problema se lee tal cual: decir la operación le quitaría al niño la decisión.
  if (exercise.story) return exercise.story[locale].replace(/\d+/g, (n) => numberToWords(Number(n), locale));
  const w = WORDS[locale];
  const op = exercise.operator === '-' ? w.minus : w.plus;
  const say = (n: number): string => numberToWords(n, locale);
  const { a, b, c } = exercise;
  switch (exercise.hidden) {
    case 'c':
      return `${say(a)} ${op} ${say(b)} ${w.equals}… ${w.howMuch}`;
    case 'b':
      // Solo en la suma tiene sentido «cuánto falta para»; en la resta se dice el resultado.
      return exercise.operator === '+'
        ? `${say(a)} ${op} ${w.missingFor} ${say(c)}?`
        : `${say(a)} ${op} ${w.howMuch} ${w.equals} ${say(c)}`;
    case 'a':
      return `${w.howMuch} ${op} ${say(b)} ${w.equals} ${say(c)}`;
  }
}
