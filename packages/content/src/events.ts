import type { Localized } from '@kalku/exercises';
import { CREATURES, type CreatureId } from './creatures.js';

/**
 * Eventos de temporada (docs/JUEGO-SIN-FIN.md §3, #101): fechas del curso
 * escolar con una criatura invitada y una misión propia. Son datos: añadir
 * uno es añadir una entrada aquí (y su invitada en `creatures.ts`).
 *
 * Fuera de sus fechas no existen: ni la invitada sale en el mapa ni su misión
 * en la lista. No dan ninguna ventaja en el combate (regla 1).
 */
export interface SeasonalEvent {
  id: string;
  name: Localized;
  /** Lo que se dice al entrar en el mapa durante el evento. */
  greeting: Localized;
  /** Primer y último día, `MM-DD`. Si `to` es antes que `from`, cruza el año (Navidad). */
  from: string;
  to: string;
  /** La criatura invitada (con `guest` = este id). */
  guest: CreatureId;
  /** Misión del día del evento: devolver la chispa a la invitada `need` veces. */
  mission: { need: number; text: Localized };
}

const t = (es: string, ca: string): Localized => ({ es, ca });

export const EVENTS: readonly SeasonalEvent[] = [
  {
    id: 'castanyada',
    name: t('Castañada', 'Castanyada'),
    greeting: t('¡Huele a castañas asadas! Hay una criatura invitada en la hierba.', 'Fa olor de castanyes torrades! Hi ha una criatura convidada a l’herba.'),
    from: '10-25',
    to: '11-05',
    guest: 'problemus-castana',
    mission: { need: 2, text: t('Castañada: devuelve la chispa a {n} Castañas', 'Castanyada: torna l’espurna a {n} Castanyes') },
  },
  {
    id: 'navidad',
    name: t('Navidad', 'Nadal'),
    greeting: t('¡Ha nevado en el mapa! Copito ha venido de visita.', 'Ha nevat al mapa! En Floquet ha vingut de visita.'),
    from: '12-15',
    to: '01-07',
    guest: 'problemus-copito',
    mission: { need: 2, text: t('Navidad: devuelve la chispa a {n} Copitos', 'Nadal: torna l’espurna a {n} Floquets') },
  },
  {
    id: 'sant-jordi',
    name: t('Sant Jordi', 'Sant Jordi'),
    greeting: t('¡Día de libros y rosas! Roseta pasea por la hierba.', 'Dia de llibres i roses! La Roseta passeja per l’herba.'),
    from: '04-20',
    to: '04-26',
    guest: 'problemus-roseta',
    mission: { need: 2, text: t('Sant Jordi: devuelve la chispa a {n} Rosetas', 'Sant Jordi: torna l’espurna a {n} Rosetes') },
  },
  {
    id: 'fin-de-curso',
    name: t('Fin de curso', 'Final de curs'),
    greeting: t('¡Se acaba el curso! Solete ha salido a celebrarlo.', 'S’acaba el curs! En Solet ha sortit a celebrar-ho.'),
    from: '06-15',
    to: '06-30',
    guest: 'problemus-solete',
    mission: { need: 2, text: t('Fin de curso: devuelve la chispa a {n} Soletes', 'Final de curs: torna l’espurna a {n} Solets') },
  },
];

/** Fracción de las criaturas del mapa que son la invitada mientras dura el evento. */
export const GUEST_CHANCE = 0.2;

/** Si `day` (AAAA-MM-DD) cae dentro de las fechas del evento. */
export function eventActiveOn(event: SeasonalEvent, day: string): boolean {
  const md = day.slice(5, 10);
  return event.from <= event.to ? md >= event.from && md <= event.to : md >= event.from || md <= event.to;
}

/** El evento de ese día (AAAA-MM-DD), o undefined si no hay ninguno. */
export function activeEvent(day: string, events: readonly SeasonalEvent[] = EVENTS): SeasonalEvent | undefined {
  return events.find((e) => eventActiveOn(e, day));
}

export function getEvent(id: string): SeasonalEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Comprueba los eventos: fechas bien escritas, sin solaparse, invitada propia y textos es/ca. */
export function validateEvents(events: readonly SeasonalEvent[] = EVENTS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) errors.push(`${e.id}: id repetido`);
    ids.add(e.id);
    if (!MONTH_DAY.test(e.from) || !MONTH_DAY.test(e.to)) errors.push(`${e.id}: las fechas van como MM-DD`);
    const guest = CREATURES.find((c) => c.id === e.guest);
    if (!guest) errors.push(`${e.id}: la invitada «${e.guest}» no existe`);
    else if (guest.guest !== e.id) errors.push(`${e.id}: «${e.guest}» no es la invitada de este evento`);
    for (const text of [e.name, e.greeting, e.mission.text]) {
      if (!text.es.trim() || !text.ca.trim()) errors.push(`${e.id}: falta un texto en es o ca`);
    }
    if (!e.mission.text.es.includes('{n}') || !e.mission.text.ca.includes('{n}')) errors.push(`${e.id}: la misión lleva {n}`);
    if (!Number.isInteger(e.mission.need) || e.mission.need < 1) errors.push(`${e.id}: la misión pide al menos 1`);
  }
  // Dos eventos a la vez no: se recorre un año bisiesto entero.
  for (let d = new Date(Date.UTC(2028, 0, 1)); d.getUTCFullYear() === 2028; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const on = events.filter((e) => eventActiveOn(e, day));
    if (on.length > 1) errors.push(`${day}: coinciden ${on.map((e) => e.id).join(' y ')}`);
  }
  for (const c of CREATURES) {
    if (c.guest !== undefined && !events.some((e) => e.id === c.guest && e.guest === c.id)) errors.push(`${c.id}: es invitada de un evento que no la invita`);
  }
  return errors;
}
