import { createRng } from '@kalku/exercises';
import { describe, expect, it } from 'vitest';
import { advanceQuest, nextQuest, parseQuest, QUEST_TEMPLATES, questTemplate, questText, validateQuests, type Quest } from '../src/index.js';

describe('encargos de los personajes', () => {
  it('los datos son válidos', () => {
    expect(validateQuests()).toEqual([]);
  });

  it('nunca se acaban y nunca repiten personaje dos veces seguidas', () => {
    const rng = createRng(7);
    let quest: Quest | undefined;
    for (let i = 0; i < 5000; i++) {
      const next = nextQuest(rng, quest);
      expect(next.npc).not.toBe(quest?.npc);
      const t = questTemplate(next.template);
      expect(t).toBeDefined();
      expect(next.need).toBeGreaterThanOrEqual(t?.min ?? 99);
      expect(next.need).toBeLessThanOrEqual(t?.max ?? -1);
      expect(next.reward).toBeGreaterThan(0);
      quest = next;
    }
  });

  it('primero se habla con quien lo pide; luego cuenta lo que toca', () => {
    let q: Quest = { template: 'lina-rescue', npc: 'lina', kind: 'rescue', need: 2, have: 0, accepted: false, reward: 30 };
    expect(advanceQuest(q, { type: 'battleWon', rescued: true }).changed).toBe(false);
    expect(advanceQuest(q, { type: 'talked', npc: 'bruno' }).changed).toBe(false);
    q = advanceQuest(q, { type: 'talked', npc: 'lina' }).quest;
    expect(q.accepted).toBe(true);
    // Ganar sin rescatar no cuenta para Lina.
    expect(advanceQuest(q, { type: 'battleWon', rescued: false }).changed).toBe(false);
    q = advanceQuest(q, { type: 'battleWon', rescued: true }).quest;
    const end = advanceQuest(q, { type: 'battleWon', rescued: true });
    expect(end.done).toBe(true);
    expect(end.quest.have).toBe(2);
  });

  it('no muta el encargo y nunca baja el contador', () => {
    const q: Quest = { template: 'bruno-planks', npc: 'bruno', kind: 'collect', need: 3, have: 1, accepted: true, reward: 40 };
    const copy = { ...q };
    const out = advanceQuest(q, { type: 'riddleSolved' });
    expect(q).toEqual(copy);
    expect(out.quest.have).toBe(1);
  });

  it('los textos ponen la cantidad', () => {
    const t = QUEST_TEMPLATES[0];
    if (!t) throw new Error('sin encargos');
    expect(questText(t.objective, 3, 'es')).toContain('3');
    expect(questText(t.objective, 3, 'ca')).not.toContain('{n}');
  });

  it('el guardado se corrige o se descarta', () => {
    expect(parseQuest(null)).toBeNull();
    expect(parseQuest({ template: 'no-existe' })).toBeNull();
    expect(parseQuest({ template: 'bruno-planks', need: 99, have: 99, accepted: true })).toEqual({
      template: 'bruno-planks', npc: 'bruno', kind: 'collect', need: 4, have: 3, accepted: true, reward: 50,
    });
  });
});
