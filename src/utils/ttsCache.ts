/**
 * Cache LRU pour les blobs audio TTS.
 * Évite de régénérer l'audio pour un même (text, voiceId).
 */

const MAX_ENTRIES = 20;

interface CacheEntry {
  blob: Blob;
}

/** Hash simple et rapide pour la clé de cache */
function hashKey(text: string, voiceId: string): string {
  const s = `${text}\0${voiceId}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return `${voiceId}:${h.toString(36)}`;
}

/** Map avec ordre d'insertion (LRU) */
const cache = new Map<string, CacheEntry>();

export function getCachedBlob(text: string, voiceId: string): Blob | null {
  const key = hashKey(text, voiceId);
  const entry = cache.get(key);
  if (!entry) return null;
  // Déplacer en fin (accès récent)
  cache.delete(key);
  cache.set(key, entry);
  return entry.blob;
}

export function setCachedBlob(text: string, voiceId: string, blob: Blob): void {
  const key = hashKey(text, voiceId);
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(key, { blob });
}
