import type { Locale } from '@kalku/exercises';

/**
 * Textos legales como datos (política de privacidad, versión para niños,
 * subencargados y datos que guarda el servidor). Un abogado los revisará antes
 * del piloto con niños reales.
 */

/** Versión de la política; súbela cada vez que cambie el contenido. */
export const PRIVACY_VERSION = '0.1';
export const PRIVACY_DATE = '2026-11-22';

/**
 * Mientras sea `true`, la página y las plantillas muestran «Borrador pendiente
 * de revisión legal». Cuando el abogado dé el visto bueno, ponlo en `false`
 * (y quita el aviso de los contratos en docs/legal/).
 */
export const LEGAL_DRAFT = true;

export type Localized = Record<Locale, string>;

export const DRAFT_NOTICE: Localized = {
  es: 'Borrador pendiente de revisión legal',
  ca: 'Esborrany pendent de revisió legal',
};

/** Marcadores que Luis debe rellenar antes del piloto; nada inventado. */
export const PENDING = {
  controllerName: { es: '[PENDIENTE: nombre o razón social del responsable]', ca: '[PENDENT: nom o raó social del responsable]' },
  controllerTaxId: { es: '[PENDIENTE: NIF]', ca: '[PENDENT: NIF]' },
  controllerAddress: { es: '[PENDIENTE: dirección postal]', ca: '[PENDENT: adreça postal]' },
  controllerEmail: { es: '[PENDIENTE: correo para ejercer derechos]', ca: '[PENDENT: correu per exercir drets]' },
} as const satisfies Record<string, Localized>;

/** Frase de «hasta cuándo se guardan los datos»; la usan la tabla y la política. */
const RETENTION_CHILD: Localized = {
  es: 'Hasta que la familia o el centro pidan borrarlo, o 12 meses sin jugar.',
  ca: 'Fins que la família o el centre demanin esborrar-ho, o 12 mesos sense jugar.',
};

export interface ServerDataItem {
  /** Tabla de Supabase. `auth.users` es el login anónimo. */
  table: 'children' | 'progress' | 'answers' | 'families' | 'family_children' | 'link_codes' | 'auth.users';
  /** Columnas tal como están en `supabase/migrations/` (un test las comprueba). */
  columns: readonly string[];
  what: Localized;
  purpose: Localized;
  retention: Localized;
}

/**
 * Todo lo que guarda el servidor. Si una migración añade una columna, el test
 * `legal.test.ts` falla hasta que se documente aquí.
 */
