'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PenSquare, Plus, X } from 'lucide-react';
import type { CanvaSession } from '@/types/canva';
import { useCanvaRealtime } from '@/hooks/chat/useCanvaRealtime';
import { useCanvaStore } from '@/store/useCanvaStore';
import { logger, LogCategory } from '@/utils/logger';
import './ChatCanvasDropdown.css';

interface ChatCanvasDropdownProps {
  chatSessionId: string | null;
  activeCanvaId: string | null;
  isCanvaOpen: boolean;
  onOpenNewCanva: () => void;
  onSelectCanva: (canvaId: string, noteId: string) => void;
  onCloseCanva: (canvaId: string, options?: { delete?: boolean }) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * 🎨 Dropdown Canvases - Bouton header avec badge + liste déroulante
 * 
 * UX inspirée notifications:
 * - Badge avec nombre de canvases
 * - Dropdown au clic avec liste
 * - Action rapide "Nouveau canva"
 */
export function ChatCanvasDropdown({
  chatSessionId,
  activeCanvaId,
  isCanvaOpen,
  onOpenNewCanva,
  onSelectCanva,
  onCloseCanva,
  disabled = false
}: ChatCanvasDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canvases, setCanvases] = useState<CanvaSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // ✅ Supabase Realtime : Sync automatique des canvases
  useCanvaRealtime(chatSessionId, true);

  // ✅ Écouter les changements du store pour recharger la liste
  const storeSessions = useCanvaStore(s => s.sessions);
  const storeSessionsCount = Object.keys(storeSessions).length;

