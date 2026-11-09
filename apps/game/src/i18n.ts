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
  backToMap: { es: 'Seguir explorando', ca: 'Seguir explorant' },
  coins: { es: 'Cifras', ca: 'Xifres' },
  mastery: { es: 'Dominio', ca: 'Domini' },
  gem: { es: '¡Gema de dominio!', ca: 'Gemma de domini!' },
  challenge: { es: 'Reto', ca: 'Repte' },
  review: { es: 'Repaso', ca: 'Repàs' },
  settings: { es: 'Ajustes', ca: 'Ajustos' },
  back: { es: 'Volver', ca: 'Tornar' },
  languageLabel: { es: 'Idioma', ca: 'Idioma' },
  timer: { es: 'Tiempo', ca: 'Temps' },
  textSize: { es: 'Tamaño del texto', ca: 'Mida del text' },
  listen: { es: 'Escuchar el ejercicio', ca: 'Escoltar l’exercici' },
  autoVoice: { es: 'Voz automática', ca: 'Veu automàtica' },
  on: { es: 'Sí', ca: 'Sí' },
  off: { es: 'No', ca: 'No' },
  normal: { es: 'Normal', ca: 'Normal' },
  large: { es: 'Grande', ca: 'Gran' },
  weakToAdd: { es: 'Débil a la suma', ca: 'Feble a la suma' },
  weakToSub: { es: 'Débil a la resta', ca: 'Feble a la resta' },
  weakHitAdd: { es: '¡Es débil a la suma!', ca: 'És feble a la suma!' },
  weakHitSub: { es: '¡Es débil a la resta!', ca: 'És feble a la resta!' },
  placementTitle: { es: '¡Vamos a ver qué sabes!', ca: 'Anem a veure què saps!' },
  placementProgress: { es: 'Ejercicio', ca: 'Exercici' },
  placementSkip: { es: 'Ahora no', ca: 'Ara no' },
  placementDone: { es: '¡Listo! Ya sé por dónde empezar.', ca: 'Fet! Ja sé per on començar.' },
  placementGo: { es: 'A jugar', ca: 'A jugar' },
  rescue: { es: 'Rescatar', ca: 'Rescatar' },
  rescued: { es: '¡Rescatado!', ca: 'Rescatat!' },
  rescuedNew: { es: '¡Nueva criatura en tu colección!', ca: 'Nova criatura a la teva col·lecció!' },
  rescuedAgain: { es: 'Ya estaba en tu colección.', ca: 'Ja era a la teva col·lecció.' },
  rescueTitle: { es: 'Rescatar a la criatura', ca: 'Rescatar la criatura' },
  collection: { es: 'Colección', ca: 'Col·lecció' },
  collectionCount: { es: 'rescatadas', ca: 'rescatades' },
  language: { es: 'Català', ca: 'Castellano' },
} as const satisfies Record<string, Record<Locale, string>>;

export type StringKey = keyof typeof STRINGS;

export function tr(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