export const SERVER_DATA: readonly ServerDataItem[] = [
  {
    table: 'auth.users',
    columns: [],
    what: {
      es: 'Niño: un identificador anónimo generado por el sistema de acceso (sin correo ni contraseña). Adulto de una cuenta de familia: su correo electrónico y un identificador. El correo se guarda solo aquí, nunca en los datos del niño.',
      ca: 'Infant: un identificador anònim generat pel sistema d’accés (sense correu ni contrasenya). Adult d’un compte de família: el seu correu electrònic i un identificador. El correu es guarda només aquí, mai a les dades de l’infant.',
    },
    purpose: {
      es: 'Niño: recuperar su progreso sin dar ningún dato personal. Adulto: entrar con un enlace enviado por correo (sin contraseña) para ver el progreso de sus hijos y recuperarlo en otro aparato.',
      ca: 'Infant: recuperar el seu progrés sense donar cap dada personal. Adult: entrar amb un enllaç enviat per correu (sense contrasenya) per veure el progrés dels seus fills i recuperar-lo en un altre aparell.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'children',
    columns: ['id', 'nickname', 'created_at', 'extra'],
    what: {
      es: 'El identificador anónimo, un apodo (de 1 a 30 letras, no debe ser el nombre real), la fecha de creación y el resto de la partida: monedas del juego, gemas, criaturas rescatadas, ajustes e idioma.',
      ca: 'L’identificador anònim, un malnom (d’1 a 30 lletres, no ha de ser el nom real), la data de creació i la resta de la partida: monedes del joc, gemmes, criatures rescatades, ajustos i idioma.',
    },
    purpose: {
      es: 'Mostrar el apodo en el juego, saber a quién pertenece cada progreso y que la partida siga igual al volver a entrar.',
      ca: 'Mostrar el malnom al joc, saber a qui pertany cada progrés i que la partida continuï igual en tornar a entrar.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'progress',
    columns: ['child_id', 'skill', 'mastery', 'attempts', 'correct', 'updated_at'],
    what: {
      es: 'Por cada habilidad de matemáticas: nivel de dominio (0 a 100), intentos, aciertos y fecha de la última vez.',
      ca: 'Per cada habilitat de matemàtiques: nivell de domini (0 a 100), intents, encerts i data de l’última vegada.',
    },
    purpose: {
      es: 'Adaptar los ejercicios al nivel de cada niño y enseñar a la familia o al docente cómo avanza.',
      ca: 'Adaptar els exercicis al nivell de cada infant i mostrar a la família o al docent com avança.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'answers',
    columns: ['id', 'child_id', 'skill', 'seed', 'given', 'correct', 'hints_used', 'created_at'],
    what: {
      es: 'Cada respuesta: la habilidad, la semilla del ejercicio (para regenerarlo), el número respondido, si era correcto, cuántas pistas se usaron y la fecha.',
      ca: 'Cada resposta: l’habilitat, la llavor de l’exercici (per regenerar-lo), el número respost, si era correcte, quantes pistes es van fer servir i la data.',
    },
    purpose: {
      es: 'Comprobar en el servidor que las respuestas son reales y detectar en qué se atasca cada niño.',
      ca: 'Comprovar al servidor que les respostes són reals i detectar en què s’encalla cada infant.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'families',
    columns: ['id', 'owner_id', 'created_at'],
    what: {
      es: 'Una familia: su identificador, el identificador del adulto que la lleva y la fecha de creación.',
      ca: 'Una família: el seu identificador, l’identificador de l’adult que la porta i la data de creació.',
    },
    purpose: {
      es: 'Que el adulto vea el progreso de sus hijos y los recupere en otro aparato.',
      ca: 'Que l’adult vegi el progrés dels seus fills i el recuperi en un altre aparell.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'family_children',
    columns: ['child_id', 'family_id', 'joined_at'],
    what: {
      es: 'Qué niños (hasta 4) pertenecen a cada familia y desde cuándo.',
      ca: 'Quins infants (fins a 4) pertanyen a cada família i des de quan.',
    },
    purpose: {
      es: 'Saber qué progreso puede ver cada adulto.',
      ca: 'Saber quin progrés pot veure cada adult.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'link_codes',
    columns: ['code_hash', 'child_id', 'created_at', 'expires_at'],
    what: {
      es: 'Un código de un solo uso que el niño enseña al adulto para unirse a la familia. Solo se guarda su huella (hash) y caduca a los 10 minutos.',
      ca: 'Un codi d’un sol ús que l’infant ensenya a l’adult per unir-se a la família. Només es guarda la seva empremta (hash) i caduca als 10 minuts.',
    },
    purpose: {
      es: 'Unir al niño a la familia de un adulto sin escribir ningún dato personal.',
      ca: 'Unir l’infant a la família d’un adult sense escriure cap dada personal.',
    },
    retention: {
      es: '10 minutos, o hasta que se use.',
      ca: '10 minuts, o fins que s’utilitzi.',
    },
  },
];

export interface Subprocessor {
  name: string;
  role: Localized;
  location: Localized;
  /** `true` si todavía no se usa (no hay cuentas de familia). */
  future: boolean;
  /** Nota extra, p. ej. «cuando existan cuentas de familia». */
  note?: Localized;
}

export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    name: 'Supabase',
    role: { es: 'Base de datos y acceso anónimo', ca: 'Base de dades i accés anònim' },
    location: { es: 'Frankfurt (Alemania, UE)', ca: 'Frankfurt (Alemanya, UE)' },
    future: false,
  },
  {
    name: 'Cloudflare',
    role: { es: 'Alojamiento de la web del juego (Cloudflare Pages)', ca: 'Allotjament del web del joc (Cloudflare Pages)' },
    location: { es: 'Red mundial de Cloudflare (solo entrega los ficheros del juego; no guarda el progreso)', ca: 'Xarxa mundial de Cloudflare (només lliura els fitxers del joc; no guarda el progrés)' },
    future: false,
  },
  {
    name: 'Brevo',
    role: { es: 'Envío de correos a las familias', ca: 'Enviament de correus a les famílies' },
    location: { es: 'Francia (UE)', ca: 'França (UE)' },
    future: false,
    note: { es: 'Solo envía el enlace de acceso al correo del adulto de una cuenta de familia.', ca: 'Només envia l’enllaç d’accés al correu de l’adult d’un compte de família.' },
  },
];

export interface LegalSection {
  id: string;
  heading: Localized;
  /** Párrafos de texto. Las tablas se pintan aparte a partir de `SERVER_DATA` y `SUBPROCESSORS`. */
  paragraphs: readonly Localized[];
  /** Qué tabla va tras los párrafos, si hay alguna. */
  table?: 'data' | 'subprocessors';
}

/** Política completa, en lenguaje claro para las familias. */
export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: 'who',
    heading: { es: '1. Quién es el responsable', ca: '1. Qui n’és el responsable' },
    paragraphs: [
      {
        es: `Kalku es un juego de matemáticas para niños de 6 a 12 años. El responsable del tratamiento de los datos es ${PENDING.controllerName.es}, con ${PENDING.controllerTaxId.es}, domicilio en ${PENDING.controllerAddress.es}.`,
        ca: `Kalku és un joc de matemàtiques per a infants de 6 a 12 anys. El responsable del tractament de les dades és ${PENDING.controllerName.ca}, amb ${PENDING.controllerTaxId.ca}, domicili a ${PENDING.controllerAddress.ca}.`,
      },
      {
        es: `Para cualquier duda o para ejercer tus derechos, escribe a ${PENDING.controllerEmail.es}.`,
        ca: `Per a qualsevol dubte o per exercir els teus drets, escriu a ${PENDING.controllerEmail.ca}.`,
      },
    ],
  },
  {
    id: 'principles',
    heading: { es: '2. Nuestra norma: lo mínimo', ca: '2. La nostra norma: el mínim' },
    paragraphs: [
      {
        es: 'No pedimos el nombre real, el correo, la ubicación ni ningún dato personal del niño. No hay anuncios, ni analítica de terceros, ni seguimiento. Los datos no se venden ni se ceden para publicidad.',
        ca: 'No demanem el nom real, el correu, la ubicació ni cap dada personal de l’infant. No hi ha anuncis, ni analítica de tercers, ni seguiment. Les dades no es venen ni se cedeixen per a publicitat.',
      },
    ],
  },
  {
    id: 'data',
    heading: { es: '3. Qué datos guardamos y para qué', ca: '3. Quines dades guardem i per què' },
    paragraphs: [
      {
        es: 'Esto es todo lo que guarda nuestro servidor. Una parte del progreso también se guarda en el propio dispositivo, para poder jugar sin conexión.',
        ca: 'Això és tot el que guarda el nostre servidor. Una part del progrés també es guarda al mateix dispositiu, per poder jugar sense connexió.',
      },
    ],
    table: 'data',
  },
  {
    id: 'legal-basis',
    heading: { es: '4. Por qué podemos usar estos datos', ca: '4. Per què podem fer servir aquestes dades' },
    paragraphs: [
      {
        es: 'En casa, con el consentimiento de los padres o tutores (los menores de 14 años no pueden darlo por sí mismos). En clase, el centro educativo actúa como responsable y nosotros como encargados del tratamiento, según el contrato del artículo 28 del RGPD.',
        ca: 'A casa, amb el consentiment dels pares o tutors (els menors de 14 anys no el poden donar per si mateixos). A classe, el centre educatiu actua com a responsable i nosaltres com a encarregats del tractament, segons el contracte de l’article 28 del RGPD.',
      },
    ],
  },
  {
    id: 'where',
    heading: { es: '5. Dónde están los datos', ca: '5. On són les dades' },
    paragraphs: [
      {
        es: 'En la Unión Europea. Estos son los proveedores que intervienen (subencargados):',
        ca: 'A la Unió Europea. Aquests són els proveïdors que hi intervenen (subencarregats):',
      },
    ],
    table: 'subprocessors',
  },
  {
    id: 'retention',
    heading: { es: '6. Cuánto tiempo los guardamos', ca: '6. Quant de temps les guardem' },
    paragraphs: [
      {
        es: 'La cuenta del niño se borra tras 12 meses sin jugar y siempre que la familia o el centro lo pidan. Los datos de un centro se borran al terminar el contrato con él.',
        ca: 'El compte de l’infant s’esborra després de 12 mesos sense jugar i sempre que la família o el centre ho demanin. Les dades d’un centre s’esborren en acabar el contracte amb ell.',
      },
    ],
  },
  {
    id: 'rights',
    heading: { es: '7. Tus derechos', ca: '7. Els teus drets' },
    paragraphs: [
      {
        es: 'Puedes pedir acceder a los datos, corregirlos, borrarlos, limitar su uso, llevártelos o oponerte, y retirar tu consentimiento cuando quieras. Desde el juego, en Ajustes → Para adultos, puedes descargar los datos del niño y borrarlos. Para lo demás (o si no tienes el aparato del niño), escríbenos al correo de arriba. Si crees que no tratamos bien los datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
        ca: 'Pots demanar accedir a les dades, corregir-les, esborrar-les, limitar-ne l’ús, endur-te-les o oposar-t’hi, i retirar el consentiment quan vulguis. Des del joc, a Ajustos → Per a adults, pots descarregar les dades de l’infant i esborrar-les. Per a la resta (o si no tens l’aparell de l’infant), escriu-nos al correu de dalt. Si creus que no tractem bé les dades, pots reclamar davant l’Agència Espanyola de Protecció de Dades (aepd.es).',
      },
    ],
  },
  {
    id: 'future',
    heading: { es: '8. Lo que todavía no existe', ca: '8. El que encara no existeix' },
    paragraphs: [
      {
        es: 'Del niño no guardamos nunca ningún correo electrónico. Solo si un adulto crea una cuenta de familia guardamos su correo, únicamente en el sistema de acceso, para enviarle el enlace con el que entra (con Brevo). Los informes y avisos por correo todavía no existen; antes de enviarlos avisaremos y actualizaremos esta política.',
        ca: 'De l’infant no guardem mai cap correu electrònic. Només si un adult crea un compte de família guardem el seu correu, únicament al sistema d’accés, per enviar-li l’enllaç amb què entra (amb Brevo). Els informes i avisos per correu encara no existeixen; abans d’enviar-los avisarem i actualitzarem aquesta política.',
      },
    ],
  },
];

/** Versión corta para niños: frases cortas y sin palabras difíciles. */
export const KIDS_TITLE: Localized = { es: 'Para ti, explorador', ca: 'Per a tu, explorador' };

export const KIDS_SUMMARY: readonly Localized[] = [
  { es: 'Kalku solo guarda tu apodo y cómo vas en el juego y con las mates.', ca: 'Kalku només guarda el teu malnom i com vas al joc i amb les mates.' },
  { es: 'No te pedimos tu nombre de verdad. Usa un apodo.', ca: 'No et demanem el teu nom de veritat. Fes servir un malnom.' },
  { es: 'No hay anuncios y no vendemos nada de lo tuyo.', ca: 'No hi ha anuncis i no venem res del que és teu.' },
  { es: 'Si te equivocas, no pasa nada: no pierdes nada.', ca: 'Si t’equivoques, no passa res: no perds res.' },
  { es: 'Tus padres o tu profe pueden pedir que borremos todo.', ca: 'Els teus pares o el teu profe poden demanar que ho esborrem tot.' },
];

export const PAGE_TEXT = {
  title: { es: 'Política de privacidad', ca: 'Política de privacitat' },
  version: { es: 'Versión', ca: 'Versió' },
  back: { es: 'Volver al juego', ca: 'Tornar al joc' },
  language: { es: 'Idioma', ca: 'Idioma' },
  tableWhat: { es: 'Qué se guarda', ca: 'Què es guarda' },
  tablePurpose: { es: 'Para qué', ca: 'Per què' },
  tableRetention: { es: 'Cuánto tiempo', ca: 'Quant de temps' },
  subName: { es: 'Proveedor', ca: 'Proveïdor' },
  subRole: { es: 'Qué hace', ca: 'Què fa' },
  subLocation: { es: 'Dónde', ca: 'On' },
} as const satisfies Record<string, Localized>;
