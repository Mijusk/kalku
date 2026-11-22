import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DRAFT_NOTICE,
  KIDS_SUMMARY,
  LEGAL_DRAFT,
  PAGE_TEXT,
  PENDING,
  PRIVACY_DATE,
  PRIVACY_SECTIONS,
  PRIVACY_VERSION,
  SERVER_DATA,
  SUBPROCESSORS,
  type Localized,
} from '../src/legal';

const LOCALES = ['es', 'ca'] as const;
const MIGRATIONS = join(__dirname, '../../../supabase/migrations');
const CONTRACTS = join(__dirname, '../../../docs/legal');

function allLocalized(): Localized[] {
  return [
    ...PRIVACY_SECTIONS.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...KIDS_SUMMARY,
    ...SERVER_DATA.flatMap((d) => [d.what, d.purpose, d.retention]),
    ...SUBPROCESSORS.flatMap((s) => [s.role, s.location, ...(s.note ? [s.note] : [])]),
    ...Object.values(PAGE_TEXT),
    ...Object.values(PENDING),
    DRAFT_NOTICE,
  ];
}

/** Lee `create table public.x ( ... );` de las migraciones y saca los nombres de columna. */
function migrationColumns(): Map<string, string[]> {
  const sql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .join('\n')
    .replace(/--.*$/gm, '');
  const tables = new Map<string, string[]>();
  for (const m of sql.matchAll(/create table public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const columns: string[] = [];
    let depth = 0;
    let line = '';
    for (const ch of m[2] ?? '') {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        columns.push(line);
        line = '';
      } else line += ch;
    }
    columns.push(line);
    const names = columns.map((c) => c.trim().split(/\s+/)[0] ?? '').filter((n) => n && !['primary', 'unique', 'constraint', 'foreign', 'check'].includes(n));
    tables.set(m[1] ?? '', names);
  }
  return tables;
}

describe('textos legales', () => {
  it('todo texto existe en es y ca, sin cadenas vacías', () => {
    for (const t of allLocalized()) for (const l of LOCALES) expect(t[l].trim().length).toBeGreaterThan(0);
  });

  it('las secciones tienen id único y hay contenido', () => {
    expect(PRIVACY_SECTIONS.length).toBeGreaterThan(0);
    const ids = PRIVACY_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la versión y la fecha tienen formato válido', () => {
    expect(PRIVACY_VERSION).toMatch(/^\d+\.\d+$/);
    expect(PRIVACY_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('los marcadores PENDIENTE son visibles hasta que Luis los rellene', () => {
    for (const p of Object.values(PENDING)) {
      expect(p.es).toMatch(/\[PENDIENTE: /);
      expect(p.ca).toMatch(/\[PENDENT: /);
    }
    const all = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).map((p) => p.es).join(' ');
    for (const p of Object.values(PENDING)) expect(all).toContain(p.es);
  });

  it('la política muestra la tabla de datos y la de subencargados', () => {
    expect(PRIVACY_SECTIONS.some((s) => s.table === 'data')).toBe(true);
    expect(PRIVACY_SECTIONS.some((s) => s.table === 'subprocessors')).toBe(true);
  });
});

describe('datos del servidor', () => {
  const tables = migrationColumns();

  it('lee las tablas de las migraciones', () => {
    expect([...tables.keys()].sort()).toEqual(['answers', 'children', 'progress']);
  });

  it('cada columna de las migraciones aparece en la política, y al revés', () => {
    for (const [table, columns] of tables) {
      const documented = SERVER_DATA.find((d) => d.table === table);
      expect(documented, `tabla ${table} sin documentar`).toBeDefined();
      expect([...(documented?.columns ?? [])].sort(), `columnas de ${table}`).toEqual([...columns].sort());
    }
    for (const d of SERVER_DATA) {
      if (d.table !== 'auth.users') expect(tables.has(d.table), `${d.table} no existe en las migraciones`).toBe(true);
    }
  });

  it('documenta el login anónimo', () => {
    expect(SERVER_DATA.some((d) => d.table === 'auth.users')).toBe(true);
  });
});

describe('subencargados', () => {
  it('incluye Supabase, Brevo y Cloudflare', () => {
    expect(SUBPROCESSORS.map((s) => s.name).sort()).toEqual(['Brevo', 'Cloudflare', 'Supabase']);
  });

  it('Brevo está marcado como futuro y con su nota', () => {
    const brevo = SUBPROCESSORS.find((s) => s.name === 'Brevo');
    expect(brevo?.future).toBe(true);
    expect(brevo?.note).toBeDefined();
  });
});

describe('aviso de borrador', () => {
  it('las plantillas de contrato llevan el aviso mientras LEGAL_DRAFT sea true', () => {
    if (!LEGAL_DRAFT) return;
    for (const [file, notice] of [
      ['contrato-encargo-tratamiento.es.md', DRAFT_NOTICE.es],
      ['contrato-encargo-tratamiento.ca.md', DRAFT_NOTICE.ca],
    ] as const) {
      expect(readFileSync(join(CONTRACTS, file), 'utf8')).toContain(notice);
    }
  });

  it('las plantillas mencionan a los tres subencargados y las tablas', () => {
    for (const file of ['contrato-encargo-tratamiento.es.md', 'contrato-encargo-tratamiento.ca.md']) {
      const text = readFileSync(join(CONTRACTS, file), 'utf8');
      for (const s of SUBPROCESSORS) expect(text).toContain(s.name);
    }
  });
});
