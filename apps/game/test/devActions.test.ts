import { describe, expect, it } from 'vitest';
import { dateKey, isStoryDone, missionsFor, regionOpen, REGION_STORIES, stepsOf } from '@kalku/content';
import { SKILL_IDS } from '@kalku/exercises';
import { completeMissions, completeQuest, finishRegion, jumpToRegion, masterAll, skipStep } from '../src/dev/devActions';
import { defaultProgress } from '../src/progress';

const [PRADERA, BOSQUE] = REGION_STORIES;

describe('panel de desarrollo', () => {
  it('pasar paso avanza uno y abre las zonas que abriría la historia', () => {
    const p = defaultProgress();
    expect(skipStep(p)).toBe(true);
    expect(p.story.step).toBe(1);
    expect(p.placementDone).toBe(true);
    const opensAt = stepsOf(p.story).findIndex((s) => s.opensZone);
    while (p.story.step <= opensAt) skipStep(p);
    expect(p.zonesOpened).toContain(stepsOf(p.story)[opensAt]?.opensZone);
  });

  it('terminar la región abre el camino a la siguiente, y luego no hay nada que pasar', () => {
    const p = defaultProgress();
    expect(finishRegion(p)).toBe(true);
    expect(isStoryDone(p.story)).toBe(true);
    expect(regionOpen(p.story, BOSQUE!.id)).toBe(true);
    expect(skipStep(p)).toBe(false);
    expect(finishRegion(p)).toBe(false);
  });

  it('ir a una región por delante la empieza y da por hechas las anteriores (con sus zonas)', () => {
    const p = defaultProgress();
    expect(jumpToRegion(p, BOSQUE!.id)).toBe(true);
    expect(p.at).toBe(BOSQUE!.id);
    expect(p.story).toEqual({ region: BOSQUE!.id, step: 0, count: 0, crystals: [] });
    for (const step of PRADERA!.steps) if (step.opensZone) expect(p.zonesOpened).toContain(step.opensZone);
    // Volver atrás no reinicia nada.
    expect(jumpToRegion(p, PRADERA!.id)).toBe(false);
    expect(p.at).toBe(PRADERA!.id);
    expect(p.story.region).toBe(BOSQUE!.id);
  });

  it('completar el encargo da sus Cifras y lo quita', () => {
    const p = defaultProgress();
    expect(completeQuest(p)).toBe(false);
    p.quest = { template: 'x', npc: 'bruno', kind: 'battles', need: 3, have: 0, accepted: true, reward: 40 };
    expect(completeQuest(p)).toBe(true);
    expect(p.coins).toBe(40);
    expect(p.quest).toBeNull();
  });

  it('completar las misiones da cada premio una sola vez', () => {
    const p = defaultProgress();
    const now = new Date('2026-11-27T10:00:00Z');
    const missions = missionsFor(dateKey(now));
    expect(completeMissions(p, now)).toBe(missions.length);
    expect(p.coins).toBe(missions.reduce((sum, m) => sum + m.reward, 0));
    expect(completeMissions(p, now)).toBe(0);
    expect(p.coins).toBe(missions.reduce((sum, m) => sum + m.reward, 0));
  });

  it('dominar todo pone cada habilidad a 100 con su gema', () => {
    const p = defaultProgress();
    masterAll(p);
    for (const id of SKILL_IDS) expect(p.profile[id].mastery).toBe(100);
    expect(p.gems).toEqual([...SKILL_IDS]);
  });
});
