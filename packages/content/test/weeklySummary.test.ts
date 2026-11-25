import { describe, expect, it } from 'vitest';
import {
  ADVANCE_MIN_CORRECT,
  brevoRequestBody,
  buildWeeklySummary,
  createUnsubscribeToken,
  renderSummaryEmail,
  selectRecipients,
  unsubscribeUrl,
  verifyUnsubscribeToken,
  type SummaryAnswer,
  type SummaryFamily,
} from '../src/index.js';

const WEEK = { from: '2026-11-16T00:00:00+01:00', to: '2026-11-23T00:00:00+01:00' };
const ans = (at: string, correct = true, skill: SummaryAnswer['skill'] = 'add-within-10'): SummaryAnswer => ({ skill, correct, at });

describe('buildWeeklySummary', () => {
  it('cuenta días distintos (en hora de Madrid), ejercicios y aciertos', () => {
    const [s] = buildWeeklySummary(
      [
        {
          childId: 'a',
          nickname: 'Lía',
          answers: [
            ans('2026-11-16T10:00:00+01:00'),
            ans('2026-11-16T18:00:00+01:00', false),
            // 23:30 UTC del 17 ya es el 18 en Madrid
            ans('2026-11-17T23:30:00Z'),
            ans('2026-11-19T08:00:00+01:00'),
          ],
        },
      ],
      WEEK,
    );
    expect(s).toMatchObject({ daysPlayed: 3, exercises: 4, correct: 3 });
  });

  it('una semana sin jugar sale con ceros', () => {
    const [s] = buildWeeklySummary([{ childId: 'a', nickname: 'Lía', answers: [] }], WEEK);
    expect(s).toEqual({ childId: 'a', nickname: 'Lía', daysPlayed: 0, exercises: 0, correct: 0, advancing: [] });
  });

  it('ignora lo que cae fuera de la semana (el final no entra)', () => {
    const [s] = buildWeeklySummary(
      [{ childId: 'a', nickname: 'Lía', answers: [ans('2026-11-15T23:59:00+01:00'), ans('2026-11-23T00:00:00+01:00'), ans('2026-11-22T23:59:00+01:00')] }],
      WEEK,
    );
    expect(s?.exercises).toBe(1);
  });

  it('solo avanzan las habilidades con suficientes aciertos, en orden de currículo', () => {
    const answers = [
      ...Array.from({ length: ADVANCE_MIN_CORRECT }, () => ans('2026-11-17T10:00:00+01:00', true, 'sub-within-10')),
      ...Array.from({ length: ADVANCE_MIN_CORRECT }, () => ans('2026-11-17T11:00:00+01:00', true, 'add-within-10')),
      ...Array.from({ length: ADVANCE_MIN_CORRECT - 1 }, () => ans('2026-11-17T12:00:00+01:00', true, 'add-within-20-carry')),
      ...Array.from({ length: 10 }, () => ans('2026-11-17T13:00:00+01:00', false, 'sub-within-20-borrow')),
    ];
    const [s] = buildWeeklySummary([{ childId: 'a', nickname: 'Lía', answers }], WEEK);
    expect(s?.advancing).toEqual(['add-within-10', 'sub-within-10']);
  });

  it('cada niño cuenta solo lo suyo', () => {
    const [a, b] = buildWeeklySummary(
      [
        { childId: 'a', nickname: 'A', answers: [ans('2026-11-17T10:00:00+01:00')] },
        { childId: 'b', nickname: 'B', answers: [] },
      ],
      WEEK,
    );
    expect([a?.exercises, b?.exercises]).toEqual([1, 0]);
  });
});

