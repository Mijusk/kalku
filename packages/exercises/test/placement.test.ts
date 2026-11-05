import { describe, expect, it } from 'vitest';
import {
  applyPlacement,
  createProfile,
  createRng,
  isMastered,
  nextPlacementSkill,
  placementResult,
  PLACEMENT_LENGTH,
  PLACEMENT_MAX,
  recordPlacement,
  SKILLS,
  startPlacement,
  type MasteryProfile,
  type PlacementState,
} from '../src/index.js';

/** Hace la prueba entera; `answer` decide cada respuesta. */
function run(answer: (index: number) => boolean): PlacementState {
  let state = startPlacement();
  while (nextPlacementSkill(state)) state = recordPlacement(state, answer(state.asked));
  return state;
}

const total = (p: MasteryProfile) => SKILLS.reduce((sum, s) => sum + p[s.id].mastery, 0);

describe('prueba de nivel', () => {
  it('empieza a mitad del currículo', () => {
    const first = nextPlacementSkill(startPlacement());
    expect(first).toBe(SKILLS[2]?.id);
  });

  it('sube al acertar y baja al fallar, sin salirse del currículo', () => {
    const s0 = startPlacement();
    expect(recordPlacement(s0, true).level).toBe(s0.level + 1);
    expect(recordPlacement(s0, false).level).toBe(s0.level - 1);
    let up = s0;
    for (let i = 0; i < 20; i++) up = recordPlacement(up, true);
    expect(up.level).toBe(SKILLS.length - 1);
    let down = s0;
    for (let i = 0; i < 20; i++) down = recordPlacement(down, false);
    expect(down.level).toBe(0);
  });

  it('no muta el estado anterior', () => {
    const s0 = startPlacement();
    recordPlacement(s0, true);
    expect(s0.asked).toBe(0);
    expect(s0.history).toHaveLength(0);
  });

  it('acertarlo todo o fallarlo todo termina en 10 o menos', () => {
    expect(run(() => true).asked).toBeLessThanOrEqual(PLACEMENT_LENGTH);
    expect(run(() => false).asked).toBeLessThanOrEqual(PLACEMENT_LENGTH);
  });

  it('nunca pasa de 12 ejercicios, con miles de niños simulados', () => {
    for (let seed = 1; seed <= 3000; seed++) {
      const rng = createRng(seed);
      const chance = (seed % 11) / 10;
      const state = run(() => rng.chance(chance));
      expect(state.asked).toBeLessThanOrEqual(PLACEMENT_MAX);
    }
  });

  it('termina antes si ya está claro', () => {
    // Acierta hasta el techo y se queda ahí.
    expect(run(() => true).asked).toBeLessThan(PLACEMENT_LENGTH);
    // Acierta a la primera, falla la siguiente, y repite.
    const bounce = run((i) => i % 2 === 0);
    expect(bounce.asked).toBeLessThanOrEqual(PLACEMENT_LENGTH);
  });

  it('quien lo acierta todo acaba con más dominio que quien lo falla todo, entre 0 y 100', () => {
    const all = applyPlacement(createProfile(), placementResult(run(() => true)));
    const none = applyPlacement(createProfile(), placementResult(run(() => false)));
    expect(total(all)).toBeGreaterThan(total(none));
    for (const p of [all, none]) {
      for (const s of SKILLS) {
        expect(p[s.id].mastery).toBeGreaterThanOrEqual(0);
        expect(p[s.id].mastery).toBeLessThanOrEqual(100);
      }
    }
  });

  it('con semilla fija, mejor nivel real da igual o más dominio', () => {
    const totals = [0.1, 0.5, 0.9].map((chance) => {
      const rng = createRng(7);
      return total(placementResult(run(() => rng.chance(chance))));
    });
    expect(totals[2]).toBeGreaterThanOrEqual(totals[0] ?? 0);
  });

  it('reparte 80 por debajo del nivel, 40 en el nivel y 0 por encima', () => {
    // Acierta en las 3 primeras habilidades que se le piden y falla la 4.ª.
    let state = startPlacement();
    state = recordPlacement(state, true); // nivel 2 acertado
    state = recordPlacement(state, false); // nivel 3 fallado
    state = recordPlacement(state, true); // nivel 2 acertado
    const result = placementResult(state);
    expect(result[SKILLS[0]!.id].mastery).toBe(80);
    expect(result[SKILLS[1]!.id].mastery).toBe(80);
    expect(result[SKILLS[2]!.id].mastery).toBe(80);
    expect(result[SKILLS[3]!.id].mastery).toBe(40);
    expect(result[SKILLS[4]!.id].mastery).toBe(0);
    expect(isMastered(result[SKILLS[0]!.id])).toBe(true);
    expect(isMastered(result[SKILLS[3]!.id])).toBe(false);
  });

  it('el resultado no depende del tiempo: la API solo recibe aciertos', () => {
    expect(recordPlacement.length).toBe(2);
    const answers = [true, false, true, true, false, true, false, true, true, false];
    const a = run((i) => answers[i] ?? false);
    const b = run((i) => answers[i] ?? false);
    expect(placementResult(a)).toEqual(placementResult(b));
  });

  it('fallar no quita nada: aplicar el resultado nunca baja el dominio previo', () => {
    let prev = createProfile();
    prev = { ...prev, [SKILLS[5]!.id]: { mastery: 90, attempts: 30, correct: 28 } };
    const next = applyPlacement(prev, placementResult(run(() => false)));
    for (const s of SKILLS) {
      expect(next[s.id].mastery).toBeGreaterThanOrEqual(prev[s.id].mastery);
      expect(next[s.id].attempts).toBeGreaterThanOrEqual(prev[s.id].attempts);
    }
    expect(next[SKILLS[5]!.id].mastery).toBe(90);
  });

  it('applyPlacement no muta el perfil de entrada', () => {
    const prev = createProfile();
    const snapshot = JSON.parse(JSON.stringify(prev)) as MasteryProfile;
    applyPlacement(prev, placementResult(run(() => true)));
    expect(prev).toEqual(snapshot);
  });
});
