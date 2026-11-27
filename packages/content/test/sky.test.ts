import { describe, expect, it } from 'vitest';
import { dayTimeFor, madridHour, WEATHER_ODDS, weatherFor, WEATHERS } from '../src/index.js';

const days = (year: number, month: number): string[] =>
  Array.from({ length: 28 }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);

describe('tiempo del día', () => {
  it('las probabilidades de cada estación suman 100', () => {
    for (const odds of Object.values(WEATHER_ODDS)) {
      expect(Object.values(odds).reduce((a, b) => a + (b ?? 0), 0)).toBe(100);
    }
  });

  it('es el mismo para todos el mismo día y región', () => {
    expect(weatherFor('pradera-uno', '2026-11-27')).toBe(weatherFor('pradera-uno', '2026-11-27'));
  });

  it('no nieva en verano ni caen hojas en primavera', () => {
    for (let y = 2026; y < 2030; y++) {
      for (const d of [...days(y, 6), ...days(y, 7), ...days(y, 8)]) expect(weatherFor('pradera-uno', d)).not.toBe('snow');
      for (const d of [...days(y, 3), ...days(y, 4)]) expect(weatherFor('bosque-decenas', d)).not.toBe('leaves');
    }
  });

  it('cambia de un día a otro (hace sol la mayoría de los días, pero no siempre)', () => {
    const autumn = [...days(2026, 10), ...days(2026, 11)].map((d) => weatherFor('pradera-uno', d));
    expect(new Set(autumn).size).toBeGreaterThan(2);
    expect(autumn.filter((w) => w === 'sun').length).toBeGreaterThan(autumn.length / 4);
    for (const w of autumn) expect(WEATHERS).toContain(w);
  });
});

describe('momento del día', () => {
  it('va de la noche al amanecer, el día y el atardecer', () => {
    expect(dayTimeFor(3)).toBe('night');
    expect(dayTimeFor(7)).toBe('dawn');
    expect(dayTimeFor(12)).toBe('day');
    expect(dayTimeFor(18)).toBe('dusk');
    expect(dayTimeFor(21)).toBe('night');
  });

  it('usa la hora de Madrid', () => {
    // 27 nov 2026, 11:00 UTC = 12:00 en Madrid (horario de invierno).
    expect(madridHour(new Date('2026-11-27T11:00:00Z'))).toBe(12);
    // 15 jul, 23:30 UTC = 01:30 en Madrid (horario de verano).
    expect(madridHour(new Date('2026-07-15T23:30:00Z'))).toBe(1);
  });
});
