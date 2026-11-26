import { describe, expect, it } from 'vitest';
import { advanceMissions, dateKey, MISSION_TEMPLATES, missionsFor, missionText, parseMissions, refreshMissions, weekKey } from '../src/missions.js';

describe('misiones del día y de la semana', () => {
  it('misma fecha y misma clase = mismas misiones; otra clase u otro día, otras', () => {
    expect(missionsFor('2026-12-01', 'clase-a')).toEqual(missionsFor('2026-12-01', 'clase-a'));
    const days = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(missionsFor(`2026-12-${String(i + 1).padStart(2, '0')}`))));
    expect(days.size).toBeGreaterThan(10);
  });

  it('3 del día distintas y 1 de la semana igual toda la semana', () => {
    for (let d = 1; d <= 28; d++) {
      const day = `2027-02-${String(d).padStart(2, '0')}`;
      const ms = missionsFor(day);
      expect(ms.filter((m) => !m.weekly)).toHaveLength(3);
      expect(new Set(ms.filter((m) => !m.weekly).map((m) => m.kind)).size).toBe(3);
      expect(ms.filter((m) => m.weekly)).toHaveLength(1);
    }
    const mon = missionsFor('2027-02-01').find((m) => m.weekly);
    const sun = missionsFor('2027-02-07').find((m) => m.weekly);
    expect(mon).toEqual(sun);
  });

  it('la semana empieza en lunes y el día es el de Madrid', () => {
    expect(weekKey('2026-11-26')).toBe('2026-11-23');
    expect(weekKey('2026-11-23')).toBe('2026-11-23');
    expect(weekKey('2026-11-29')).toBe('2026-11-23');
    // 23:30 UTC del 31 de diciembre ya es 1 de enero en Madrid.
    expect(dateKey(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });

  it('fallar no cuenta ni resta; el premio se da una sola vez', () => {
    const missions = [{ id: 'd:answers', kind: 'answers' as const, need: 2, reward: 19, weekly: false }];
    let state = refreshMissions(null, '2026-12-01');
    const wrong = advanceMissions(state, missions, { type: 'answer', correct: false, operator: '+', strong: false });
    expect(wrong.state.progress).toEqual({});
    state = advanceMissions(state, missions, { type: 'answer', correct: true, operator: '+', strong: false }).state;
    const end = advanceMissions(state, missions, { type: 'answer', correct: true, operator: '-', strong: false });
    expect(end.completed).toHaveLength(1);
    const again = advanceMissions(end.state, missions, { type: 'answer', correct: true, operator: '-', strong: false });
    expect(again.completed).toHaveLength(0);
  });

  it('ninguna misión depende del tiempo: los eventos no lo llevan', () => {
    // Si algún día se añade tiempo a MissionEvent, este test obliga a revisarlo.
    for (const template of MISSION_TEMPLATES) expect(template.text.es).not.toMatch(/rápid|segund|tiempo/i);
  });

  it('cambiar de día no quita los premios de la semana', () => {
    const state = { day: '2026-12-01', week: '2026-11-30', progress: { '2026-12-01:answers': 3, '2026-11-30:battles:semana': 4 }, claimed: ['2026-12-01:answers'] };
    const next = refreshMissions(state, '2026-12-02');
    expect(next.progress).toEqual({ '2026-11-30:battles:semana': 4 });
    expect(next.claimed).toEqual([]);
  });

  it('textos con la cantidad y guardado sin fiarse', () => {
    const m = missionsFor('2026-12-01')[0];
    if (!m) throw new Error('sin misiones');
    expect(missionText(m, 'ca')).toContain(String(m.need));
    expect(parseMissions({ day: 'ayer' })).toBeNull();
    expect(parseMissions({ day: '2026-12-01', week: '2026-11-30', progress: { a: 2, b: -1, c: 'x' }, claimed: ['a', 3] })).toEqual({
      day: '2026-12-01', week: '2026-11-30', progress: { a: 2 }, claimed: ['a'],
    });
  });
});
