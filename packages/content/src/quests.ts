import type { Localized, Rng } from '@kalku/exercises';
import type { CharacterId } from './story/scenes.js';

/**
 * Encargos repetibles de los personajes (docs/JUEGO-SIN-FIN.md §3): cuando
 * se acaba la historia de una región, sus personajes siguen pidiendo
 * favores, generados por reglas con semilla. Nunca se acaban.
 *
 * Reglas (con test): solo se cumplen aprendiendo (combates ganados,
 * rescates, acertijos), fallar no resta nada y ninguno pide rapidez.
 * El premio son Cifras (cosmética), nunca XP: la XP solo sale de acertar.
 */
export type QuestKind =
  /** Ganar combates en la hierba alta (cada uno trae un objeto). */
  | 'collect'
  /** Rescatar criaturas. */
  | 'rescue'
  /** Resolver acertijos con el guardián. */
  | 'riddles'
  /** Ganar combates, sin más. */
  | 'battles';

export interface QuestTemplate {
  id: string;
  npc: CharacterId;
  kind: QuestKind;
  min: number;
  max: number;
  /** Lo que pide, con `{n}` (cuántos). */
  ask: Localized;
  /** Lo que pone la tarjeta, con `{n}`. */
  objective: Localized;
  /** Lo que dice al terminarlo. */
  thanks: Localized;
}

export interface Quest {
  template: string;
  npc: CharacterId;
  kind: QuestKind;
  need: number;
  have: number;
  /** Ya se ha hablado con quien lo pide. Hasta entonces, el objetivo es ir a verle. */
  accepted: boolean;
  /** Cifras al terminarlo. */
  reward: number;
}

export type QuestEvent = { type: 'battleWon'; rescued: boolean } | { type: 'riddleSolved' } | { type: 'talked'; npc: CharacterId };

const t = (es: string, ca: string): Localized => ({ es, ca });

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: 'bruno-planks',
    npc: 'bruno',
    kind: 'collect',
    min: 2,
    max: 4,
    ask: t('Quiero hacer una caseta para las criaturas. ¿Me traes {n} tablones de la hierba alta?', 'Vull fer una caseta per a les criatures. Em portes {n} taulons de l’herba alta?'),
    objective: t('Trae {n} tablones a Bruno', 'Porta {n} taulons a en Bruno'),
    thanks: t('¡Justo los que necesitaba! Toma, por la ayuda.', 'Just els que necessitava! Té, per l’ajuda.'),
  },
  {
    id: 'lina-rescue',
    npc: 'lina',
    kind: 'rescue',
    min: 1,
    max: 3,
    ask: t('Aún quedan criaturas grises escondidas. ¿Rescatas a {n} para mi diario de exploradora?', 'Encara queden criatures grises amagades. En rescates {n} per al meu diari d’exploradora?'),
    objective: t('Rescata {n} criaturas para Lina', 'Rescata {n} criatures per a la Lina'),
    thanks: t('¡Ya las tengo dibujadas! Gracias por la ayuda.', 'Ja les tinc dibuixades! Gràcies per l’ajuda.'),
  },
  {
    id: 'pedrolo-riddles',
    npc: 'pedrolo',
    kind: 'riddles',
    min: 2,
    max: 3,
    ask: t('Grrr… Me aburro. He pensado {n} acertijos nuevos. ¿Te atreves?', 'Grrr… M’avorreixo. He pensat {n} endevinalles noves. T’hi atreveixes?'),
    objective: t('Resuelve {n} acertijos de Pedrolo', 'Resol {n} endevinalles d’en Pedrolo'),
    thanks: t('Nada mal. Nada mal… Vuelve otro día.', 'No està malament. Gens malament… Torna un altre dia.'),
  },
  {
    id: 'tecla-sparks',
    npc: 'tecla',
    kind: 'battles',
    min: 2,
    max: 4,
    ask: t('Las criaturas de la pradera aún tienen poca chispa. ¿Se la devuelves a {n} más?', 'Les criatures de la prada encara tenen poca espurna. Els la tornes a {n} més?'),
    objective: t('Devuelve la chispa a {n} criaturas', 'Torna l’espurna a {n} criatures'),
    thanks: t('Cada chispa cuenta. Gracias, Calculista.', 'Cada espurna compta. Gràcies, Calculista.'),
  },
  // Bosque de las Decenas.
  {
    id: 'olma-acorns',
    npc: 'olma',
    kind: 'collect',
    min: 2,
    max: 4,
    ask: t('Las ardillas del bosque han perdido sus bellotas. ¿Me traes {n}?', 'Els esquirols del bosc han perdut els glans. Me’n portes {n}?'),
    objective: t('Trae {n} bellotas a Olma', "Porta {n} glans a l'Olma"),
    thanks: t('¡Diez, veinte, treinta…! Ya las tengo contadas. Gracias.', 'Deu, vint, trenta…! Ja els tinc comptats. Gràcies.'),
  },
  {
    id: 'cuco-riddles',
    npc: 'cuco',
    kind: 'riddles',
    min: 2,
    max: 3,
    ask: t('Uh-uh… Esta noche he pensado {n} acertijos. ¿Los resolvemos juntos?', 'Uh-uh… Aquesta nit he pensat {n} endevinalles. Les resolem junts?'),
    objective: t('Resuelve {n} acertijos de Cuco', "Resol {n} endevinalles d'en Cuco"),
    thanks: t('Uh-uh. Pensar despacio da buenos frutos.', 'Uh-uh. Pensar a poc a poc dona bons fruits.'),
  },
  {
    id: 'ovillo-rescue',
    npc: 'ovillo',
    kind: 'rescue',
    min: 1,
    max: 3,
    ask: t('Aún hay criaturas enredadas por mi culpa. ¿Rescatas a {n}?', 'Encara hi ha criatures embolicades per culpa meva. En rescates {n}?'),
    objective: t('Rescata {n} criaturas para Ovillo', 'Rescata {n} criatures per al Cabdell'),
    thanks: t('¡Gracias! Ya no queda ningún nudo.', 'Gràcies! Ja no queda cap nus.'),
  },
];

