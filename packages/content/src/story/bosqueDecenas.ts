import type { ChapterInfo, StoryStep } from './story.js';

/**
 * Bosque de las Decenas, la segunda región (números hasta 100): capítulos y
 * pasos. Se abre al terminar Pradera Uno, por el cartel del camino.
 */
export const CHAPTERS: readonly ChapterInfo[] = [
  { chapter: 1, title: { es: 'Las bellotas', ca: 'Els glans' } },
  { chapter: 2, title: { es: 'Los farolillos', ca: 'Els fanalets' } },
  { chapter: 3, title: { es: 'El Árbol Hueco', ca: "L'Arbre Buit" } },
  { chapter: 4, title: { es: 'El Gran Enredo', ca: 'El Gran Embolic' } },
];

export const STORY: readonly StoryStep[] = [
  {
    id: 'meet-olma',
    chapter: 1,
    kind: 'talk',
    npc: 'olma',
    outro: 'olma-hello',
    objective: { es: 'Busca a Olma, la guardabosques', ca: "Busca l'Olma, la guardaboscos" },
  },
  {
    id: 'acorns',
    chapter: 1,
    kind: 'collect',
    count: 3,
    item: 'acorn',
    objective: { es: 'Devuelve la chispa a las criaturas del bosque y recupera las bellotas', ca: "Torna l'espurna a les criatures del bosc i recupera els glans" },
  },
  {
    id: 'olma-acorns',
    chapter: 1,
    kind: 'talk',
    npc: 'olma',
    outro: 'olma-path',
    opensZone: 'claro-farolillos',
    objective: { es: 'Lleva las bellotas a Olma', ca: "Porta els glans a l'Olma" },
  },
  {
    id: 'lanterns',
    chapter: 2,
    kind: 'crystals',
    count: 3,
    item: 'lantern',
    objective: { es: 'Enciende los farolillos del claro', ca: 'Encén els fanalets de la clariana' },
  },
  {
    id: 'olma-light',
    chapter: 2,
    kind: 'talk',
    npc: 'olma',
    outro: 'olma-lanterns',
    objective: { es: 'Cuéntaselo a Olma', ca: "Explica-ho a l'Olma" },
  },
  {
    id: 'meet-cuco',
    chapter: 3,
    kind: 'talk',
    npc: 'cuco',
    outro: 'cuco-riddles',
    objective: { es: 'Busca a Cuco en el Árbol Hueco', ca: "Busca en Cuco a l'Arbre Buit" },
  },
  {
    id: 'riddles',
    chapter: 3,
    kind: 'riddles',
    npc: 'cuco',
    count: 3,
    item: 'rune',
    outro: 'cuco-opens',
    opensZone: 'arbol-hueco',
    objective: { es: 'Resuelve los acertijos de Cuco', ca: "Resol les endevinalles d'en Cuco" },
  },
  {
    id: 'boss',
    chapter: 4,
    kind: 'boss',
    intro: 'enredo-appears',
    outro: 'forest-finale',
    objective: { es: 'Encuentra al Gran Enredo en el corazón del bosque', ca: 'Troba el Gran Embolic al cor del bosc' },
  },
];
