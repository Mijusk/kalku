import type { Locale } from '@kalku/exercises';

/**
 * Envoltorio fino de speechSynthesis (voz del navegador). El texto que se
 * lee sale de `speakExercise` en @kalku/exercises; aquí solo se pronuncia.
 */

const LANG: Record<Locale, string> = { es: 'es-ES', ca: 'ca-ES' };

function synth(): SpeechSynthesis | undefined {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined;
}

function voiceFor(locale: Locale): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const lang = LANG[locale].toLowerCase();
  // Mejor la voz exacta (es-ES); si no, cualquier variante del idioma (es-MX).
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === lang) ??
    voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(`${locale}-`) || v.lang.toLowerCase() === locale)
  );
}

/** ¿Hay ahora mismo una voz en ese idioma? Las voces pueden cargar tarde: ver `onVoicesChanged`. */
export function hasVoice(locale: Locale): boolean {
  return voiceFor(locale) !== undefined;
}

/** Avisa cuando el navegador termina de cargar voces. Devuelve la función para dejar de escuchar. */
export function onVoicesChanged(callback: () => void): () => void {
  const s = synth();
  if (!s) return () => undefined;
  s.addEventListener('voiceschanged', callback);
  return () => s.removeEventListener('voiceschanged', callback);
}

/** Lee el texto, cortando lo que se estuviera leyendo. No hace nada si no hay voz. */
export function speak(text: string, locale: Locale): void {
  const s = synth();
  const voice = voiceFor(locale);
  if (!s || !voice) return;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG[locale];
  utterance.voice = voice;
  s.speak(utterance);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}
