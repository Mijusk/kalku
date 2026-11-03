import type { Exercise, Hint, Locale } from './types.js';

/**
 * Pistas en tres niveles, de menos a más ayuda:
 * 1. Una estrategia («cuenta hacia delante desde el mayor»).
 * 2. La descomposición del cálculo («8 + 5 = 8 + 2 + 3»).
 * 3. Casi la solución, dejando el último paso al niño.
 *
 * Fallar nunca quita monedas: da una pista y otra oportunidad.
 */
export function getHint(exercise: Exercise, level: Hint['level'], locale: Locale): Hint {
  const text =
    exercise.format === 'missing' ? missingHint(exercise, level, locale) : resultHint(exercise, level, locale);
  return { level, text };
}

const t = (locale: Locale, es: string, ca: string): string => (locale === 'ca' ? ca : es);

function resultHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const { a, b } = ex;

  if (ex.operator === '+') {
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const toTen = 10 - big;
    const crossesTen = big < 10 && big + small > 10;

    if (level === 1) {
      return crossesTen
        ? t(locale, `Primero llega hasta 10 y luego suma lo que falta.`, `Primer arriba fins a 10 i després suma el que falta.`)
        : t(locale, `Empieza en ${big} y cuenta ${small} hacia delante.`, `Comença a ${big} i compta ${small} endavant.`);
    }
    if (level === 2) {
      return crossesTen
        ? t(
            locale,
            `${big} + ${small} = ${big} + ${toTen} + ${small - toTen}`,
            `${big} + ${small} = ${big} + ${toTen} + ${small - toTen}`,
          )
        : t(locale, `Cuenta: ${countSteps(big, small, 1)}…`, `Compta: ${countSteps(big, small, 1)}…`);
    }
    return crossesTen
      ? t(locale, `${big} + ${toTen} = 10. Ahora, 10 + ${small - toTen} = ?`, `${big} + ${toTen} = 10. Ara, 10 + ${small - toTen} = ?`)
      : t(locale, `${countSteps(big, small - 1, 1)}… ¿y el siguiente?`, `${countSteps(big, small - 1, 1)}… i el següent?`);
  }

  // Resta
  const unitsA = a % 10;
  const crossesTen = a > 10 && b > unitsA;

  if (level === 1) {
    return crossesTen
      ? t(locale, `Primero baja hasta 10 y luego quita lo que falta.`, `Primer baixa fins a 10 i després treu el que falta.`)
      : t(locale, `Empieza en ${a} y cuenta ${b} hacia atrás.`, `Comença a ${a} i compta ${b} enrere.`);
  }
  if (level === 2) {
    return crossesTen
      ? `${a} − ${b} = ${a} − ${unitsA} − ${b - unitsA}`
      : t(locale, `Cuenta hacia atrás: ${countSteps(a, b, -1)}…`, `Compta enrere: ${countSteps(a, b, -1)}…`);
  }
  return crossesTen
    ? t(locale, `${a} − ${unitsA} = 10. Ahora, 10 − ${b - unitsA} = ?`, `${a} − ${unitsA} = 10. Ara, 10 − ${b - unitsA} = ?`)
    : t(locale, `${countSteps(a, b - 1, -1)}… ¿y el siguiente?`, `${countSteps(a, b - 1, -1)}… i el següent?`);
}

function missingHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const { a, b, c } = ex;

  if (ex.operator === '+') {
    const known = ex.hidden === 'a' ? b : a;
    if (level === 1) {
      return t(locale, `¿Cuánto le falta a ${known} para llegar a ${c}?`, `Quant li falta a ${known} per arribar a ${c}?`);
    }
    if (level === 2) {
      return t(locale, `Cuenta desde ${known} hasta ${c}.`, `Compta des de ${known} fins a ${c}.`);
    }
    return t(locale, `Es lo mismo que ${c} − ${known}.`, `És el mateix que ${c} − ${known}.`);
  }

  // Resta con hueco
  if (ex.hidden === 'b') {
    if (level === 1) return t(locale, `¿Cuánto hay que quitar a ${a} para que quede ${c}?`, `Quant cal treure a ${a} perquè quedi ${c}?`);
    if (level === 2) return t(locale, `Cuenta desde ${c} hasta ${a}.`, `Compta des de ${c} fins a ${a}.`);
    return t(locale, `Es lo mismo que ${a} − ${c}.`, `És el mateix que ${a} − ${c}.`);
  }
  // hidden === 'a': _ − b = c
  if (level === 1) return t(locale, `¿De qué número quitas ${b} y te quedan ${c}?`, `De quin número treus ${b} i te'n queden ${c}?`);
  if (level === 2) return t(locale, `Piensa al revés: ${c} + ${b}.`, `Pensa-ho al revés: ${c} + ${b}.`);
  return t(locale, `${c} + ${b} = ?`, `${c} + ${b} = ?`);
}

/** «8, 9, 10» para mostrar el conteo paso a paso. */
function countSteps(start: number, steps: number, direction: 1 | -1): string {
  const values = [start];
  for (let i = 1; i <= steps; i++) values.push(start + i * direction);
  return values.join(', ');
}
