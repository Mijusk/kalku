import { describe, expect, it } from 'vitest';
import { SKILLS } from '@kalku/exercises';
import {
  FLAG_DAYS,
  FLAG_MIN_ANSWERS,
  MASTERY_LEVELS,
  buildClassProgress,
  cellLabel,
  classSkills,
  isFlagged,
  masteryLevel,
  skillsInProgress,
  type DayRow,
  type MasteryRow,
} from '../src/index.js';

const day = (d: number, attempts: number, correct: number, studentId = 's1'): DayRow => ({ studentId, day: `2026-11-${String(d).padStart(2, '0')}`, attempts, correct });

describe('masteryLevel', () => {
  it('reparte los tramos 0–39, 40–69, 70–89 y 90–100', () => {
    expect(masteryLevel(0).id).toBe('starting');
    expect(masteryLevel(39).id).toBe('starting');
    expect(masteryLevel(40).id).toBe('progressing');
    expect(masteryLevel(69).id).toBe('progressing');
    expect(masteryLevel(70).id).toBe('good');
    expect(masteryLevel(89).id).toBe('good');
    expect(masteryLevel(90).id).toBe('mastered');
    expect(masteryLevel(100).id).toBe('mastered');
  });

  it('sin dominio es «sin empezar»', () => {
    expect(masteryLevel(null).id).toBe('none');
  });

  it('es monótono: más dominio nunca da un tramo peor', () => {
    const order = MASTERY_LEVELS.map((l) => l.id);
    let last = -1;
    for (let m = 0; m <= 100; m++) {
      const i = order.indexOf(masteryLevel(m).id as never);
      expect(i).toBeGreaterThanOrEqual(last);
      last = i;
    }
  });

  it('cada tramo tiene icono distinto y nombre es/ca', () => {
    expect(new Set(MASTERY_LEVELS.map((l) => l.icon)).size).toBe(MASTERY_LEVELS.length);
    for (const l of MASTERY_LEVELS) {
      expect(l.name.es.length).toBeGreaterThan(0);
      expect(l.name.ca.length).toBeGreaterThan(0);
    }
  });

  it('la etiqueta lleva el número además del tramo', () => {
    expect(cellLabel(72.4, 'es')).toContain('72');
    expect(cellLabel(72.4, 'es')).toContain('Bien');
    expect(cellLabel(72.4, 'ca')).toContain('Bé');
    expect(cellLabel(null, 'es')).toContain('Sin empezar');
  });
});

describe('isFlagged', () => {
  it('marca 3 días seguidos con actividad por debajo del 70 %', () => {
    expect(isFlagged([day(1, 10, 6), day(2, 10, 5), day(3, 10, 6)])).toBe(true);
  });

  it('no marca si un día está en el 70 % o más', () => {
    expect(isFlagged([day(1, 10, 6), day(2, 10, 7), day(3, 10, 6)])).toBe(false);
  });

  it('un día sin jugar no cuenta ni rompe la racha', () => {
    expect(isFlagged([day(1, 10, 3), day(5, 10, 3), day(12, 10, 3)])).toBe(true);
  });

  it('un día con pocas respuestas no cuenta ni rompe la racha', () => {
    expect(isFlagged([day(1, 10, 3), day(2, FLAG_MIN_ANSWERS - 1, 0), day(3, 10, 3), day(4, 10, 3)])).toBe(true);
    expect(isFlagged([day(1, FLAG_MIN_ANSWERS - 1, 0), day(2, FLAG_MIN_ANSWERS - 1, 0), day(3, FLAG_MIN_ANSWERS - 1, 0)])).toBe(false);
  });

  it('con menos días que el mínimo no marca', () => {
    expect(FLAG_DAYS).toBe(3);
    expect(isFlagged([day(1, 10, 1), day(2, 10, 1)])).toBe(false);
  });

  it('mira solo los últimos días: si ya remontó, no marca', () => {
    expect(isFlagged([day(1, 10, 2), day(2, 10, 2), day(3, 10, 2), day(4, 10, 9)])).toBe(false);
  });
});

describe('buildClassProgress', () => {
  const m = (studentId: string, nickname: string, skill: MasteryRow['skill'], mastery: number | null): MasteryRow => ({
    studentId,
    nickname,
    skill,
    mastery,
    attempts: mastery === null ? null : 10,
    correct: mastery === null ? null : 8,
  });

  const rows: MasteryRow[] = [
    m('s2', 'Zoe', 'add-within-10', 95),
    m('s2', 'Zoe', 'sub-within-10', 20),
    m('s1', 'Ana', 'add-within-10', 10),
    m('s3', 'Leo', null, null),
  ];

  it('ordena por apodo, nunca por dominio', () => {
    expect(buildClassProgress(rows, [], 'es').map((s) => s.nickname)).toEqual(['Ana', 'Leo', 'Zoe']);
  });

  it('el alumno sin progreso no desaparece', () => {
    const leo = buildClassProgress(rows, [], 'es').find((s) => s.nickname === 'Leo');
    expect(leo?.cells.size).toBe(0);
  });

  it('une los días de cada alumno, del más reciente al más antiguo, y marca', () => {
    const days = [day(1, 10, 3, 's1'), day(3, 10, 3, 's1'), day(2, 10, 3, 's1'), day(1, 10, 9, 's2')];
    const out = buildClassProgress(rows, days, 'es');
    const ana = out.find((s) => s.studentId === 's1');
    expect(ana?.days.map((d) => d.day)).toEqual(['2026-11-03', '2026-11-02', '2026-11-01']);
    expect(ana?.flagged).toBe(true);
    expect(out.find((s) => s.studentId === 's2')?.flagged).toBe(false);
  });

  it('las columnas van en orden de currículo y solo las que se han tocado', () => {
    const out = buildClassProgress(rows, [], 'es');
    expect(classSkills(out)).toEqual(['add-within-10', 'sub-within-10']);
    const order = SKILLS.map((s) => s.id);
    expect(order.indexOf('add-within-10')).toBeLessThan(order.indexOf('sub-within-10'));
  });

  it('las habilidades en curso excluyen las dominadas', () => {
    const zoe = buildClassProgress(rows, [], 'es').find((s) => s.nickname === 'Zoe');
    expect(zoe && skillsInProgress(zoe).map((c) => c.skill)).toEqual(['sub-within-10']);
  });
});
