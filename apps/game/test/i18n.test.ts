import { describe, expect, it } from 'vitest';
import { tr, trf, type StringKey } from '../src/i18n';

// Las claves de la cuenta de familia (#47): todas existen en es y ca, sin vacíos.
const FAMILY_KEYS: StringKey[] = [
  'familyTitle', 'familyEmail', 'familyEmailInvalid', 'familySendLink', 'familyEntering', 'familyRemove', 'familyRemoved',
  'familyJoined', 'familyShowCode', 'familyCodeInput', 'familySignOut',
  'familyWorking', 'familyUnavailable', 'familyErrInvalidCode', 'familyErrInFamily', 'familyErrFull', 'familyErrNotAdult',
  'familyErrNoChild', 'familyErrNetwork',
];

// Pantalla de inicio y flujos guiados: todo texto nuevo existe en los dos idiomas.
const GUIDED_KEYS: StringKey[] = [
  'titleTagline', 'titlePlay', 'titleContinue', 'titleHello', 'titleAdults', 'titleHome', 'setupStep',
  'adultsHubTitle', 'adultsHubIntro', 'adultsFamilyCard', 'adultsFamilyCardText', 'adultsTeacherCard', 'adultsTeacherCardText',
  'adultsDataCard', 'adultsDataCardText', 'adultsPrivacyCard', 'adultsPrivacyCardText', 'adultsDataIntro',
  'mailTitle', 'mailStep1', 'mailStep2', 'mailStep3', 'mailResend', 'mailResent', 'mailOther',
  'familyIntroTitle', 'familyBenefit1', 'familyBenefit2', 'familyBenefit3', 'familyNoPassword', 'familyHomeTitle',
  'familyEmptyTitle', 'familyEmptyText', 'familyAddChild', 'familyAddAnother', 'familyHereBanner', 'familyAddHere',
  'familyChildStats', 'familyNotPlayed', 'familyPlayAs', 'familyPlayingHere', 'familyOptions', 'familyOptionsTitle',
  'familyRemoveText', 'familyWithdrawHelp', 'familySummaryTitle', 'familyAddWhereTitle', 'familyAddWhereHere',
  'familyAddWhereHereText', 'familyAddWhereOther', 'familyAddWhereOtherText', 'familyAddWhereNew', 'familyCodeTitle',
  'familyCodeStep1', 'familyCodeStep2', 'familyCodeStep3', 'familyCodeStep4', 'familyNext', 'familyConsentTitle',
  'familyConsentWhy', 'familyConsentSave', 'familyConsentNot', 'familyConsentProof', 'familyConsentGo', 'familyAddedTitle',
  'familyShowCodeHelp', 'familyDeviceCodeTitle', 'familyDeviceCodeStep', 'familyDone',
  'teacherIntroTitle', 'teacherBenefit1', 'teacherBenefit2', 'teacherBenefit3', 'teacherNoPassword', 'teacherStartTitle',
  'teacherStartJoin', 'teacherStartJoinText', 'teacherStartCreate', 'teacherStartCreateText', 'teacherStartTry',
  'teacherStartTryText', 'teacherCreateHelp', 'teacherMore',
];

describe('textos de la pantalla de inicio y los flujos guiados', () => {
  it('existen en castellano y catalán, y el catalán no copia las frases largas', () => {
    for (const key of GUIDED_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
      if (tr(key, 'es').length > 30) expect(tr(key, 'ca'), key).not.toBe(tr(key, 'es'));
    }
  });

  it('las marcas {name}, {n}… son las mismas en los dos idiomas', () => {
    const marks = (t: string): string[] => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
    for (const key of GUIDED_KEYS) expect(marks(tr(key, 'ca')), key).toEqual(marks(tr(key, 'es')));
  });

  it('trf cambia las marcas por sus valores', () => {
    expect(trf('setupStep', 'es', { n: 2, total: 3 })).toBe('Paso 2 de 3');
    expect(trf('titleHello', 'ca', { name: 'Rayo' })).toBe('Hola de nou, Rayo!');
  });
});

const ZONE_KEYS: StringKey[] = ['zoneNeedGem', 'zoneNeedLevel', 'zoneOpened', 'zoneTreasure', 'treasures', 'treasureHint'];

describe('textos de las zonas', () => {
  it('existen en castellano y catalán', () => {
    for (const key of ZONE_KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
    }
  });
});

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

// Panel de dominio del docente (#55): todos los textos existen en es y ca.
describe('textos del panel de dominio', () => {
  const KEYS: StringKey[] = [
    'progressOpen', 'progressTitle', 'progressIntro', 'progressEmpty', 'progressStudent', 'progressFlag', 'progressFlagShort',
    'progressBackToClass', 'progressBackToTable', 'progressInProgress', 'progressNoneInProgress', 'progressSessions',
    'progressNoSessions', 'progressSessionLine', 'progressNotStarted',
  ];
  it('están en es y ca', () => {
    for (const key of KEYS) {
      expect(tr(key, 'es').trim().length, `${key} es`).toBeGreaterThan(0);
      expect(tr(key, 'ca').trim().length, `${key} ca`).toBeGreaterThan(0);
    }
  });
});
