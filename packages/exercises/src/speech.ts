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

const TENS: Record<Locale, readonly string[]> = {
  es: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
  ca: ['', '', 'vint', 'trenta', 'quaranta', 'cinquanta', 'seixanta', 'setanta', 'vuitanta', 'noranta'],
};

/** 21–29 en castellano van en una palabra: «veintitrés». */
const VEINTI: readonly string[] = ['', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];

/**
 * Un número como palabra (0–100); fuera de ese rango, en cifras. Con
 * `feminine`, concuerda con un nombre femenino: «veintiuna», «vint-i-dues».
 */
export function numberToWords(n: number, locale: Locale, feminine = false): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) return String(n);
  const words = (() => {
    if (n === 100) return locale === 'es' ? 'cien' : 'cent';
    const small = NUMBER_WORDS[locale][n];
    if (small !== undefined) return small;
    const tens = Math.floor(n / 10);
    const units = n % 10;
    const unitWord = NUMBER_WORDS[locale][units] ?? '';
    if (units === 0) return TENS[locale][tens] ?? String(n);
    if (locale === 'es') return tens === 2 ? (VEINTI[units] ?? String(n)) : `${TENS.es[tens]} y ${unitWord}`;
    return tens === 2 ? `vint-i-${unitWord}` : `${TENS.ca[tens]}-${unitWord}`;
  })();
  if (!feminine) return words;
  if (locale === 'es') return words.replace(/uno$/, 'una');
  return words.replace(/(^|-)un$/, '$1una').replace(/(^|-)dos$/, '$1dues');
}

export function speakExercise(exercise: Exercise, locale: Locale): string {
  // Un problema se lee tal cual: decir la operación le quitaría al niño la decisión.
  // Los objetos de los enunciados son femeninos: en catalán, «dues pomes», no «dos pomes».
  if (exercise.story) {
    return exercise.story[locale].replace(/\d+/g, (n) => numberToWords(Number(n), locale, true));
  }
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
