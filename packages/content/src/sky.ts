import { createRng } from '@kalku/exercises';
import { textSeed } from './missions.js';

/**
 * Cielo del mapa (27 nov 2026): el tiempo del día y la luz según la hora.
 * Solo se ve; no cambia los encuentros, los ejercicios ni nada del juego.
 * El tiempo es el mismo para todos el mismo día en la misma región (como el
 * cofre sorpresa), para que en clase todos vean lo mismo y lo comenten.
 */
export type Weather = 'sun' | 'clouds' | 'rain' | 'snow' | 'leaves' | 'petals';
export const WEATHERS: readonly Weather[] = ['sun', 'clouds', 'rain', 'snow', 'leaves', 'petals'];

export type DayTime = 'dawn' | 'day' | 'dusk' | 'night';
export const DAY_TIMES: readonly DayTime[] = ['dawn', 'day', 'dusk', 'night'];

/** Probabilidades (en %) por estación: invierno, primavera, verano y otoño. Siempre suman 100. */
export const WEATHER_ODDS: Readonly<Record<'winter' | 'spring' | 'summer' | 'autumn', Readonly<Partial<Record<Weather, number>>>>> = {
  winter: { sun: 45, clouds: 25, snow: 20, rain: 10 },
  spring: { sun: 50, petals: 20, clouds: 15, rain: 15 },
  summer: { sun: 80, clouds: 15, rain: 5 },
  autumn: { sun: 45, leaves: 25, clouds: 15, rain: 15 },
};

function season(day: string): keyof typeof WEATHER_ODDS {
  const month = Number(day.slice(5, 7));
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/** El tiempo que hace hoy (`day` = AAAA-MM-DD, Madrid) en una región. */
export function weatherFor(regionId: string, day: string): Weather {
  const odds = WEATHER_ODDS[season(day)];
  const roll = createRng(textSeed(`tiempo:${regionId}:${day}`)).next() * 100;
  let sum = 0;
  for (const w of WEATHERS) {
    sum += odds[w] ?? 0;
    if (roll < sum) return w;
  }
  return 'sun';
}

/** Hora de Madrid (0–23). */
export function madridHour(now: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(now);
  return Number(hour) % 24;
}

/** Momento del día: amanecer (7–8), día (9–17), atardecer (18–19) y noche. */
export function dayTimeFor(hour: number): DayTime {
  if (hour >= 7 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

/**
 * Luz del momento: un velo de color encima del mapa. Suave a propósito: de
 * noche se sigue viendo todo bien (letra y criaturas claras siempre).
 */
export const DAY_LIGHT: Readonly<Record<DayTime, { readonly color: number; readonly alpha: number }>> = {
  dawn: { color: 0xffb37a, alpha: 0.16 },
  day: { color: 0xffffff, alpha: 0 },
  dusk: { color: 0xff7a45, alpha: 0.24 },
  night: { color: 0x1b2a6b, alpha: 0.4 },
};
