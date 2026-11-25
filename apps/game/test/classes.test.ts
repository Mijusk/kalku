import { describe, expect, it } from 'vitest';
import { createRng } from '@kalku/exercises';
import { CLASS_MAX_STUDENTS, SECRET_ANIMALS, normalizeCode } from '@kalku/content';
import {
  addStudentWithCard,
  checkStudentNickname,
  classEntryUrl,
  hashStudentCode,
  regenerateStudentCard,
  type ClassBackend,
  type StudentInfo,
} from '../src/classes';
import { TeacherError } from '../src/teacher';
import { CARDS_PER_SHEET, qrMatrix } from '../src/ui/cards';
import { tr, type StringKey } from '../src/i18n';

/** Servidor falso con las mismas reglas que la base: hash único por clase. */
function fakeBackend(preTaken: string[] = []) {
  const students = new Map<string, { classId: string; nickname: string; hash: string; hint: string; animal: string }>();
  const burned = new Set(preTaken);
  let n = 0;
  const hashes = (classId: string) => new Set([...students.values()].filter((s) => s.classId === classId).map((s) => s.hash));
  const backend: ClassBackend = {
    async listClasses() {
      return [];
    },
    async createClass(name) {
      return { id: 'c1', name };
    },
    async listStudents(classId) {
      return [...students.entries()].filter(([, s]) => s.classId === classId).map(([id, s]) => ({ id, nickname: s.nickname, hint: s.hint, animal: s.animal }));
    },
    async addStudent(classId, nickname, hash, hint, animal) {
      if (hashes(classId).has(hash) || burned.has(hash)) throw new TeacherError('code-taken');
      if ([...students.values()].filter((s) => s.classId === classId).length >= CLASS_MAX_STUDENTS) throw new TeacherError('class-full');
      const id = `s${++n}`;
      students.set(id, { classId, nickname, hash, hint, animal });
      return id;
    },
    async regenerateCode(id, hash, hint, animal) {
      const s = students.get(id);
      if (!s) throw new TeacherError('not-your-class');
      if (hashes(s.classId).has(hash)) throw new TeacherError('code-taken');
      students.set(id, { ...s, hash, hint, animal });
    },
    async removeStudent(id) {
      students.delete(id);
    },
  };
  return { backend, students };
}

describe('hash del código', () => {
  it('es sha-256 en hexadecimal, no depende de mayúsculas ni guiones y cambia con la clase', async () => {
    const a = await hashStudentCode('clase-1', 'LUNA-47');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashStudentCode('clase-1', 'luna 47')).toBe(a);
    expect(await hashStudentCode('clase-2', 'LUNA-47')).not.toBe(a);
  });
});

describe('alumnos de una clase', () => {
  it('30 alumnos de una clase tienen 30 códigos distintos (miles de clases con semilla)', async () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const { backend } = fakeBackend();
      const rng = createRng(seed);
      const taken = new Set<string>();
      const codes = new Set<string>();
      for (let i = 0; i < CLASS_MAX_STUDENTS; i++) codes.add((await addStudentWithCard(backend, 'c1', `A${i}`, rng, taken)).code);
      expect(codes.size).toBe(CLASS_MAX_STUDENTS);
    }
  });

  it('guarda el hash y la pista, nunca el código en claro, y el animal es uno de los 6', async () => {
    const { backend, students } = fakeBackend();
    const card = await addStudentWithCard(backend, 'c1', 'Zorro', createRng(3));
    const saved = [...students.values()][0];
    expect(saved?.hash).toBe(await hashStudentCode('c1', card.code));
    expect(saved?.hint).toBe(card.code.slice(0, 2));
    expect(JSON.stringify(saved)).not.toContain(card.code);
    expect(SECRET_ANIMALS.map((a) => a.id)).toContain(card.animal);
  });

  it('si el servidor dice que el código ya existe, prueba con otro', async () => {
    const first = await addStudentWithCard(fakeBackend().backend, 'c1', 'X', createRng(9));
    const { backend } = fakeBackend([await hashStudentCode('c1', first.code)]);
    const card = await addStudentWithCard(backend, 'c1', 'X', createRng(9));
    expect(card.code).not.toBe(first.code);
  });

  it('regenerar da un código distinto y el anterior deja de valer', async () => {
    const { backend, students } = fakeBackend();
    const rng = createRng(11);
    const taken = new Set<string>();
    const card = await addStudentWithCard(backend, 'c1', 'Ana P.', rng, taken);
    const oldHash = await hashStudentCode('c1', card.code);
    const [student] = (await backend.listStudents('c1')) as [StudentInfo];
    const renewed = await regenerateStudentCard(backend, 'c1', student, rng, taken);
    expect(renewed.code).not.toBe(card.code);
    expect(renewed.nickname).toBe('Ana P.');
    const hashesNow = [...students.values()].map((s) => s.hash);
    expect(hashesNow).not.toContain(oldHash);
    expect(hashesNow).toContain(await hashStudentCode('c1', renewed.code));
  });

  it('un apodo vacío o de más de 20 letras no se envía al servidor', async () => {
    const { backend, students } = fakeBackend();
    await expect(addStudentWithCard(backend, 'c1', '   ', createRng(1))).rejects.toMatchObject({ code: 'invalid-nickname' });
    await expect(addStudentWithCard(backend, 'c1', 'x'.repeat(21), createRng(1))).rejects.toMatchObject({ code: 'invalid-nickname' });
    expect(students.size).toBe(0);
  });
});

