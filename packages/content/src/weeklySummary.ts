import { SKILLS, type Locale, type SkillId } from '@kalku/exercises';

/**
 * Resumen semanal para las familias (#56). Todo es lógica pura: los datos los trae el servidor
 * y aquí solo se cuenta y se escribe el correo. Reglas de producto:
 * - Solo se dice lo que el niño ha hecho bien o ha practicado; nunca se enseñan fallos como castigo.
 * - El correo es texto plano: sin imágenes, sin píxeles de seguimiento y con un único enlace (la baja).
 */

/** Zona horaria con la que se cuentan los «días jugados». */
export const SUMMARY_TIME_ZONE = 'Europe/Madrid';

/** Aciertos de una habilidad en la semana a partir de los cuales se dice que «avanza». */
export const ADVANCE_MIN_CORRECT = 3;

export interface SummaryAnswer {
  skill: SkillId;
  correct: boolean;
  /** Fecha y hora ISO de la respuesta. */
  at: string;
}

export interface SummaryChildInput {
  childId: string;
  nickname: string;
  answers: SummaryAnswer[];
}

/** Ventana de la semana: `from` incluido, `to` excluido (fechas ISO). */
export interface SummaryWeek {
  from: string;
  to: string;
}

export interface ChildSummary {
  childId: string;
  nickname: string;
  daysPlayed: number;
  exercises: number;
  correct: number;
  /** Habilidades que avanzan, en orden de currículo. */
  advancing: SkillId[];
}

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: SUMMARY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Día natural (en Madrid) de un instante, como `2026-11-25`. */
export function summaryDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

/**
 * Cuenta por niño los días jugados, ejercicios, aciertos y habilidades que avanzan.
 * Solo entran las respuestas de la semana. Un niño sin respuestas sale con ceros.
 * Avanza una habilidad con al menos `ADVANCE_MIN_CORRECT` aciertos esa semana.
 */
export function buildWeeklySummary(children: readonly SummaryChildInput[], week: SummaryWeek): ChildSummary[] {
  const from = Date.parse(week.from);
  const to = Date.parse(week.to);
  return children.map((child) => {
    const days = new Set<string>();
    const correctBySkill = new Map<SkillId, number>();
    let exercises = 0;
    let correct = 0;
    for (const answer of child.answers) {
      const time = Date.parse(answer.at);
      if (!(time >= from && time < to)) continue;
      exercises += 1;
      days.add(summaryDay(answer.at));
      if (answer.correct) {
        correct += 1;
        correctBySkill.set(answer.skill, (correctBySkill.get(answer.skill) ?? 0) + 1);
      }
    }
    const advancing = SKILLS.filter((s) => (correctBySkill.get(s.id) ?? 0) >= ADVANCE_MIN_CORRECT).map((s) => s.id);
    return { childId: child.childId, nickname: child.nickname, daysPlayed: days.size, exercises, correct, advancing };
  });
}

export interface SummaryFamily {
  familyId: string;
  /** Correo del adulto, ya confirmado. */
  email: string;
  locale: Locale;
  /** Fecha de baja del resumen, o `null` si lo sigue recibiendo. */
  optOutAt: string | null;
  /** ¿Algún niño de la familia tiene consentimiento de los padres? */
  consented: boolean;
}

/** Familias a las que toca enviar: con correo, consentimiento y sin baja. */
export function selectRecipients<T extends SummaryFamily>(families: readonly T[]): T[] {
  return families.filter((f) => f.optOutAt === null && f.consented && f.email.trim() !== '');
}

export interface SummaryEmail {
  subject: string;
  /** Texto plano. */
  text: string;
}

const TEXT = {
  subject: { es: 'Cómo ha ido la semana en Kalku', ca: 'Com ha anat la setmana a Kalku' },
  hello: { es: 'Hola,', ca: 'Hola,' },
  intro: { es: 'Este es el resumen de la última semana:', ca: 'Aquest és el resum de l’última setmana:' },
  noPlay: { es: 'Esta semana no ha jugado. ¡La semana que viene será otra!', ca: 'Aquesta setmana no ha jugat. La setmana que ve serà una altra!' },
  advancing: { es: 'Avanza en', ca: 'Avança en' },
  outro: { es: 'Aprender poco a poco es la mejor manera de avanzar.', ca: 'Aprendre a poc a poc és la millor manera d’avançar.' },
  unsubscribe: { es: 'Si no quieres recibir más este resumen, date de baja con un clic:', ca: 'Si no vols rebre més aquest resum, dona’t de baixa amb un clic:' },
} satisfies Record<string, Record<Locale, string>>;

function plural(n: number, one: Record<Locale, string>, many: Record<Locale, string>, locale: Locale): string {
  return `${n} ${n === 1 ? one[locale] : many[locale]}`;
}

function childLine(child: ChildSummary, locale: Locale): string {
  if (child.exercises === 0) return `${child.nickname}: ${TEXT.noPlay[locale]}`;
  const days = plural(child.daysPlayed, { es: 'día', ca: 'dia' }, { es: 'días', ca: 'dies' }, locale);
  const exercises = plural(child.exercises, { es: 'ejercicio', ca: 'exercici' }, { es: 'ejercicios', ca: 'exercicis' }, locale);
  const correct = plural(child.correct, { es: 'acierto', ca: 'encert' }, { es: 'aciertos', ca: 'encerts' }, locale);
  const lines = [`${child.nickname}: ${days} · ${exercises} · ${correct}`];
  if (child.advancing.length > 0) {
    const names = child.advancing.map((id) => SKILLS.find((s) => s.id === id)?.name[locale] ?? id);
    lines.push(`  ${TEXT.advancing[locale]}: ${names.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Correo de texto plano en el idioma de la familia. `unsubscribeUrl` es el único enlace;
 * debe apuntar directo a nuestro dominio, sin redirecciones de seguimiento.
 */
export function renderSummaryEmail(summary: readonly ChildSummary[], locale: Locale, unsubscribeUrl: string): SummaryEmail {
  const text = [TEXT.hello[locale], '', TEXT.intro[locale], '', ...summary.map((c) => childLine(c, locale)), '', TEXT.outro[locale], '', TEXT.unsubscribe[locale], unsubscribeUrl, ''].join('\n');
  return { subject: TEXT.subject[locale], text };
}

/** Enlace de baja: el token va en el fragmento (`#`), que el navegador nunca envía a ningún servidor. */
export function unsubscribeUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/baja.html#${token}`;
}

/**
 * Cuerpo de la petición a Brevo (`/v3/smtp/email`). Solo `textContent`: sin HTML no hay píxel
 * de apertura ni enlaces que reescribir. El seguimiento de aperturas y clics de Brevo se
 * apaga además en su panel (ver docs/DECISIONS.md); la API no tiene un ajuste por correo.
 */
export function brevoRequestBody(sender: { email: string; name: string }, to: string, email: SummaryEmail): Record<string, unknown> {
  return { sender, to: [{ email: to }], subject: email.subject, textContent: email.text };
}
