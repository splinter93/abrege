export const HISTORY_PREF_KEY = 'chat-max-history-messages';

export const HISTORY_DEFAULT = 40;
export const HISTORY_MIN = 20;
export const HISTORY_MAX = 80;

export const HISTORY_PRESETS = [
  { value: 20, label: 'Léger', description: '20 messages' },
  { value: 40, label: 'Équilibré', description: '40 messages (défaut)' },
  { value: 60, label: 'Détaillé', description: '60 messages' },
  { value: 80, label: 'Exhaustif', description: '80 messages' },
] as const;

/**
 * Lit la préférence de longueur d'historique depuis localStorage.
 * Retourne `HISTORY_DEFAULT` si non définie ou invalide.
 * Toujours appelé côté client uniquement.
 */
export function getMaxHistoryMessages(): number {
  if (typeof window === 'undefined') return HISTORY_DEFAULT;
  const saved = localStorage.getItem(HISTORY_PREF_KEY);
  if (!saved) return HISTORY_DEFAULT;
  const n = parseInt(saved, 10);
  if (isNaN(n)) return HISTORY_DEFAULT;
  return Math.min(HISTORY_MAX, Math.max(HISTORY_MIN, n));
}

export function setMaxHistoryMessages(value: number): void {
  const clamped = Math.min(HISTORY_MAX, Math.max(HISTORY_MIN, value));
  localStorage.setItem(HISTORY_PREF_KEY, String(clamped));
}
