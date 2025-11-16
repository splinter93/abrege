import type { ChatSessionsListResponse } from '@/types/chat';

/**
 * Petit cache en mémoire pour les sessions de chat
 * - Évite de spammer /api/ui/chat-sessions
 * - Déduplique les appels concurrents
 * - TTL court pour garder l'UI fraîche
 */

const SESSIONS_TTL_MS = 5000; // 5s : suffisant pour éviter le spam sans nuire à l'UX

let lastSessionsResult: ChatSessionsListResponse | null = null;
let lastFetchTime: number | null = null;
let inFlightPromise: Promise<ChatSessionsListResponse> | null = null;

export function shouldUseSessionsCache(): boolean {
  if (!lastSessionsResult || lastFetchTime === null) return false;
  const now = Date.now();
  return now - lastFetchTime < SESSIONS_TTL_MS;
}

export function getCachedSessions(): ChatSessionsListResponse | null {
  return shouldUseSessionsCache() ? lastSessionsResult : null;
}

export function setSessionsCache(result: ChatSessionsListResponse): void {
  lastSessionsResult = result;
  lastFetchTime = Date.now();
}

export function getInFlightSessionsPromise(): Promise<ChatSessionsListResponse> | null {
  return inFlightPromise;
}

export function setInFlightSessionsPromise(promise: Promise<ChatSessionsListResponse> | null): void {
  inFlightPromise = promise;
}


