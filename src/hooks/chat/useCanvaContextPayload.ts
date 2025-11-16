'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { CanvaContextPayload, CanvaContextSession, CanvaSessionStatus } from '@/types/canvaContext';

interface RemoteCanvaSession {
  id: string;
  note_id: string;
  status: CanvaSessionStatus;
  title?: string;
  note?: {
    source_title?: string;
    slug?: string;
  };
}

interface UseCanvaContextOptions {
  chatSessionId: string | null;
  activeCanvaId: string | null;
  isCanvaPaneOpen: boolean;
  refreshIntervalMs?: number;
}

interface UseCanvaContextReturn {
  payload: CanvaContextPayload;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_INTERVAL = 15000;

export function useCanvaContextPayload({
  chatSessionId,
  activeCanvaId,
  isCanvaPaneOpen,
  refreshIntervalMs = DEFAULT_INTERVAL
}: UseCanvaContextOptions): UseCanvaContextReturn {
  const sessions = useCanvaStore((state) => state.sessions);
  const notesById = useFileSystemStore((state) => state.notes);

  const [remoteSessions, setRemoteSessions] = useState<RemoteCanvaSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchRemoteSessions = useCallback(async () => {
    if (!chatSessionId) {
      setRemoteSessions([]);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session authentifiée introuvable pour charger les canvases.');
      }

      // ✅ REST V2: GET /canva/sessions?chat_session_id=X
      const response = await fetch(`/api/v2/canva/sessions?chat_session_id=${chatSessionId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Client-Type': 'canva_context_hook'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API /canva/sessions?chat_session_id=${chatSessionId} a échoué (${response.status}): ${errorText}`);
      }

      const payload = await response.json();
      const remote = Array.isArray(payload?.canva_sessions) ? payload.canva_sessions : [];
      setRemoteSessions(remote);
      lastFetchRef.current = Date.now();
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [chatSessionId]);

  useEffect(() => {
    fetchRemoteSessions();

    if (!chatSessionId) {
      return;
    }

    const interval = setInterval(() => {
      fetchRemoteSessions();
    }, refreshIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [chatSessionId, fetchRemoteSessions, refreshIntervalMs]);

  const mapRemoteSession = useCallback(
    (session: RemoteCanvaSession): CanvaContextSession => {
      const noteFromStore = notesById[session.note_id];
      const noteTitle =
        session.note?.source_title ||
        noteFromStore?.source_title ||
        noteFromStore?.title ||
        session.title ||
        'Sans titre';

      return {
        canvaId: session.id,
        status: session.status,
        isActive: session.id === activeCanvaId,
        note: {
          id: session.note_id,
          slug: session.note?.slug || noteFromStore?.slug || null,
          title: noteTitle
        }
      };
    },
    [activeCanvaId, notesById]
  );

  const mapLocalSession = useCallback(
    (sessionId: string): CanvaContextSession | null => {
      const session = sessions[sessionId];
      if (!session) {
        return null;
      }

      const note = notesById[session.noteId];

      return {
        canvaId: session.id,
        status: 'open',
        isActive: session.id === activeCanvaId && isCanvaPaneOpen,
        note: {
          id: session.noteId,
          slug: note?.slug || null,
          title: note?.source_title || session.title
        }
      };
    },
    [sessions, notesById, activeCanvaId, isCanvaPaneOpen]
  );

  const normalizedSessions = useMemo(() => {
    const entries = new Map<string, CanvaContextSession>();

    remoteSessions.forEach((session) => {
      entries.set(session.id, mapRemoteSession(session));
    });

    Object.keys(sessions).forEach((sessionId) => {
      if (entries.has(sessionId)) {
        return;
      }
      const mapped = mapLocalSession(sessionId);
      if (mapped) {
        entries.set(sessionId, mapped);
      }
    });

    return Array.from(entries.values());
  }, [remoteSessions, sessions, mapRemoteSession, mapLocalSession]);

  const stats = useMemo(() => {
    return normalizedSessions.reduce(
      (acc, session) => {
        acc.total += 1;
        if (session.status === 'open') acc.open += 1;
        if (session.status === 'closed') acc.closed += 1;
        if (session.status === 'saved') acc.saved += 1;
        return acc;
      },
      { total: 0, open: 0, closed: 0, saved: 0 }
    );
  }, [normalizedSessions]);

  const activeEntry = useMemo(
    () => normalizedSessions.find((session) => session.isActive) || null,
    [normalizedSessions]
  );

  const payload: CanvaContextPayload = useMemo(
    () => ({
      session: {
        chatSessionId,
        activeCanvaId
      },
      activeNote: activeEntry,
      canvases: normalizedSessions,
      stats
    }),
    [activeCanvaId, activeEntry, chatSessionId, normalizedSessions, stats]
  );

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    await fetchRemoteSessions();
  }, [fetchRemoteSessions]);

  return {
    payload,
    isLoading,
    error,
    refresh
  };
}

