'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paintbrush, Plus, FileText, Clock, Check, X } from 'lucide-react';
import type { CanvaSession } from '@/types/canva';
import './ChatCanvasDropdown.css';

interface ChatCanvasDropdownProps {
  chatSessionId: string | null;
  activeCanvaId: string | null;
  isCanvaOpen: boolean;
  onOpenNewCanva: () => void;
  onSelectCanva: (canvaId: string, noteId: string) => void;
  onCloseCanva: (canvaId: string) => void;
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

  // Fonction pour charger canvases (useCallback pour éviter re-renders)
  const loadCanvases = React.useCallback(async () => {
    if (!chatSessionId) return;

    try {
      // Ne pas afficher loading si refresh polling (éviter clignotement)
      if (canvases.length === 0) {
        setIsLoading(true);
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

      const response = await fetch(`/api/v2/canva/session/${chatSessionId}`, {
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
      
      // Log count pour debug
      if (process.env.NODE_ENV === 'development') {
        console.log('[ChatCanvasDropdown] Loaded canvases', {
          count: canva_sessions?.length || 0,
          chatSessionId,
          titles: canva_sessions?.map((c: any) => c.title)
        });
      }

    } catch (error) {
      console.error('[ChatCanvasDropdown] Failed to load canvases', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatSessionId, canvases.length]);

  // ✅ Charger canvases au mount (pour badge)
  useEffect(() => {
    if (!chatSessionId) return;
    loadCanvases();
  }, [chatSessionId]);

  // Polling rapide quand dropdown ouvert
  useEffect(() => {
    if (!isOpen || !chatSessionId) return;

    const interval = setInterval(loadCanvases, 2000);
    return () => clearInterval(interval);
  }, [isOpen, chatSessionId]);

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

  const handleCloseCanva = (e: React.MouseEvent, canvaId: string) => {
    e.stopPropagation();
    onCloseCanva(canvaId);
    // Recharger liste après fermeture
    setCanvases(prev => prev.filter(c => c.id !== canvaId));
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
        title={`Canvases (${canvasCount})`}
      >
        <Paintbrush size={18} />
        {showBadge && (
          <span className="chat-canvas-dropdown__badge">{canvasCount}</span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="chat-canvas-dropdown__menu">
          <div className="chat-canvas-dropdown__header">
            <FileText size={16} />
            <span>Canvases ({canvasCount})</span>
          </div>

          {/* Action nouvelle canva */}
          <button
            className="chat-canvas-dropdown__item chat-canvas-dropdown__item--new"
            onClick={handleNewCanva}
          >
            <Plus size={16} />
            <span>Nouveau canva</span>
          </button>

          {/* Séparateur si canvases existants */}
          {canvasCount > 0 && <div className="chat-canvas-dropdown__separator" />}

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
                  const statusIcon = canva.status === 'saved' ? <Check size={14} /> : <Clock size={14} />;
                  const statusLabel = {
                    open: 'Ouvert',
                    closed: 'Fermé',
                    saved: 'Sauvegardé',
                    deleted: 'Supprimé'
                  }[canva.status];

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
                        <div className="chat-canvas-dropdown__item-status">
                          {statusIcon}
                          <span>{statusLabel}</span>
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

