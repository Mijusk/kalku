import { describe, expect, it } from 'vitest';
import { tr, type StringKey } from '../src/i18n';

// Las claves de la cuenta de familia (#47): todas existen en es y ca, sin vacíos.
const FAMILY_KEYS: StringKey[] = [
  'familyTitle', 'familyAlready', 'familyIntro', 'familyEmail', 'familyEmailInvalid', 'familySendLink', 'familyLinkSent',
  'familyChildren', 'familyNoChildren', 'familySkills', 'familyEnterAs', 'familyEntering', 'familyRemove', 'familyRemoved',
  'familyJoinHere', 'familyJoined', 'familyShowCode', 'familyCodeText', 'familyCodeInput', 'familyJoin', 'familySignOut',
  'familyWorking', 'familyUnavailable', 'familyErrInvalidCode', 'familyErrInFamily', 'familyErrFull', 'familyErrNotAdult',
  'familyErrNoChild', 'familyErrNetwork',
];

describe('textos de la cuenta de familia', () => {
  it('existen en castellano y catalán', () => {
    for (const key of FAMILY_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
    }
  });

  it('el catalán no es una copia del castellano en las frases largas', () => {
    for (const key of FAMILY_KEYS) {
      if (tr(key, 'es').length > 30) expect(tr(key, 'ca'), key).not.toBe(tr(key, 'es'));
    }
  });
});
