import type { ChapterInfo, StoryStep } from './story.js';

/**
 * Pradera Uno, la primera región (docs/HISTORIA.md): capítulos y pasos.
 * Una región nueva es otro fichero como este (docs/JUEGO-SIN-FIN.md).
 */
export const CHAPTERS: readonly ChapterInfo[] = [
  { chapter: 1, title: { es: 'La chispa', ca: "L'espurna" } },
  { chapter: 2, title: { es: 'El puente roto', ca: 'El pont trencat' } },
  { chapter: 3, title: { es: 'La cueva sin luz', ca: 'La cova sense llum' } },
  { chapter: 4, title: { es: 'La Puerta de Piedra', ca: 'La Porta de Pedra' } },
  { chapter: 5, title: { es: 'El Gran Borrón', ca: 'El Gran Borrón' } },
];

export const STORY: readonly StoryStep[] = [
  { id: 'prologue', chapter: 1, kind: 'prologue', intro: 'prologue', objective: { es: 'Despierta', ca: 'Desperta’t' } },
  { id: 'create', chapter: 1, kind: 'create', intro: 'uni-hello', objective: { es: 'Crea tu personaje', ca: 'Crea el teu personatge' } },
  {
    id: 'training',
    chapter: 1,
    kind: 'training',
    npc: 'tecla',
    intro: 'tecla-training',
    outro: 'tecla-training-done',
    objective: { es: 'Entrena con la abuela Tecla', ca: "Entrena amb l'àvia Tecla" },
  },
  {
    id: 'first-rescue',
    chapter: 1,
    kind: 'firstRescue',
    outro: 'first-rescue-done',
    objective: { es: 'Ayuda al Sumus Brote asustado', ca: 'Ajuda el Sumus Brot espantat' },
  },
  {
    id: 'meet-bruno',
    chapter: 2,
    kind: 'talk',
    npc: 'bruno',
    outro: 'bruno-planks',
    objective: { es: 'Habla con Bruno junto al río', ca: 'Parla amb en Bruno vora el riu' },
  },
  {
    id: 'planks',
    chapter: 2,
    kind: 'collect',
    count: 3,
    item: 'plank',
    objective: { es: 'Devuelve la chispa a las criaturas y recupera los tablones', ca: "Torna l'espurna a les criatures i recupera els taulons" },
  },
  {
    id: 'bruno-fix',
    chapter: 2,
    kind: 'talk',
    npc: 'bruno',
    outro: 'bruno-fixes',
    opensZone: 'puente-roto',
    objective: { es: 'Lleva los tablones a Bruno', ca: 'Porta els taulons a en Bruno' },
  },
  {
    id: 'meet-lina',
    chapter: 3,
    kind: 'talk',
    npc: 'lina',
    outro: 'lina-cave',
    opensZone: 'cueva',
    objective: { es: 'Busca a Lina en la cueva', ca: 'Busca la Lina a la cova' },
  },
  {
    id: 'crystals',
    chapter: 3,
    kind: 'crystals',
    count: 3,
    item: 'crystal',
    objective: { es: 'Enciende los cristales de la cueva', ca: 'Encén els cristalls de la cova' },
  },
  {
    id: 'lina-light',
    chapter: 3,
    kind: 'talk',
    npc: 'lina',
    outro: 'lina-light',
    objective: { es: 'Cuéntaselo a Lina', ca: "Explica-ho a la Lina" },
  },
  {
    id: 'meet-pedrolo',
    chapter: 4,
    kind: 'talk',
    npc: 'pedrolo',
    outro: 'pedrolo-riddles',
    objective: { es: 'Ve a la Puerta de Piedra', ca: 'Ves a la Porta de Pedra' },
  },
  {
    id: 'riddles',
    chapter: 4,
    kind: 'riddles',
    npc: 'pedrolo',
    count: 3,
    item: 'rune',
    outro: 'pedrolo-opens',
    opensZone: 'puerta-de-piedra',
    objective: { es: 'Resuelve los acertijos de Pedrolo', ca: 'Resol les endevinalles d’en Pedrolo' },
  },
  {
    id: 'boss',
    chapter: 5,
    kind: 'boss',
    intro: 'borron-appears',
    outro: 'finale',
    objective: { es: 'Encuentra al Gran Borrón en el claro del este', ca: "Troba el Gran Borrón a la clariana de l'est" },
  },
];
