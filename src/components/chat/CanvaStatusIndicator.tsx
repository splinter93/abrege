'use client';

import React from 'react';
import type { CanvaContextPayload } from '@/types/canvaContext';

function getStatusBadge(isCanvaOpen: boolean, hasSessions: boolean, hasActive: boolean) {
  if (isCanvaOpen && hasActive) {
    return { key: 'open', label: 'Canva ouvert', icon: '🟢' };
  }
  if (hasSessions) {
    return { key: 'idle', label: 'Canva détecté (fermé)', icon: '🟠' };
  }
  return { key: 'none', label: 'Aucun canva', icon: '⚪️' };
}

interface CanvaStatusIndicatorProps {
  payload: CanvaContextPayload;
  isLoading: boolean;
  error: string | null;
}

const CanvaStatusIndicator: React.FC<CanvaStatusIndicatorProps> = ({
  payload,
  isLoading,
  error
}) => {
  const hasSessions = payload.canvases.length > 0;
  const activeSession = payload.activeNote;
  const statusBadge = getStatusBadge(
    activeSession ? activeSession.status === 'open' : false,
    hasSessions,
    !!activeSession
  );

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
        <span>Canva liés: {payload.stats.total}</span>
        <span>
          Actif:{' '}
          {activeSession ? activeSession.note.title : 'aucun'}
        </span>
      </div>

      <div className="canva-status-indicator__sync">
        {isLoading ? 'Sync en cours…' : 'Sync OK'}
      </div>

      {error && (
        <div className="canva-status-indicator__error">
          ⚠️ {error}
        </div>
      )}

      {activeSession && (
        <div className="canva-status-indicator__note">
          <div
            className="canva-status-indicator__note-title"
            title={activeSession.note.title}
          >
            Note: {activeSession.note.title}
          </div>
          <div className="canva-status-indicator__note-meta">
            <span>ID note: {activeSession.note.id || '—'}</span>
            <span>Slug: {activeSession.note.slug || '—'}</span>
            <span>Statut: {activeSession.status}</span>
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

      {hasSessions && (
        <div className="canva-status-indicator__list">
          {payload.canvases.slice(0, 4).map((session) => (
            <div key={session.canvaId} className="canva-status-indicator__list-item">
              <span className="canva-status-indicator__list-title">
                {session.note.title}
                {session.isActive ? ' • actif' : ''}
              </span>
              <span className="canva-status-indicator__list-status">
                {session.status}
              </span>
            </div>
          ))}
          {payload.canvases.length > 4 && (
            <div className="canva-status-indicator__list-more">
              +{payload.canvases.length - 4} canva supplémentaires
            </div>
          )}
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