/** Encargo siguiente: de otro personaje que el anterior, con semilla. */
export function nextQuest(rng: Rng, previous?: Quest, templates: readonly QuestTemplate[] = QUEST_TEMPLATES): Quest {
  const pool = templates.filter((q) => q.npc !== previous?.npc);
  const template = rng.pick(pool.length > 0 ? pool : templates);
  const need = rng.int(template.min, template.max);
  return { template: template.id, npc: template.npc, kind: template.kind, need, have: 0, accepted: false, reward: 10 * need + 10 };
}

/** Aplica un evento al encargo. No muta. `done` = terminado ahora. */
export function advanceQuest(quest: Quest, event: QuestEvent): { quest: Quest; changed: boolean; done: boolean } {
  if (!quest.accepted) {
    if (event.type === 'talked' && event.npc === quest.npc) return { quest: { ...quest, accepted: true }, changed: true, done: false };
    return { quest, changed: false, done: false };
  }
  const counts =
    (event.type === 'battleWon' && (quest.kind === 'collect' || quest.kind === 'battles')) ||
    (event.type === 'battleWon' && event.rescued && quest.kind === 'rescue') ||
    (event.type === 'riddleSolved' && quest.kind === 'riddles');
  if (!counts) return { quest, changed: false, done: false };
  const have = Math.min(quest.need, quest.have + 1);
  return { quest: { ...quest, have }, changed: true, done: have >= quest.need };
}

export function questTemplate(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((q) => q.id === id);
}

/** Texto con `{n}` cambiado. */
export function questText(text: Localized, need: number, locale: 'es' | 'ca'): string {
  return text[locale].split('{n}').join(String(need));
}

/** Lee el encargo guardado; lo que no sea válido se descarta (se genera otro). */
export function parseQuest(raw: unknown): Quest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const template = typeof r.template === 'string' ? questTemplate(r.template) : undefined;
  if (!template) return null;
  const need = typeof r.need === 'number' && Number.isInteger(r.need) ? Math.min(Math.max(r.need, template.min), template.max) : template.min;
  const have = typeof r.have === 'number' && Number.isInteger(r.have) ? Math.min(Math.max(0, r.have), need - 1) : 0;
  return { template: template.id, npc: template.npc, kind: template.kind, need, have, accepted: r.accepted === true, reward: 10 * need + 10 };
}

export function validateQuests(templates: readonly QuestTemplate[] = QUEST_TEMPLATES): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const q of templates) {
    if (ids.has(q.id)) errors.push(`${q.id}: repetido`);
    ids.add(q.id);
    if (!(q.min >= 1 && q.max >= q.min)) errors.push(`${q.id}: cantidades`);
    for (const text of [q.ask, q.objective, q.thanks]) if (!text.es.trim() || !text.ca.trim()) errors.push(`${q.id}: falta texto es o ca`);
  }
  if (new Set(templates.map((q) => q.npc)).size < 2) errors.push('hacen falta encargos de al menos dos personajes');
  return errors;
}