describe('selectRecipients', () => {
  const base: SummaryFamily = { familyId: 'f', email: 'a@example.com', locale: 'es', optOutAt: null, consented: true };
  it('no incluye a una familia dada de baja', () => {
    expect(selectRecipients([{ ...base, optOutAt: '2026-11-20T10:00:00Z' }])).toEqual([]);
  });
  it('no incluye a una familia sin consentimiento', () => {
    expect(selectRecipients([{ ...base, consented: false }])).toEqual([]);
  });
  it('no incluye a una familia sin correo', () => {
    expect(selectRecipients([{ ...base, email: ' ' }])).toEqual([]);
  });
  it('incluye a la familia activa con consentimiento', () => {
    expect(selectRecipients([base])).toEqual([base]);
  });
});

describe('renderSummaryEmail', () => {
  const summary = buildWeeklySummary(
    [
      { childId: 'a', nickname: 'Lía', answers: Array.from({ length: 4 }, () => ans('2026-11-17T10:00:00+01:00')) },
      { childId: 'b', nickname: 'Pau', answers: [] },
    ],
    WEEK,
  );
  const url = unsubscribeUrl('https://kalkujuego.com/', 'fam.firma');

  for (const locale of ['es', 'ca'] as const) {
    it(`en ${locale}: texto plano, sin imágenes ni rastreo y con un único enlace (la baja)`, () => {
      const email = renderSummaryEmail(summary, locale, url);
      expect(email.subject.length).toBeGreaterThan(5);
      expect(email.text).not.toMatch(/<\s*(img|a|html|body)/i);
      expect(email.text).not.toMatch(/utm_|\?/);
      expect(email.text.match(/https?:\/\//g)).toHaveLength(1);
      expect(email.text).toContain(url);
      expect(email.text).toContain('Lía');
      expect(email.text).toContain('Pau');
    });
  }

  it('los textos de es y ca son distintos', () => {
    expect(renderSummaryEmail(summary, 'es', url).text).not.toEqual(renderSummaryEmail(summary, 'ca', url).text);
  });

  it('nunca habla de fallos', () => {
    const fails = buildWeeklySummary([{ childId: 'a', nickname: 'Lía', answers: [ans('2026-11-17T10:00:00+01:00', false)] }], WEEK);
    expect(renderSummaryEmail(fails, 'es', url).text).not.toMatch(/fall|error|mal\b/i);
  });

  it('el enlace de baja lleva el token en el fragmento, no en la consulta', () => {
    expect(url).toBe('https://kalkujuego.com/baja.html#fam.firma');
  });
});

describe('brevoRequestBody', () => {
  it('solo manda texto plano: sin HTML y sin nada de seguimiento', () => {
    const body = brevoRequestBody({ email: 's@example.com', name: 'Kalku' }, 'a@example.com', { subject: 'S', text: 'T' });
    expect(Object.keys(body).sort()).toEqual(['sender', 'subject', 'textContent', 'to']);
    expect(JSON.stringify(body)).not.toMatch(/htmlContent|track/i);
  });
});

describe('token de baja', () => {
  const id = '11111111-2222-4333-8444-555555555555';
  it('se verifica y devuelve la familia', async () => {
    const token = await createUnsubscribeToken(id, 'secreto');
    expect(await verifyUnsubscribeToken(token, 'secreto')).toBe(id);
  });
  it('no vale con otro secreto, otra firma o forma rara', async () => {
    const token = await createUnsubscribeToken(id, 'secreto');
    expect(await verifyUnsubscribeToken(token, 'otro')).toBeNull();
    expect(await verifyUnsubscribeToken(`${id}.${'0'.repeat(64)}`, 'secreto')).toBeNull();
    expect(await verifyUnsubscribeToken(`${id}.`, 'secreto')).toBeNull();
    expect(await verifyUnsubscribeToken('x.y', 'secreto')).toBeNull();
    expect(await verifyUnsubscribeToken(`${token}.mas`, 'secreto')).toBeNull();
  });
  it('no se puede usar la firma de una familia con otra', async () => {
    const other = '99999999-2222-4333-8444-555555555555';
    const [, sig] = (await createUnsubscribeToken(id, 'secreto')).split('.');
    expect(await verifyUnsubscribeToken(`${other}.${sig}`, 'secreto')).toBeNull();
  });
});
