'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FiFolder, FiX } from 'react-icons/fi';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import toast from 'react-hot-toast';
import './MoveToSelector.css';

/**
 * MoveToSelector - Dropdown pour déplacer une note vers un classeur
 * 
 * Features:
 * - Liste tous les classeurs de l'utilisateur
 * - Déplace la note vers le classeur sélectionné (root du classeur, folder_id = null)
 * - Feedback visuel et toast
 * - Gestion d'erreurs robuste
 * 
 * @module components/editor/MoveToSelector
 */

interface ClasseurOption {
  id: string;
  slug: string;
  name: string;
  emoji?: string;
}

interface MoveToSelectorProps {
  /** ID de la note à déplacer */
  noteId: string;
  /** Classeur actuel de la note */
  currentClasseurId: string | null;
  /** Callback quand le déplacement est terminé */
  onMoveComplete?: () => void;
  /** Callback pour fermer le sélecteur */
  onClose: () => void;
  /** Langue pour les traductions */
  lang: 'fr' | 'en';
}

export default function MoveToSelector({
  noteId,
  currentClasseurId,
  onMoveComplete,
  onClose,
  lang
}: MoveToSelectorProps) {
  const [classeurs, setClasseurs] = useState<ClasseurOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Charger la liste des classeurs
   */
  useEffect(() => {
    let isMounted = true;
    
    const loadClasseurs = async () => {
      try {
        setLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          logger.warn('[MoveToSelector] ⚠️ Token non disponible');
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        logger.dev('[MoveToSelector] 🔄 Chargement classeurs...');

        const response = await fetch('/api/v2/classeurs', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const result = await response.json();

        if (!isMounted) return;

        if (result.success && Array.isArray(result.classeurs)) {
          const classeursData: ClasseurOption[] = result.classeurs.map((c: {
            id: string;
            slug: string;
            name: string;
            emoji?: string;
          }) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            emoji: c.emoji
          }));

          setClasseurs(classeursData);

          logger.info('[MoveToSelector] ✅ Classeurs chargés:', {
            count: classeursData.length,
            currentClasseurId
          });
        }
      } catch (error) {
        if (isMounted) {
          logger.error('[MoveToSelector] ❌ Erreur chargement classeurs:', error);
          toast.error(
            lang === 'fr' 
              ? 'Erreur lors du chargement des classeurs' 
              : 'Error loading classeurs'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadClasseurs();

    return () => {
      isMounted = false;
    };
  }, [currentClasseurId, lang]);

  /**
   * Fermer le dropdown au clic extérieur
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  /**
   * Fermer avec Escape
   */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  /**
   * Déplacer la note vers le classeur sélectionné
   */
  const handleMoveToClasseur = useCallback(async (targetClasseurId: string) => {
    if (isMoving) return;

    // Vérifier si c'est le même classeur
    if (targetClasseurId === currentClasseurId) {
      toast.success(
        lang === 'fr' 
          ? 'La note est déjà dans ce classeur' 
          : 'Note is already in this classeur'
      );
      onClose();
      return;
    }

    try {
      setIsMoving(true);
      logger.info('[MoveToSelector] 🚀 Déplacement note vers classeur', {
        noteId,
        targetClasseurId,
        currentClasseurId
      });

      // Déplacer la note vers le root du classeur (folder_id = null)
      await v2UnifiedApi.moveNote(noteId, null, targetClasseurId);

      const targetClasseur = classeurs.find(c => c.id === targetClasseurId);
      const classeurName = targetClasseur?.name || targetClasseurId;

      logger.info('[MoveToSelector] ✅ Note déplacée avec succès', {
        noteId,
        targetClasseurId
      });

      toast.success(
        lang === 'fr' 
          ? `Note déplacée vers "${classeurName}"` 
          : `Note moved to "${classeurName}"`
      );

      onMoveComplete?.();
      onClose();
    } catch (error) {
      logger.error('[MoveToSelector] ❌ Erreur déplacement note', {
        error: error instanceof Error ? error.message : String(error),
        noteId,
        targetClasseurId
      });

      toast.error(
        lang === 'fr' 
          ? 'Erreur lors du déplacement de la note' 
          : 'Error moving note'
      );
    } finally {
      setIsMoving(false);
    }
  }, [noteId, currentClasseurId, classeurs, isMoving, onMoveComplete, onClose, lang]);

  if (!isOpen) return null;

  const translations = {
    fr: {
      title: 'Déplacer vers...',
      loading: 'Chargement...',
      noClasseurs: 'Aucun classeur disponible',
      moving: 'Déplacement...'
    },
    en: {
      title: 'Move to...',
      loading: 'Loading...',
      noClasseurs: 'No classeurs available',
      moving: 'Moving...'
    }
  } as const;

  const t = translations[lang];

  // Render dans un portal pour éviter les problèmes de z-index/CSS
  return ReactDOM.createPortal(
    <>
      {/* Overlay pour fermer en cliquant à l'extérieur */}
      <div className="move-to-selector-overlay" onClick={onClose} />
      
      <div className="move-to-selector" ref={dropdownRef}>
        <div className="move-to-selector-header">
          <h3 className="move-to-selector-title">
            <FiFolder size={18} />
            {t.title}
          </h3>
          <button
            type="button"
            className="move-to-selector-close"
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="move-to-selector-content">
          {loading ? (
            <div className="move-to-selector-loading">
              {t.loading}
            </div>
          ) : classeurs.length === 0 ? (
            <div className="move-to-selector-empty">
              {t.noClasseurs}
            </div>
          ) : (
            <div className="move-to-selector-list">
              {classeurs.map(classeur => {
                const isCurrent = classeur.id === currentClasseurId;
                const isProcessing = isMoving;

                return (
                  <button
                    key={classeur.id}
                    type="button"
                    className={`move-to-selector-option ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleMoveToClasseur(classeur.id)}
                    disabled={isProcessing || isCurrent}
                    aria-label={
                      lang === 'fr' 
                        ? `Déplacer vers ${classeur.name}` 
                        : `Move to ${classeur.name}`
                    }
                  >
                    <span className="move-to-selector-option-emoji">
                      {classeur.emoji || '📁'}
                    </span>
                    <span className="move-to-selector-option-name">
                      {classeur.name}
                    </span>
                    {isCurrent && (
                      <span className="move-to-selector-option-badge">
                        {lang === 'fr' ? 'Actuel' : 'Current'}
                      </span>
                    )}
                    {isProcessing && !isCurrent && (
                      <span className="move-to-selector-option-loading">
                        {t.moving}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

