import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SKILL_IDS } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = join(__dirname, '../../../supabase/migrations');

/** Las habilidades que acepta la última migración que toca `progress_skill_check`. */
function dbSkills(): string[] {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  let last = '';
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    if (/progress_skill_check|create table public\.progress/.test(sql)) last = sql;
  }
  const block = last.slice(last.indexOf('progress'));
  const list = block.slice(block.indexOf('skill in ('), block.indexOf(')', block.indexOf('skill in (')));
  return [...list.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1] ?? '');
}

describe('base de datos', () => {
  it('acepta todas las habilidades del currículo (si no, una habilidad nueva no se podría guardar)', () => {
    expect(dbSkills().sort()).toEqual([...SKILL_IDS].sort());
  });
});
