import type { StringKey } from '../i18n';
import type { TeacherErrorCode } from '../teacher';

/** Qué texto da cada error del servidor en las pantallas de docentes. */
export const ERROR_TEXT: Record<TeacherErrorCode, StringKey> = {
  'invalid-code': 'teacherErrInvalidCode',
  'already-in-school': 'teacherErrInSchool',
  'not-director': 'teacherErrNotDirector',
  'director-cannot-leave': 'teacherErrDirectorLeave',
  'contract-required': 'teacherErrContract',
  'invalid-name': 'teacherErrName',
  'email-not-confirmed': 'teacherErrEmail',
  'not-adult': 'teacherErrNotAdult',
  'not-your-class': 'teacherErrNotYourClass',
  'invalid-nickname': 'teacherErrNickname',
  'code-taken': 'teacherErrCodeTaken',
  'class-full': 'teacherErrClassFull',
  'invalid-student': 'teacherErrStudent',
  network: 'teacherErrNetwork',
};
