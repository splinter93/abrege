'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { useChatStore } from '@/store/useChatStore';

type RemoteCanvaSession = {
  id: string;
  note_id: string;
  title: string;
  status: 'open' | 'closed' | 'saved' | 'deleted';
  created_at?: string;
};

function getStatusBadge(isCanvaOpen: boolean, hasSessions: boolean, hasActive: boolean) {
  if (isCanvaOpen && hasActive) {
    return { key: 'open', label: 'Canva ouvert', icon: '🟢' };
  }
  if (hasSessions) {
    return { key: 'idle', label: 'Canva détecté (fermé)', icon: '🟠' };
  }
  return { key: 'none', label: 'Aucun canva', icon: '⚪️' };
}

const CanvaStatusIndicator: React.FC = () => {
  const sessions = useCanvaStore((state) => state.sessions);
  const activeCanvaId = useCanvaStore((state) => state.activeCanvaId);
  const isCanvaOpen = useCanvaStore((state) => state.isCanvaOpen);
  const notesById = useFileSystemStore((state) => state.notes);
  const currentSessionId = useChatStore((state) => state.currentSession?.id || null);

  const [linkedCanvases, setLinkedCanvases] = useState<RemoteCanvaSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLinkedCanvases = useCallback(async () => {
    if (!currentSessionId) {
      setLinkedCanvases([]);
      setLastSyncedAt(null);
      setLoadError(null);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Auth session introuvable pour récupérer les canvases');
      }

      const response = await fetch(`/api/v2/canva/session/${currentSessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Client-Type': 'canva_status_indicator'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API /canva/session failed (${response.status}): ${errorText}`);
      }

      const payload = await response.json();
      const remote = Array.isArray(payload?.canva_sessions) ? payload.canva_sessions : [];
      setLinkedCanvases(remote);
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  useEffect(() => {
    loadLinkedCanvases();
    if (!currentSessionId) {
      return;
    }

    const interval = setInterval(() => {
      loadLinkedCanvases();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [currentSessionId, loadLinkedCanvases]);

  const canvaSessions = useMemo(
    () => (linkedCanvases.length > 0 ? linkedCanvases : Object.values(sessions)),
    [linkedCanvases, sessions]
  );

  const activeSession =
    (activeCanvaId &&
      (linkedCanvases.find((session) => session.id === activeCanvaId) ||
        sessions[activeCanvaId])) ||
    null;

  const activeNote =
    activeSession && 'note_id' in activeSession
      ? notesById[activeSession.note_id] || null
      : activeCanvaId
        ? notesById[sessions[activeCanvaId]?.noteId || ''] || null
        : null;

  const activeNoteTitle =
    activeSession && 'title' in activeSession
      ? activeSession.title
      : activeNote?.source_title || sessions[activeCanvaId || '']?.title || 'Sans titre';
  const activeNoteSlug = activeNote?.slug;
  const activeNoteId =
    activeSession && 'note_id' in activeSession
      ? activeSession.note_id
      : sessions[activeCanvaId || '']?.noteId;

  const hasSessions = canvaSessions.length > 0;
  const isActiveSessionOpen = activeSession
    ? 'status' in activeSession
      ? (activeSession as RemoteCanvaSession).status === 'open'
      : isCanvaOpen
    : false;
  const statusBadge = getStatusBadge(isActiveSessionOpen, hasSessions, !!activeSession);

  const remoteCount = linkedCanvases.length;
  const openCount = linkedCanvases.filter((canva) => canva.status === 'open').length;
  const closedCount = linkedCanvases.filter((canva) => canva.status === 'closed').length;
  const savedCount = linkedCanvases.filter((canva) => canva.status === 'saved').length;

  return (
    <div className="canva-status-indicator" aria-live="polite">
      <div className="canva-status-indicator__header">
        <span>Contexte Canva</span>
        <span className={`canva-status-badge canva-status-badge--${statusBadge.key}`}>
          <span className="canva-status-badge__icon" aria-hidden="true">
            {statusBadge.icon}
          </span>
          {statusBadge.label}
        </span>
      </div>

      <div className="canva-status-indicator__meta">
        <span>Sessions: {remoteCount > 0 ? remoteCount : canvaSessions.length}</span>
        <span>Open: {openCount}</span>
        <span>Closed: {closedCount}</span>
        <span>Saved: {savedCount}</span>
      </div>

      {lastSyncedAt && (
        <div className="canva-status-indicator__sync">
          {isLoading ? 'Rafraîchissement…' : `Sync ${new Date(lastSyncedAt).toLocaleTimeString('fr-FR')}`}
        </div>
      )}

      {loadError && (
        <div className="canva-status-indicator__error">
          ⚠️ Sync erreur: {loadError}
        </div>
      )}

      {activeSession && (
        <div className="canva-status-indicator__note">
          <div
            className="canva-status-indicator__note-title"
            title={activeNoteTitle}
          >
            Note: {activeNoteTitle}
          </div>
          <div className="canva-status-indicator__note-meta">
            <span>ID note: {activeNoteId || '—'}</span>
            <span>Slug: {activeNoteSlug || '—'}</span>
            <span>
              Statut:{' '}
              {'status' in (activeSession || {})
                ? (activeSession as RemoteCanvaSession).status
                : isCanvaOpen
                  ? 'open'
                  : 'local'}
            </span>
          </div>
        </div>
      )}

      {!activeSession && hasSessions && (
        <div className="canva-status-indicator__note">
          <div className="canva-status-indicator__note-title">
            Canva détecté mais non ouvert dans le chat.
          </div>
        </div>
      )}

      {!hasSessions && (
        <div className="canva-status-indicator__empty">
          Aucun canva lié à cette conversation pour l’instant.
        </div>
      )}
    </div>
  );
};

export default CanvaStatusIndicator;

