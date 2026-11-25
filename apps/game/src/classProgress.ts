import type { SupabaseClient } from '@supabase/supabase-js';
import { SKILL_IDS, type SkillId } from '@kalku/exercises';
import type { DayRow, MasteryRow } from '@kalku/content';
import { getAdultSupabase } from './supabase';
import { toTeacherError } from './teacher';

/** Dominio de la clase (#55): el docente lee totales del servidor, nunca respuestas sueltas. */
export interface ClassProgressBackend {
  mastery(classId: string): Promise<MasteryRow[]>;
  days(classId: string): Promise<DayRow[]>;
}

function asSkill(v: unknown): SkillId | null {
  return typeof v === 'string' && (SKILL_IDS as readonly string[]).includes(v) ? (v as SkillId) : null;
}

export function supabaseClassProgressBackend(adult: SupabaseClient): ClassProgressBackend {
  return {
    async mastery(classId) {
      const { data, error } = await adult.rpc('class_mastery', { p_class: classId });
      if (error) throw toTeacherError(error);
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        studentId: String(r.student_id),
        nickname: String(r.nickname),
        skill: asSkill(r.skill),
        mastery: r.mastery === null || r.mastery === undefined ? null : Number(r.mastery),
        attempts: r.attempts === null || r.attempts === undefined ? null : Number(r.attempts),
        correct: r.correct === null || r.correct === undefined ? null : Number(r.correct),
      }));
    },
    async days(classId) {
      const { data, error } = await adult.rpc('class_student_days', { p_class: classId });
      if (error) throw toTeacherError(error);
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        studentId: String(r.student_id),
        day: String(r.day),
        attempts: Number(r.attempts),
        correct: Number(r.correct),
      }));
    },
  };
}

let cached: ClassProgressBackend | null | undefined;

export function appClassProgressBackend(): ClassProgressBackend | null {
  if (cached === undefined) {
    const adult = getAdultSupabase();
    cached = adult ? supabaseClassProgressBackend(adult) : null;
  }
  return cached;
}
