import { describe, expect, it } from 'vitest';
import { generateRegion, isReachable, REGIONS } from '@kalku/world';
import { giftPieces, nextGift, openSurprise, parseSurpriseDay, surpriseSpot, SURPRISE } from '../src/index.js';

describe('cofre sorpresa del día', () => {
  it('uno al día: abierto hoy, no hay otro hasta mañana', () => {
    expect(openSurprise([], '2026-11-27', '2026-11-27')).toBeUndefined();
    expect(openSurprise([], '2026-11-26', '2026-11-27')).toBeDefined();
    expect(openSurprise([], null, '2026-11-27')).toBeDefined();
  });
  it('sin rarezas: da siempre el siguiente regalo que no tiene, en orden y sin repetir', () => {
    let owned: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < giftPieces().length; i++) {
      const r = openSurprise(owned, null, `2026-12-${String(i + 1).padStart(2, '0')}`);
      if (!r?.gift) throw new Error('debería haber regalo');
      expect(r.gift.id).toBe(giftPieces()[i]?.id);
      expect(seen).not.toContain(r.gift.id);
      seen.push(r.gift.id);
      owned = r.owned;
    }
    expect(nextGift(owned)).toBeUndefined();
    const last = openSurprise(owned, null, '2027-01-01');
    expect(last).toEqual({ gift: undefined, coins: SURPRISE.coinsWhenComplete, owned });
  });
  it('no muta la lista que recibe', () => {
    const owned: string[] = [];
    openSurprise(owned, null, '2026-11-27');
    expect(owned).toEqual([]);
  });

  for (const spec of REGIONS) {
    it(`en ${spec.id}: mismo día → misma casilla, alcanzable desde la entrada y lejos de ella`, () => {
      const map = generateRegion(spec, spec.seed);
      const days = ['2026-11-27', '2026-11-28', '2027-03-01', '2027-06-20'];
      for (const day of days) {
        const a = surpriseSpot(map, spec.id, day);
        const b = surpriseSpot(map, spec.id, day);
        expect(a).toBeDefined();
        expect(a).toEqual(b);
        if (!a) continue;
        expect(isReachable(map, map.entrance, a)).toBe(true);
        expect(['grass', 'flowers']).toContain(map.tiles[a.y * map.width + a.x]);
        expect(Math.abs(a.x - map.entrance.x) + Math.abs(a.y - map.entrance.y)).toBeGreaterThanOrEqual(SURPRISE.minDistance);
      }
      const spots = new Set(days.map((d) => JSON.stringify(surpriseSpot(map, spec.id, d))));
      expect(spots.size).toBeGreaterThan(1);
    });
  }

  it('lee el día guardado', () => {
    expect(parseSurpriseDay('2026-11-27')).toBe('2026-11-27');
    expect(parseSurpriseDay('ayer')).toBeNull();
    expect(parseSurpriseDay(5)).toBeNull();
  });
});