describe('apodo de alumno', () => {
  it('avisa si parece nombre y apellido', () => {
    expect(checkStudentNickname('Ana García').looksLikeName).toBe(true);
    expect(checkStudentNickname('Zorro').looksLikeName).toBe(false);
    expect(checkStudentNickname('A'.repeat(20)).ok).toBe(true);
    expect(checkStudentNickname('A'.repeat(21)).ok).toBe(false);
  });
});

describe('tarjetas', () => {
  it('el QR solo lleva la dirección de entrada y el id de la clase', () => {
    expect(classEntryUrl('https://kalku.app', 'abc-123')).toBe('https://kalku.app/?clase=abc-123');
  });

  it('la matriz del QR es cuadrada y tiene los tres cuadros de posición', () => {
    const m = qrMatrix(classEntryUrl('https://kalku.app', 'ca000000-0000-0000-0000-000000000001'));
    const n = m.length;
    expect(n).toBeGreaterThanOrEqual(21);
    expect(n % 4).toBe(1); // 17 + 4·versión
    for (const row of m) expect(row).toHaveLength(n);
    // Cuadro de posición: borde exterior de 7×7 oscuro y anillo claro dentro.
    for (const [oy, ox] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      for (let i = 0; i < 7; i++) {
        expect(m[oy]?.[ox + i]).toBe(true);
        expect(m[oy + 6]?.[ox + i]).toBe(true);
        expect(m[oy + i]?.[ox]).toBe(true);
        expect(m[oy + i]?.[ox + 6]).toBe(true);
      }
      expect(m[oy + 1]?.[ox + 1]).toBe(false);
      expect(m[oy + 3]?.[ox + 3]).toBe(true);
    }
  });

  it('caben 8 tarjetas por hoja', () => {
    expect(CARDS_PER_SHEET).toBe(8);
  });
});

const CLASS_KEYS: StringKey[] = [
  'teacherMyClasses', 'teacherErrNotYourClass', 'teacherErrNickname', 'teacherErrCodeTaken', 'teacherErrClassFull', 'teacherErrStudent',
  'classTitle', 'classNoClasses', 'classNewName', 'classCreate', 'classCreated', 'classBack', 'classStudents', 'classNoStudents',
  'classNickname', 'classNicknameWarn', 'classAddStudent', 'classStudentAdded', 'classHint', 'classRegenerate', 'classRegenerated',
  'classRemove', 'classPrint', 'classPrintHelp', 'classNothingToPrint', 'cardCode', 'cardAnimal', 'cardSteps',
];

describe('textos de clases', () => {
  it('existen en castellano y catalán', () => {
    for (const key of CLASS_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
      if (tr(key, 'es').length > 30) expect(tr(key, 'ca'), key).not.toBe(tr(key, 'es'));
    }
  });
  it('normalizeCode se usa igual en cliente y contenido', () => {
    expect(normalizeCode('luna 47')).toBe('LUNA-47');
  });
});
