import type { Locale } from '@kalku/exercises';

/** Apodos propuestos (una palabra, nada que parezca un nombre real), en los dos idiomas. */
export const NICKNAMES: readonly Record<Locale, string>[] = [
  { es: 'Zorro', ca: 'Guineu' },
  { es: 'Estrella', ca: 'Estrella' },
  { es: 'Cohete', ca: 'Coet' },
  { es: 'Nube', ca: 'Núvol' },
  { es: 'Dragón', ca: 'Drac' },
  { es: 'Pirata', ca: 'Pirata' },
  { es: 'Luna', ca: 'Lluna' },
  { es: 'Trueno', ca: 'Tro' },
];

export const NICKNAME_MAX = 30;

export interface NicknameCheck {
  ok: boolean;
  /** Apodo ya recortado de espacios, listo para guardar. */
  nickname: string;
  /** Dos o más palabras: puede ser un nombre real. Solo se avisa; no se bloquea. */
  looksLikeName: boolean;
}

export function checkNickname(raw: string): NicknameCheck {
  const nickname = raw.trim().replace(/\s+/g, ' ');
  const length = [...nickname].length;
  return {
    ok: length >= 1 && length <= NICKNAME_MAX,
    nickname,
    looksLikeName: nickname.split(' ').length >= 2,
  };
}