  // Fonction pour charger canvases (useCallback pour éviter re-renders)
  const loadCanvases = React.useCallback(async () => {
    if (!chatSessionId) return;

    try {
      // Ne pas afficher loading si refresh polling (éviter clignotement)
      if (isFirstLoadRef.current) {
        setIsLoading(true);
        isFirstLoadRef.current = false;
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No auth session');
      }

      // ✅ REST V2: GET /canva/sessions?chat_session_id=X
      const response = await fetch(`/api/v2/canva/sessions?chat_session_id=${chatSessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Client-Type': 'canva_dropdown'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const { canva_sessions } = await response.json();
      setCanvases(canva_sessions || []);
      
      logger.debug(LogCategory.EDITOR, '[ChatCanvasDropdown] Loaded canvases', {
        count: canva_sessions?.length || 0,
        chatSessionId,
        titles: canva_sessions?.map((c: CanvaSession) => c.title)
      });

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[ChatCanvasDropdown] Failed to load canvases', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatSessionId]);

  // ✅ Charger canvases au mount (pour badge)
  useEffect(() => {
    if (!chatSessionId) return;
    isFirstLoadRef.current = true; // Reset pour nouvelle session
    loadCanvases();
  }, [chatSessionId, loadCanvases]);

  // ✅ Recharger la liste quand le store change (Realtime)
  // Le store est mis à jour par useCanvaRealtime, on recharge depuis l'API
  const prevStoreSessionsCountRef = useRef(storeSessionsCount);
  useEffect(() => {
    if (!chatSessionId) return;
    
    // Recharger seulement si le nombre de sessions dans le store a changé
    if (storeSessionsCount !== prevStoreSessionsCountRef.current) {
      prevStoreSessionsCountRef.current = storeSessionsCount;
      // Délai court pour laisser le temps au store de se synchroniser
      const timeoutId = setTimeout(() => {
        loadCanvases();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [storeSessionsCount, chatSessionId, loadCanvases]);

  // ✅ Écouter les événements Realtime pour recharger la liste
  useEffect(() => {
    if (!chatSessionId) return;

    const handleCanvaCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{ canvaId: string; chatSessionId: string }>;
      // Vérifier que l'événement concerne cette session chat
      if (customEvent.detail.chatSessionId === chatSessionId) {
        // Délai court pour laisser le temps à la DB de se synchroniser
        setTimeout(() => {
          loadCanvases();
        }, 500);
      }
    };

    const handleCanvaDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ canvaId: string; chatSessionId: string }>;
      // Vérifier que l'événement concerne cette session chat
      if (customEvent.detail.chatSessionId === chatSessionId) {
        // Recharger immédiatement (la suppression est instantanée)
        loadCanvases();
      }
    };

    const handleCanvaUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ canvaId: string; chatSessionId: string }>;
      // Vérifier que l'événement concerne cette session chat
      if (customEvent.detail.chatSessionId === chatSessionId) {
        // Recharger pour mettre à jour le titre
        loadCanvases();
      }
    };

    window.addEventListener('canva-session-created', handleCanvaCreated);
    window.addEventListener('canva-session-deleted', handleCanvaDeleted);
    window.addEventListener('canva-session-updated', handleCanvaUpdated);

    return () => {
      window.removeEventListener('canva-session-created', handleCanvaCreated);
      window.removeEventListener('canva-session-deleted', handleCanvaDeleted);
      window.removeEventListener('canva-session-updated', handleCanvaUpdated);
    };
  }, [chatSessionId, loadCanvases]);

  // Polling rapide quand dropdown ouvert
  // ✅ Polling moins agressif grâce à Realtime (10s au lieu de 2s)
  useEffect(() => {
    if (!isOpen || !chatSessionId) return;

    const interval = setInterval(loadCanvases, 10000); // 10s au lieu de 2s
    return () => clearInterval(interval);
  }, [isOpen, chatSessionId, loadCanvases]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    
    // ✅ Toujours ouvrir dropdown (comportement notification)
    setIsOpen(!isOpen);
  };

  const handleNewCanva = () => {
    setIsOpen(false);
    onOpenNewCanva();
  };

  const handleSelectCanva = (canvaId: string, noteId: string) => {
    setIsOpen(false);
    onSelectCanva(canvaId, noteId);
  };

  const handleCloseCanva = async (e: React.MouseEvent, canvaId: string) => {
    e.stopPropagation();
    // ✅ Supprimer complètement le canevas (DELETE via API)
    try {
      await onCloseCanva(canvaId, { delete: true });
      // La liste sera automatiquement mise à jour via Realtime
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[ChatCanvasDropdown] Failed to delete canva', {
        canvaId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Nombre total de canvases (sauf deleted)
  const canvasCount = canvases.filter(c => c.status !== 'deleted').length;
  const showBadge = canvasCount > 0;

  return (
    <div className="chat-canvas-dropdown" ref={dropdownRef}>
      {/* Bouton avec badge */}
      <button
        className={`chat-canvas-dropdown__button ${isCanvaOpen ? 'chat-canvas-dropdown__button--active' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        title={`Drafts (${canvasCount})`}
      >
        <PenSquare size={18} />
        {showBadge && (
          <span className="chat-canvas-dropdown__badge">{canvasCount}</span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="chat-canvas-dropdown__menu">
          <div className="chat-canvas-dropdown__header">
            <PenSquare size={16} />
            <span>Drafts ({canvasCount})</span>
          </div>

          {/* Action nouveau draft */}
          <button
            className="chat-canvas-dropdown__item chat-canvas-dropdown__item--new"
            onClick={handleNewCanva}
          >
            <Plus size={16} />
            <span>Nouveau draft</span>
          </button>

          {/* Liste canvases */}
          {isLoading ? (
            <div className="chat-canvas-dropdown__empty">Chargement...</div>
          ) : canvasCount === 0 ? (
            <div className="chat-canvas-dropdown__empty">Aucun canva pour cette session</div>
          ) : (
            <div className="chat-canvas-dropdown__list">
              {canvases
                .filter(c => c.status !== 'deleted')
                .map((canva) => {
                  const isActive = canva.id === activeCanvaId;
                  return (
                    <div
                      key={canva.id}
                      className={`chat-canvas-dropdown__item ${isActive ? 'chat-canvas-dropdown__item--active' : ''}`}
                      onClick={() => !isActive && handleSelectCanva(canva.id, canva.note_id)}
                    >
                      <div className="chat-canvas-dropdown__item-content">
                        <div className="chat-canvas-dropdown__item-title">
                          {canva.title}
                        </div>
                      </div>

                      <button
                        className="chat-canvas-dropdown__item-close"
                        onClick={(e) => handleCloseCanva(e, canva.id)}
                        title="Fermer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

