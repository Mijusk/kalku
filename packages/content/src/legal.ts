import type { Locale } from '@kalku/exercises';

/**
 * Textos legales como datos (política de privacidad, versión para niños,
 * subencargados y datos que guarda el servidor). Un abogado los revisará antes
 * del piloto con niños reales.
 */

/** Versión de la política; súbela cada vez que cambie el contenido. */
export const PRIVACY_VERSION = '0.3';
export const PRIVACY_DATE = '2026-11-25';

/** Versión de la plantilla del contrato de encargo (docs/legal/) que acepta el centro al darse de alta. */
export const CONTRACT_VERSION = '0.1';

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
  es: 'Hasta que la familia o el centro pidan borrarlo, o 12 meses sin jugar. Si ningún adulto ha dado su consentimiento: 30 días sin jugar.',
  ca: 'Fins que la família o el centre demanin esborrar-ho, o 12 mesos sense jugar. Si cap adult no ha donat el consentiment: 30 dies sense jugar.',
};

export interface ServerDataItem {
  /** Tabla de Supabase. `auth.users` es el login anónimo. */
  table: 'children' | 'progress' | 'answers' | 'families' | 'family_children' | 'link_codes' | 'parental_consents' | 'schools' | 'teachers' | 'school_contracts' | 'classes' | 'class_children' | 'class_students' | 'auth.users';
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
      es: 'Niño: un identificador anónimo generado por el sistema de acceso (sin correo ni contraseña). Adulto de una cuenta de familia, de centro o de docente: su correo electrónico y un identificador. El correo se guarda solo aquí, nunca en los datos del niño.',
      ca: 'Infant: un identificador anònim generat pel sistema d’accés (sense correu ni contrasenya). Adult d’un compte de família, de centre o de docent: el seu correu electrònic i un identificador. El correu es guarda només aquí, mai a les dades de l’infant.',
    },
    purpose: {
      es: 'Niño: recuperar su progreso sin dar ningún dato personal. Adulto: entrar con un enlace enviado por correo (sin contraseña) para ver el progreso de sus hijos y recuperarlo en otro aparato.',
      ca: 'Infant: recuperar el seu progrés sense donar cap dada personal. Adult: entrar amb un enllaç enviat per correu (sense contrasenya) per veure el progrés dels seus fills i recuperar-lo en un altre aparell.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'children',
    columns: ['id', 'nickname', 'created_at', 'extra', 'last_active_at'],
    what: {
      es: 'El identificador anónimo, un apodo (de 1 a 30 letras, no debe ser el nombre real), la fecha de creación, la fecha de la última vez que jugó y el resto de la partida: monedas del juego, gemas, criaturas rescatadas, ajustes e idioma.',
      ca: 'L’identificador anònim, un malnom (d’1 a 30 lletres, no ha de ser el nom real), la data de creació, la data de l’última vegada que va jugar i la resta de la partida: monedes del joc, gemmes, criatures rescatades, ajustos i idioma.',
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
  {
    table: 'parental_consents',
    columns: ['child_id', 'adult_id', 'adult_email', 'policy_version', 'consented_at'],
    what: {
      es: 'La prueba del consentimiento de los padres: qué niño, qué adulto lo dio, el correo de ese adulto, la versión de la política que aceptó y la fecha. Es el único sitio donde se guarda un correo fuera del sistema de acceso, y nadie puede leerlo desde el juego.',
      ca: 'La prova del consentiment dels pares: quin infant, quin adult el va donar, el correu d’aquest adult, la versió de la política que va acceptar i la data. És l’únic lloc on es guarda un correu fora del sistema d’accés, i ningú no el pot llegir des del joc.',
    },
    purpose: {
      es: 'Poder demostrar que una madre, padre o tutor consintió, como exige la ley para menores de 14 años.',
      ca: 'Poder demostrar que una mare, pare o tutor va consentir, com exigeix la llei per a menors de 14 anys.',
    },
    retention: {
      es: 'Hasta que se retire el consentimiento (se borra al niño con todos sus datos), se suelte al niño de la familia o se borre la cuenta del adulto.',
      ca: 'Fins que es retiri el consentiment (s’esborra l’infant amb totes les seves dades), es deixi anar l’infant de la família o s’esborri el compte de l’adult.',
    },
  },
  {
    table: 'schools',
    columns: ['id', 'name', 'join_code_hash', 'created_at'],
    what: {
      es: 'Un centro educativo: su identificador, su nombre, la huella (hash) del código con el que se unen sus docentes y la fecha de alta. El código no se guarda en claro.',
      ca: 'Un centre educatiu: el seu identificador, el seu nom, l’empremta (hash) del codi amb què s’uneixen els seus docents i la data d’alta. El codi no es guarda en clar.',
    },
    purpose: {
      es: 'Que un colegio dé de alta a sus docentes sin intermediarios.',
      ca: 'Que una escola doni d’alta els seus docents sense intermediaris.',
    },
    retention: {
      es: 'Mientras el centro siga dado de alta. Los datos de los alumnos se rigen por el contrato de encargo de tratamiento con el centro.',
      ca: 'Mentre el centre continuï d’alta. Les dades dels alumnes es regeixen pel contracte d’encàrrec de tractament amb el centre.',
    },
  },
  {
    table: 'teachers',
    columns: ['user_id', 'school_id', 'role', 'created_at'],
    what: {
      es: 'Qué adulto es docente o director, de qué centro (si tiene) y desde cuándo. El correo del docente no se copia aquí: está solo en el sistema de acceso.',
      ca: 'Quin adult és docent o director, de quin centre (si en té) i des de quan. El correu del docent no es copia aquí: és només al sistema d’accés.',
    },
    purpose: {
      es: 'Saber qué clases puede ver cada docente y cuáles puede ver la dirección del centro.',
      ca: 'Saber quines classes pot veure cada docent i quines pot veure la direcció del centre.',
    },
    retention: {
      es: 'Hasta que el docente deje el centro o borre su cuenta.',
      ca: 'Fins que el docent deixi el centre o esborri el seu compte.',
    },
  },
  {
    table: 'school_contracts',
    columns: ['school_id', 'contract_version', 'accepted_by', 'accepted_at'],
    what: {
      es: 'La prueba de que el centro aceptó el contrato de encargo de tratamiento: qué centro, qué versión del contrato, qué adulto (solo su identificador) y la fecha.',
      ca: 'La prova que el centre va acceptar el contracte d’encàrrec de tractament: quin centre, quina versió del contracte, quin adult (només el seu identificador) i la data.',
    },
    purpose: {
      es: 'Poder demostrar que el centro encargó el tratamiento de los datos de sus alumnos, como exige el RGPD.',
      ca: 'Poder demostrar que el centre va encarregar el tractament de les dades dels seus alumnes, com exigeix el RGPD.',
    },
    retention: {
      es: 'Mientras el centro siga dado de alta y durante los plazos legales después.',
      ca: 'Mentre el centre continuï d’alta i durant els terminis legals després.',
    },
  },
  {
    table: 'classes',
    columns: ['id', 'teacher_id', 'name', 'created_at'],
    what: {
      es: 'Una clase: su identificador, el docente que la lleva, su nombre (por ejemplo «3.º A») y la fecha de creación.',
      ca: 'Una classe: el seu identificador, el docent que la porta, el seu nom (per exemple «3r A») i la data de creació.',
    },
    purpose: {
      es: 'Que el docente vea el progreso de su grupo.',
      ca: 'Que el docent vegi el progrés del seu grup.',
    },
    retention: {
      es: 'Hasta que el docente la borre o borre su cuenta.',
      ca: 'Fins que el docent l’esborri o esborri el seu compte.',
    },
  },
  {
    table: 'class_children',
    columns: ['child_id', 'class_id', 'joined_at'],
    what: {
      es: 'Qué niños (hasta 30) están en cada clase y desde cuándo. Un niño está como mucho en una clase.',
      ca: 'Quins infants (fins a 30) són a cada classe i des de quan. Un infant és com a màxim en una classe.',
    },
    purpose: {
      es: 'Saber qué progreso puede ver cada docente. Los niños de una clase no se borran a los 30 días sin consentimiento: los cubre el contrato del centro.',
      ca: 'Saber quin progrés pot veure cada docent. Els infants d’una classe no s’esborren als 30 dies sense consentiment: els cobreix el contracte del centre.',
    },
    retention: RETENTION_CHILD,
  },
  {
    table: 'class_students',
    columns: ['id', 'class_id', 'nickname', 'code_hash', 'code_hint', 'animal', 'created_at'],
    what: {
      es: 'Los alumnos de una clase que tienen tarjeta: un apodo o iniciales (el docente no escribe apellidos), una huella irreversible del código de la tarjeta, las dos primeras letras del código y el animal secreto. El código en claro no se guarda.',
      ca: 'Els alumnes d’una classe que tenen targeta: un malnom o inicials (el docent no escriu cognoms), una empremta irreversible del codi de la targeta, les dues primeres lletres del codi i l’animal secret. El codi en clar no es desa.',
    },
    purpose: {
      es: 'Que el alumno entre en su clase con la tarjeta, sin correo ni contraseña, y que el docente reparta las tarjetas sin confundirlas.',
      ca: 'Que l’alumne entri a la seva classe amb la targeta, sense correu ni contrasenya, i que el docent reparteixi les targetes sense confondre-les.',
    },
    retention: {
      es: 'Hasta que el docente quite al alumno, borre la clase o borre su cuenta.',
      ca: 'Fins que el docent tregui l’alumne, esborri la classe o esborri el seu compte.',
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
    role: { es: 'Envío de correos a las familias y a los docentes', ca: 'Enviament de correus a les famílies i als docents' },
    location: { es: 'Francia (UE)', ca: 'França (UE)' },
    future: false,
    note: { es: 'Solo envía el enlace de acceso al correo del adulto de una cuenta de familia, de centro o de docente.', ca: 'Només envia l’enllaç d’accés al correu de l’adult d’un compte de família, de centre o de docent.' },
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
        es: 'En casa, con el consentimiento de los padres o tutores (los menores de 14 años no pueden darlo por sí mismos): al unir al niño a su familia, el adulto confirma con su correo que es su madre, padre o tutor y acepta esta política; guardamos la fecha, la versión y su correo como prueba. En clase, el centro educativo actúa como responsable y nosotros como encargados del tratamiento, según el contrato del artículo 28 del RGPD.',
        ca: 'A casa, amb el consentiment dels pares o tutors (els menors de 14 anys no el poden donar per si mateixos): en unir l’infant a la seva família, l’adult confirma amb el seu correu que és la seva mare, pare o tutor i accepta aquesta política; en guardem la data, la versió i el seu correu com a prova. A classe, el centre educatiu actua com a responsable i nosaltres com a encarregats del tractament, segons el contracte de l’article 28 del RGPD.',
      },
      {
        es: 'En clase, el centro es el responsable de los datos de sus alumnos y Kalku actúa como encargado del tratamiento, según el contrato de encargo que el centro acepta al darse de alta. Un docente sin centro que crea una clase gratuita (hasta 30 alumnos) es quien responde de ella.',
        ca: 'A classe, el centre és el responsable de les dades dels seus alumnes i Kalku actua com a encarregat del tractament, segons el contracte d’encàrrec que el centre accepta en donar-se d’alta. Un docent sense centre que crea una classe gratuïta (fins a 30 alumnes) és qui en respon.',
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
        es: 'La cuenta de un niño sin consentimiento de sus padres se borra sola a los 30 días sin jugar. Con consentimiento, tras 12 meses sin jugar y siempre que la familia o el centro lo pidan. Los datos de un centro se borran al terminar el contrato con él.',
        ca: 'El compte d’un infant sense consentiment dels pares s’esborra sol als 30 dies sense jugar. Amb consentiment, després de 12 mesos sense jugar i sempre que la família o el centre ho demanin. Les dades d’un centre s’esborren en acabar el contracte amb ell.',
      },
    ],
  },
  {
    id: 'rights',
    heading: { es: '7. Tus derechos', ca: '7. Els teus drets' },
    paragraphs: [
      {
        es: 'Puedes pedir acceder a los datos, corregirlos, borrarlos, limitar su uso, llevártelos o oponerte, y retirar tu consentimiento cuando quieras. Desde el juego, en Ajustes → Para adultos, puedes descargar los datos del niño y borrarlos; en Familia, retirar tu consentimiento borra al niño con todos sus datos. Para lo demás (o si no tienes el aparato del niño), escríbenos al correo de arriba. Si crees que no tratamos bien los datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
        ca: 'Pots demanar accedir a les dades, corregir-les, esborrar-les, limitar-ne l’ús, endur-te-les o oposar-t’hi, i retirar el consentiment quan vulguis. Des del joc, a Ajustos → Per a adults, pots descarregar les dades de l’infant i esborrar-les; a Família, retirar el teu consentiment esborra l’infant amb totes les seves dades. Per a la resta (o si no tens l’aparell de l’infant), escriu-nos al correu de dalt. Si creus que no tractem bé les dades, pots reclamar davant l’Agència Espanyola de Protecció de Dades (aepd.es).',
      },
    ],
  },
  {
    id: 'future',
    heading: { es: '8. Lo que todavía no existe', ca: '8. El que encara no existeix' },
    paragraphs: [
      {
        es: 'Del niño no guardamos nunca ningún correo electrónico. Solo si un adulto crea una cuenta de familia, de centro o de docente guardamos su correo en el sistema de acceso, para enviarle el enlace con el que entra (con Brevo), y, si da su consentimiento por un niño, también como prueba de ese consentimiento. Los informes y avisos por correo todavía no existen; antes de enviarlos avisaremos y actualizaremos esta política.',
        ca: 'De l’infant no guardem mai cap correu electrònic. Només si un adult crea un compte de família, de centre o de docent guardem el seu correu al sistema d’accés, per enviar-li l’enllaç amb què entra (amb Brevo), i, si dona el seu consentiment per un infant, també com a prova d’aquest consentiment. Els informes i avisos per correu encara no existeixen; abans d’enviar-los avisarem i actualitzarem aquesta política.',
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
