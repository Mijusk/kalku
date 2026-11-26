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
  if (exercise.story) return { level, text: storyHint(exercise, level, locale) };
  const text =
    exercise.format === 'missing' ? missingHint(exercise, level, locale) : resultHint(exercise, level, locale);
  return { level, text };
}

const t = (locale: Locale, es: string, ca: string): string => (locale === 'ca' ? ca : es);

/**
 * Problemas con enunciado: primero ayudan a decidir la operación y solo
 * después a calcularla.
 */
function storyHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  if (level === 1) {
    return t(
      locale,
      'Si te dan o juntas más, suma. Si se van o se quitan, resta.',
      "Si te'n donen o n'ajuntes més, suma. Si se'n van o se'n treuen, resta.",
    );
  }
  if (level === 2) {
    const sign = ex.operator === '+' ? '+' : '−';
    return t(locale, `Es una ${ex.operator === '+' ? 'suma' : 'resta'}: ${ex.a} ${sign} ${ex.b}`, `És una ${ex.operator === '+' ? 'suma' : 'resta'}: ${ex.a} ${sign} ${ex.b}`);
  }
  return resultHint(ex, 3, locale);
}

function resultHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const { a, b } = ex;
  if (ex.skill === 'tens-units') return tensUnitsHint(ex, level, locale);
  // Números hasta 100: por decenas y unidades, no contando de uno en uno.
  if (Math.max(a, b, ex.c) > 20) return bigHint(ex, level, locale);

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
        : t(locale, `Cuenta: ${countSteps(big, halfway(small), 1)}…`, `Compta: ${countSteps(big, halfway(small), 1)}…`);
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
      : t(locale, `Cuenta hacia atrás: ${countSteps(a, halfway(b), -1)}…`, `Compta enrere: ${countSteps(a, halfway(b), -1)}…`);
  }
  return crossesTen
    ? t(locale, `${a} − ${unitsA} = 10. Ahora, 10 − ${b - unitsA} = ?`, `${a} − ${unitsA} = 10. Ara, 10 − ${b - unitsA} = ?`)
    : t(locale, `${countSteps(a, b - 1, -1)}… ¿y el siguiente?`, `${countSteps(a, b - 1, -1)}… i el següent?`);
}

/** 40 + 7: el número se forma con sus decenas delante y sus unidades detrás. */
function tensUnitsHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const tens = Math.floor(ex.a / 10);
  if (level === 1) return t(locale, `${ex.a} son ${tens} decenas. Añade ${ex.b} unidades.`, `${ex.a} són ${tens} desenes. Afegeix-hi ${ex.b} unitats.`);
  if (level === 2) return t(locale, `${tens} decenas y ${ex.b} unidades.`, `${tens} desenes i ${ex.b} unitats.`);
  return t(locale, `Las decenas van delante: primero el ${tens} y luego el ${ex.b}.`, `Les desenes van davant: primer el ${tens} i després el ${ex.b}.`);
}

/** _ + 7 = 47 o 40 + _ = 47: separar el número en decenas y unidades. */
function tensUnitsMissingHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const tens = Math.floor(ex.c / 10);
  const units = ex.c % 10;
  if (level === 1) return t(locale, `Separa ${ex.c} en decenas y unidades.`, `Separa ${ex.c} en desenes i unitats.`);
  if (ex.hidden === 'a') {
    if (level === 2) return t(locale, `${ex.c} son ${tens} decenas y ${units} unidades.`, `${ex.c} són ${tens} desenes i ${units} unitats.`);
    return t(locale, `Es el ${tens} con un 0 detrás.`, `És el ${tens} amb un 0 darrere.`);
  }
  if (level === 2) return `${ex.c} = ${ex.c - units} + ?`;
  return t(locale, `Mira la última cifra de ${ex.c}.`, `Mira l'última xifra de ${ex.c}.`);
}

/**
 * Sumas y restas hasta 100: primero las decenas, luego las unidades.
 * 34 + 25 = 34 + 20 + 5; 52 − 27 = 52 − 20 − 7.
 */
function bigHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const { a, b } = ex;
  const bTens = b - (b % 10);
  const bUnits = b % 10;
  const plus = ex.operator === '+';
  const sign = plus ? '+' : '−';
  if (level === 1) {
    if (plus) {
      return (a % 10) + bUnits > 9
        ? t(locale, 'Suma las decenas y luego las unidades. Si las unidades pasan de 9, llevas una decena.', 'Suma les desenes i després les unitats. Si les unitats passen de 9, portes una desena.')
        : t(locale, 'Suma primero las decenas y luego las unidades.', 'Suma primer les desenes i després les unitats.');
    }
    return bUnits > a % 10
      ? t(locale, 'Quita primero las decenas. Luego quita las unidades bajando hasta la decena de antes.', 'Treu primer les desenes. Després treu les unitats baixant fins a la desena anterior.')
      : t(locale, 'Resta primero las decenas y luego las unidades.', 'Resta primer les desenes i després les unitats.');
  }
  // Un número de una cifra (o redondo): no hay nada que partir.
  if (bTens === 0 || bUnits === 0) {
    const toTen = plus ? 10 - (a % 10) : a % 10;
    if (level === 2) return t(locale, `Piensa en decenas: ${a} ${sign} ${b}. ¿Hasta qué decena llegas?`, `Pensa en desenes: ${a} ${sign} ${b}. Fins a quina desena arribes?`);
    if (bUnits === 0) return t(locale, `${a} ${sign} ${bTens}: cambia solo la cifra de las decenas.`, `${a} ${sign} ${bTens}: canvia només la xifra de les desenes.`);
    if (!plus && a % 10 === 0) return t(locale, `Piensa en 10 − ${b} y súmalo a ${a - 10}.`, `Pensa en 10 − ${b} i suma-ho a ${a - 10}.`);
    const ten = plus ? a + toTen : a - toTen;
    return toTen > 0 && toTen < b
      ? t(locale, `${a} ${sign} ${toTen} = ${ten}. Ahora, ${ten} ${sign} ${b - toTen} = ?`, `${a} ${sign} ${toTen} = ${ten}. Ara, ${ten} ${sign} ${b - toTen} = ?`)
      : t(locale, `Cambia solo las unidades: ${a % 10} ${sign} ${b}.`, `Canvia només les unitats: ${a % 10} ${sign} ${b}.`);
  }
  if (level === 2) return `${a} ${sign} ${b} = ${a} ${sign} ${bTens} ${sign} ${bUnits}`;
  const step = plus ? a + bTens : a - bTens;
  return t(locale, `${a} ${sign} ${bTens} = ${step}. Ahora, ${step} ${sign} ${bUnits} = ?`, `${a} ${sign} ${bTens} = ${step}. Ara, ${step} ${sign} ${bUnits} = ?`);
}

function missingHint(ex: Exercise, level: Hint['level'], locale: Locale): string {
  const { a, b, c } = ex;
  const big = Math.max(a, b, c) > 20;
  if (ex.skill === 'tens-units') return tensUnitsMissingHint(ex, level, locale);

  if (ex.operator === '+') {
    const known = ex.hidden === 'a' ? b : a;
    if (level === 1) {
      return t(locale, `¿Cuánto le falta a ${known} para llegar a ${c}?`, `Quant li falta a ${known} per arribar a ${c}?`);
    }
    if (level === 2) {
      return big
        ? t(locale, `Ve de 10 en 10 desde ${known} sin pasarte de ${c}, y luego de 1 en 1.`, `Ves de 10 en 10 des de ${known} sense passar-te de ${c}, i després d'1 en 1.`)
        : t(locale, `Cuenta desde ${known} hasta ${c}.`, `Compta des de ${known} fins a ${c}.`);
    }
    return t(locale, `Es lo mismo que ${c} − ${known}.`, `És el mateix que ${c} − ${known}.`);
  }

  // Resta con hueco
  if (ex.hidden === 'b') {
    if (level === 1) return t(locale, `¿Cuánto hay que quitar a ${a} para que quede ${c}?`, `Quant cal treure a ${a} perquè quedi ${c}?`);
    if (level === 2) {
      return big
        ? t(locale, `Ve de 10 en 10 desde ${c} sin pasarte de ${a}, y luego de 1 en 1.`, `Ves de 10 en 10 des de ${c} sense passar-te de ${a}, i després d'1 en 1.`)
        : t(locale, `Cuenta desde ${c} hasta ${a}.`, `Compta des de ${c} fins a ${a}.`);
    }
    return t(locale, `Es lo mismo que ${a} − ${c}.`, `És el mateix que ${a} − ${c}.`);
  }
  // hidden === 'a': _ − b = c
  if (level === 1) return t(locale, `¿De qué número quitas ${b} y te quedan ${c}?`, `De quin número treus ${b} i te'n queden ${c}?`);
  if (level === 2) return t(locale, `Piensa al revés: ${c} + ${b}.`, `Pensa-ho al revés: ${c} + ${b}.`);
  return t(locale, `${c} + ${b} = ?`, `${c} + ${b} = ?`);
}

/**
 * Pasos que enseña la pista de nivel 2: la mitad de los que faltan, sin
 * llegar nunca a la respuesta. El nivel 3 enseña todos menos el último.
 */
function halfway(steps: number): number {
  return Math.floor((steps - 1) / 2);
}

/** «8, 9, 10» para mostrar el conteo paso a paso. */
function countSteps(start: number, steps: number, direction: 1 | -1): string {
  const values = [start];
  for (let i = 1; i <= steps; i++) values.push(start + i * direction);
  return values.join(', ');
}
