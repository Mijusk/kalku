import { dateKey, dayTimeFor, madridHour, weatherFor, type DayTime, type Weather } from '@kalku/content';

/** Claves del tiempo y la hora forzados desde el panel de desarrollo (solo existen con __DEV_TOOLS__). */
export const DEV_WEATHER_KEY = 'kalku:dev-tiempo';
export const DEV_DAYTIME_KEY = 'kalku:dev-hora';

function forced(key: string): string | null {
  if (!__DEV_TOOLS__) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** El tiempo de hoy en la región (o el que fuerce el panel DEV en local y vistas previas). */
export function currentWeather(regionId: string, now: Date = new Date()): Weather {
  return (forced(DEV_WEATHER_KEY) as Weather | null) ?? weatherFor(regionId, dateKey(now));
}

/** El momento del día en Madrid (o el que fuerce el panel DEV). */
export function currentDayTime(now: Date = new Date()): DayTime {
  return (forced(DEV_DAYTIME_KEY) as DayTime | null) ?? dayTimeFor(madridHour(now));
}
