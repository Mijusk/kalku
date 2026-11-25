import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION } from '@kalku/content';
import { formatSchoolCode, loadTeacherView, registerSchool, TeacherError, toTeacherError, type SchoolInfo, type TeacherBackend } from '../src/teacher';
import { tr, type StringKey } from '../src/i18n';

function fakeBackend(overrides: Partial<TeacherBackend> = {}): TeacherBackend & { created: unknown[][]; joined: string[] } {
  const f = {
    created: [] as unknown[][],
    joined: [] as string[],
    async adultId() {
      return 'adult' as string | null;
    },
    async sendLoginLink() {},
    async signOut() {},
    async mySchool() {
      return null as SchoolInfo | null;
    },
    async createSchool(name: string, version: string, accepts: boolean) {
      f.created.push([name, version, accepts]);
      return { name, code: 'ABCD2345' };
    },
    async rotateCode() {
      return 'WXYZ6789';
    },
    async joinWithCode(code: string) {
      f.joined.push(code);
      return { name: 'Cole' };
    },
    async leaveSchool() {},
    ...overrides,
  };
  return f;
}

describe('errores del docente', () => {
  it('reconoce el mensaje del servidor', () => {
    expect(toTeacherError({ message: 'invalid-code' }).code).toBe('invalid-code');
    expect(toTeacherError({ message: 'P0001: already-in-school' }).code).toBe('already-in-school');
    expect(toTeacherError({ message: 'contract-required' }).code).toBe('contract-required');
    expect(toTeacherError({ message: 'director-cannot-leave' }).code).toBe('director-cannot-leave');
  });

  it('lo desconocido es un fallo de red', () => {
    expect(toTeacherError(new Error('boom')).code).toBe('network');
    expect(toTeacherError(null).code).toBe('network');
  });

  it('un error ya conocido se devuelve igual', () => {
    const e = new TeacherError('not-director');
    expect(toTeacherError(e)).toBe(e);
  });
});

describe('qué pantalla toca', () => {
  it('sin sesión: entrar', async () => {
    expect(await loadTeacherView(fakeBackend({ adultId: async () => null }))).toEqual({ kind: 'login' });
  });

  it('con sesión y sin centro: unirse o dar de alta', async () => {
    expect(await loadTeacherView(fakeBackend())).toEqual({ kind: 'no-school' });
  });

  it('con centro: su centro y su rol', async () => {
    const school: SchoolInfo = { name: 'Cole', role: 'director' };
    expect(await loadTeacherView(fakeBackend({ mySchool: async () => school }))).toEqual({ kind: 'school', school });
  });
});

describe('alta de centro', () => {
  it('acepta el contrato de la versión vigente y devuelve el código', async () => {
    const backend = fakeBackend();
    const result = await registerSchool(backend, '  Cole Sol  ', true);
    expect(result).toEqual({ name: 'Cole Sol', code: 'ABCD2345' });
    expect(backend.created).toEqual([['Cole Sol', CONTRACT_VERSION, true]]);
  });

  it('sin aceptar el contrato no llama al servidor', async () => {
    const backend = fakeBackend();
    await expect(registerSchool(backend, 'Cole', false)).rejects.toMatchObject({ code: 'contract-required' });
    expect(backend.created).toHaveLength(0);
  });

  it('sin nombre, o con nombre demasiado largo, no llama al servidor', async () => {
    const backend = fakeBackend();
    await expect(registerSchool(backend, '   ', true)).rejects.toMatchObject({ code: 'invalid-name' });
    await expect(registerSchool(backend, 'x'.repeat(81), true)).rejects.toMatchObject({ code: 'invalid-name' });
    expect(backend.created).toHaveLength(0);
  });
});

describe('código del centro', () => {
  it('se muestra en dos grupos de cuatro', () => {
    expect(formatSchoolCode('ABCD2345')).toBe('ABCD 2345');
    expect(formatSchoolCode('AB')).toBe('AB');
  });
});

const TEACHER_KEYS: StringKey[] = [
  'teacherTitle', 'teacherIntro', 'teacherEmail', 'teacherEmailInvalid', 'teacherSendLink', 'teacherLinkSent', 'teacherNoSchool',
  'teacherJoinTitle', 'teacherJoinHelp', 'teacherCodeInput', 'teacherJoin', 'teacherJoined', 'teacherCreateTitle', 'teacherSchoolName',
  'teacherContract', 'teacherContractLink', 'teacherCreate', 'teacherCreated', 'teacherCodeOnce', 'teacherYourSchool',
  'teacherRoleDirector', 'teacherRoleTeacher', 'teacherRotate', 'teacherRotateHelp', 'teacherNewCode', 'teacherLeave', 'teacherLeft',
  'teacherSignOut', 'teacherWorking', 'teacherUnavailable', 'teacherBack', 'teacherErrInvalidCode', 'teacherErrInSchool',
  'teacherErrNotDirector', 'teacherErrDirectorLeave', 'teacherErrContract', 'teacherErrName', 'teacherErrEmail', 'teacherErrNotAdult',
  'teacherErrNetwork',
];

describe('textos de docentes', () => {
  it('existen en castellano y catalán, sin vacíos', () => {
    for (const key of TEACHER_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
    }
  });

  it('el catalán no es una copia del castellano en las frases largas', () => {
    for (const key of TEACHER_KEYS) {
      if (tr(key, 'es').length > 30) expect(tr(key, 'ca'), key).not.toBe(tr(key, 'es'));
    }
  });
});
