/** Clé localStorage pour la préférence de timeout du stream chat. */
export const TIMEOUT_PREF_KEY = 'chat-stream-timeout-seconds';

/** Valeur par défaut : 600 s (10 min) — identique au hardcode initial. */
export const TIMEOUT_DEFAULT_S = 600;
/** Borne basse alignée sur le preset le plus court (2 min). */
export const TIMEOUT_MIN_S = 120;
/** 25 min — preset le plus long. */
export const TIMEOUT_MAX_S = 1500;

export const TIMEOUT_PRESETS = [
  { value: 120,  label: '2 minutes',  description: '2 min' },
  { value: 300,  label: '5 minutes',  description: '5 min' },
  { value: 600,  label: '10 minutes', description: '10 min (défaut)' },
  { value: 1500, label: '25 minutes', description: '25 min' },
] as const;

/** Lit la préférence depuis localStorage. Retourne `TIMEOUT_DEFAULT_S` si absente ou invalide. */
export function getStreamTimeoutSeconds(): number {
  if (typeof window === 'undefined') return TIMEOUT_DEFAULT_S;
  const saved = localStorage.getItem(TIMEOUT_PREF_KEY);
  if (!saved) return TIMEOUT_DEFAULT_S;
  const n = parseInt(saved, 10);
  if (isNaN(n)) return TIMEOUT_DEFAULT_S;
  return Math.min(TIMEOUT_MAX_S, Math.max(TIMEOUT_MIN_S, n));
}

/** Persiste la préférence dans localStorage (clamp dans [MIN, MAX]). */
export function setStreamTimeoutSeconds(value: number): void {
  const clamped = Math.min(TIMEOUT_MAX_S, Math.max(TIMEOUT_MIN_S, value));
  localStorage.setItem(TIMEOUT_PREF_KEY, String(clamped));
}
