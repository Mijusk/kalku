import { describe, expect, it } from 'vitest';
import { buildClassProgress, type DayRow, type MasteryRow } from '@kalku/content';
import type { ClassProgressBackend } from '../src/classProgress';

/** Servidor falso: solo devuelve la clase pedida, como hace la base con RLS. */
function fakeBackend(): ClassProgressBackend {
  const mastery: Record<string, MasteryRow[]> = {
    c1: [
      { studentId: 's1', nickname: 'Zoe', skill: 'add-within-10', mastery: 85, attempts: 20, correct: 17 },
      { studentId: 's2', nickname: 'Ana', skill: null, mastery: null, attempts: null, correct: null },
    ],
  };
  const days: Record<string, DayRow[]> = { c1: [{ studentId: 's1', day: '2026-11-25', attempts: 5, correct: 3 }] };
  return {
    async mastery(classId) {
      return mastery[classId] ?? [];
    },
    async days(classId) {
      return days[classId] ?? [];
    },
  };
}

describe('dominio de la clase con el servidor falso', () => {
  it('une dominio y días de los alumnos de la clase, por apodo', async () => {
    const b = fakeBackend();
    const out = buildClassProgress(await b.mastery('c1'), await b.days('c1'), 'ca');
    expect(out.map((s) => s.nickname)).toEqual(['Ana', 'Zoe']);
    expect(out[1]?.cells.get('add-within-10')?.mastery).toBe(85);
    expect(out[1]?.days).toHaveLength(1);
  });

  it('una clase ajena no devuelve nada', async () => {
    const b = fakeBackend();
    expect(buildClassProgress(await b.mastery('otra'), await b.days('otra'), 'es')).toEqual([]);
  });
});
