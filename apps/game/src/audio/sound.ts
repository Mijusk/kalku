/**
 * Sonido y música generados por código con Web Audio: sin ficheros de audio
 * ni dependencias. Los efectos y las melodías son datos (notas); este módulo
 * solo los toca.
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca la pantalla:
 * el contexto se crea (o se reanuda) en el primer toque o tecla.
 */

/** Una nota: frecuencia en Hz (0 = silencio), duración en segundos. */
interface Note {
  f: number;
  d: number;
}

interface Voice {
  wave: OscillatorType;
  volume: number;
  /** Desliza la frecuencia hasta este múltiplo al final de la nota (1 = nada). */
  slide?: number;
}

/** Efecto: una o varias notas seguidas con la misma voz. */
interface Effect {
  voice: Voice;
  notes: Note[];
}

const A4 = 440;
/** Frecuencia de una nota por semitonos desde La 4. */
const st = (n: number): number => A4 * 2 ** (n / 12);
// Notas de la escala (Do mayor) a partir de Do 4.
const C4 = st(-9);
const D4 = st(-7);
const E4 = st(-5);
const F4 = st(-4);
const G4 = st(-2);
const A4n = st(0);
const B4 = st(2);
const C5 = st(3);
const D5 = st(5);
const E5 = st(7);
const G5 = st(10);
const A5 = st(12);
const C6 = st(15);
const G3 = st(-14);
const A3 = st(-12);
const F3 = st(-16);
const C3 = st(-21);
const E3 = st(-17);
const D3 = st(-19);

export type SfxId =
  | 'tap'
  | 'spark'
  | 'bolt'
  | 'hit'
  | 'correct'
  | 'wrong'
  | 'enemyHit'
  | 'win'
  | 'rescue'
  | 'levelUp'
  | 'chest'
  | 'door'
  | 'talk'
  | 'quest'
  | 'step';

const EFFECTS: Record<SfxId, Effect> = {
  tap: { voice: { wave: 'square', volume: 0.05 }, notes: [{ f: G5, d: 0.04 }] },
  spark: { voice: { wave: 'triangle', volume: 0.12, slide: 2 }, notes: [{ f: C5, d: 0.08 }, { f: G5, d: 0.12 }] },
  bolt: { voice: { wave: 'sawtooth', volume: 0.08, slide: 3 }, notes: [{ f: C4, d: 0.1 }, { f: G4, d: 0.1 }, { f: C5, d: 0.18 }] },
  hit: { voice: { wave: 'square', volume: 0.1, slide: 0.4 }, notes: [{ f: A4n, d: 0.12 }] },
  correct: { voice: { wave: 'triangle', volume: 0.14 }, notes: [{ f: E5, d: 0.08 }, { f: G5, d: 0.08 }, { f: C6, d: 0.16 }] },
  // Un «uy» amable, nunca un zumbido de error.
  wrong: { voice: { wave: 'triangle', volume: 0.1, slide: 0.85 }, notes: [{ f: E4, d: 0.12 }, { f: D4, d: 0.18 }] },
  enemyHit: { voice: { wave: 'square', volume: 0.07, slide: 0.5 }, notes: [{ f: E3, d: 0.15 }] },
  win: {
    voice: { wave: 'square', volume: 0.09 },
    notes: [
      { f: C5, d: 0.1 },
      { f: E5, d: 0.1 },
      { f: G5, d: 0.1 },
      { f: C6, d: 0.14 },
      { f: 0, d: 0.06 },
      { f: G5, d: 0.1 },
      { f: C6, d: 0.32 },
    ],
  },
  rescue: {
    voice: { wave: 'triangle', volume: 0.14 },
    notes: [
      { f: G4, d: 0.1 },
      { f: C5, d: 0.1 },
      { f: E5, d: 0.1 },
      { f: G5, d: 0.1 },
      { f: E5, d: 0.1 },
      { f: C6, d: 0.35 },
    ],
  },
  levelUp: {
    voice: { wave: 'square', volume: 0.08 },
    notes: [
      { f: C5, d: 0.08 },
      { f: D5, d: 0.08 },
      { f: E5, d: 0.08 },
      { f: G5, d: 0.08 },
      { f: A5, d: 0.08 },
      { f: C6, d: 0.3 },
    ],
  },
  chest: { voice: { wave: 'triangle', volume: 0.14 }, notes: [{ f: G4, d: 0.08 }, { f: B4, d: 0.08 }, { f: D5, d: 0.08 }, { f: G5, d: 0.3 }] },
  door: { voice: { wave: 'sawtooth', volume: 0.05, slide: 0.5 }, notes: [{ f: A3, d: 0.25 }, { f: F3, d: 0.35 }] },
  talk: { voice: { wave: 'square', volume: 0.03 }, notes: [{ f: A4n, d: 0.03 }] },
  quest: { voice: { wave: 'triangle', volume: 0.13 }, notes: [{ f: E5, d: 0.1 }, { f: C5, d: 0.1 }, { f: G5, d: 0.25 }] },
  step: { voice: { wave: 'triangle', volume: 0.02 }, notes: [{ f: C3, d: 0.03 }] },
};

/** Melodía en bucle: notas de la melodía y del bajo, con el mismo pulso. */
interface Tune {
  beat: number;
  lead: Voice;
  bass: Voice;
  melody: number[];
  bassline: number[];
}

export type TuneId = 'world' | 'battle' | 'boss' | 'story';

// 0 = silencio. Cada número es una corchea.
const TUNES: Record<TuneId, Tune> = {
  world: {
    beat: 0.24,
    lead: { wave: 'triangle', volume: 0.05 },
    bass: { wave: 'square', volume: 0.025 },
    melody: [E4, G4, C5, G4, A4n, G4, E4, 0, D4, E4, G4, E4, D4, C4, D4, 0, E4, G4, C5, D5, E5, D5, C5, A4n, G4, A4n, G4, E4, D4, E4, C4, 0],
    bassline: [C3, 0, G3, 0, C3, 0, G3, 0, G3, 0, D3, 0, G3, 0, D3, 0, A3, 0, E3, 0, F3, 0, C3, 0, G3, 0, D3, 0, C3, 0, G3, 0],
  },
  battle: {
    beat: 0.16,
    lead: { wave: 'square', volume: 0.035 },
    bass: { wave: 'triangle', volume: 0.06 },
    melody: [A4n, 0, C5, A4n, E5, 0, D5, C5, B4, 0, G4, B4, D5, 0, C5, B4, A4n, 0, C5, E5, A5, 0, G5, E5, D5, E5, D5, B4, A4n, 0, 0, 0],
    bassline: [A3, A3, 0, A3, A3, 0, A3, 0, G3, G3, 0, G3, G3, 0, G3, 0, F3, F3, 0, F3, F3, 0, F3, 0, E3, E3, 0, E3, E3, 0, E3, 0],
  },
  boss: {
    beat: 0.14,
    lead: { wave: 'sawtooth', volume: 0.03 },
    bass: { wave: 'square', volume: 0.04 },
    melody: [A4n, A4n, 0, A4n, C5, 0, B4, A4n, E4, 0, E4, 0, F4, 0, E4, 0, A4n, A4n, 0, A4n, C5, 0, D5, E5, D5, C5, B4, G4, A4n, 0, 0, 0],
    bassline: [A3 / 2, 0, A3 / 2, 0, A3 / 2, 0, A3 / 2, 0, F3 / 2, 0, F3 / 2, 0, E3 / 2, 0, E3 / 2, 0, A3 / 2, 0, A3 / 2, 0, D3, 0, D3, 0, E3 / 2, 0, E3 / 2, 0, A3 / 2, 0, 0, 0],
  },
  story: {
    beat: 0.32,
    lead: { wave: 'triangle', volume: 0.05 },
    bass: { wave: 'triangle', volume: 0.04 },
    melody: [C5, 0, E5, 0, G5, 0, E5, 0, F4 * 2, 0, A5, 0, G5, 0, 0, 0, E5, 0, D5, 0, C5, 0, D5, 0, E5, 0, D5, 0, C5, 0, 0, 0],
    bassline: [C3, 0, 0, 0, G3, 0, 0, 0, F3, 0, 0, 0, C3, 0, 0, 0, A3, 0, 0, 0, F3, 0, 0, 0, G3, 0, 0, 0, C3, 0, 0, 0],
  },
};

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let sfxOn = true;
let musicOn = true;
let currentTune: TuneId | undefined;
let musicTimer: number | undefined;
let nextBeatAt = 0;
let beatIndex = 0;

function audio(): AudioContext | undefined {
  if (ctx) return ctx;
  const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return undefined;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  } catch {
    ctx = undefined;
  }
  return ctx;
}

/** Arranca el sonido en el primer toque o tecla (antes, el navegador no deja). */
export function installAudioUnlock(): void {
  const unlock = (): void => {
    const c = audio();
    if (c && c.state === 'suspended') void c.resume();
    if (currentTune && musicOn) startScheduler();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export function setAudioPrefs(prefs: { sound: boolean; music: boolean }): void {
  sfxOn = prefs.sound;
  const wasOn = musicOn;
  musicOn = prefs.music;
  if (!musicOn) stopScheduler();
  else if (!wasOn && currentTune) startScheduler();
}

function tone(c: AudioContext, voice: Voice, freq: number, at: number, dur: number): void {
  if (!master || freq <= 0) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(freq, at);
  if (voice.slide && voice.slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * voice.slide, at + dur);
  // Envolvente corta: ataque rápido y caída suave, sin clics.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(voice.volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Toca un efecto. Sin sonido activado o sin Web Audio, no hace nada. */
export function sfx(id: SfxId): void {
  if (!sfxOn) return;
  const c = audio();
  if (!c || c.state !== 'running') return;
  const effect = EFFECTS[id];
  let at = c.currentTime + 0.005;
  for (const note of effect.notes) {
    tone(c, effect.voice, note.f, at, note.d);
    at += note.d;
  }
}

/** Cambia la música de fondo (o la para con `undefined`). */
export function playMusic(id: TuneId | undefined): void {
  if (id === currentTune) return;
  currentTune = id;
  beatIndex = 0;
  stopScheduler();
  if (id && musicOn) startScheduler();
}

function startScheduler(): void {
  const c = audio();
  if (!c || c.state !== 'running' || musicTimer !== undefined) return;
  nextBeatAt = c.currentTime + 0.1;
  // Programa las notas un poco por delante para que no se corte si el juego va lento.
  musicTimer = window.setInterval(() => {
    const tune = currentTune ? TUNES[currentTune] : undefined;
    if (!tune || !musicOn) return;
    while (nextBeatAt < c.currentTime + 0.3) {
      const i = beatIndex % tune.melody.length;
      const lead = tune.melody[i] ?? 0;
      const bass = tune.bassline[i % tune.bassline.length] ?? 0;
      tone(c, tune.lead, lead, nextBeatAt, tune.beat * 0.9);
      tone(c, tune.bass, bass, nextBeatAt, tune.beat * 0.8);
      nextBeatAt += tune.beat;
      beatIndex += 1;
    }
  }, 60);
}

function stopScheduler(): void {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
}

/** Para los tests: todos los efectos y melodías tienen notas válidas. */
export const SOUND_DATA = { EFFECTS, TUNES };
