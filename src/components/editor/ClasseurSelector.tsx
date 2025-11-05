'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * ClasseurSelector - Dropdown pour sélectionner un classeur
 * 
 * Features:
 * - Liste tous les classeurs de l'utilisateur
 * - Affichage emoji + nom
 * - Auto-sélection du premier classeur
 * - Lightweight (juste id/name/emoji)
 * 
 * API:
 * - GET /api/v2/classeur (liste légère)
 * 
 * @module components/editor/ClasseurSelector
 */

interface ClasseurOption {
  id: string;
  slug: string;
  name: string;
  emoji?: string;
}

interface ClasseurSelectorProps {
  /** Classeur actuellement sélectionné */
  selectedClasseurId: string | null;
  /** Callback pour changement de classeur */
  onClasseurChange: (classeurId: string) => void;
}

export default function ClasseurSelector({
  selectedClasseurId,
  onClasseurChange
}: ClasseurSelectorProps) {
  
  const [classeurs, setClasseurs] = useState<ClasseurOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Charger la liste des classeurs (lightweight)
   * ✅ Charge UNE SEULE FOIS au montage
   */
  useEffect(() => {
    let isMounted = true;
    
    const loadClasseurs = async () => {
      try {
        setLoading(true);

        // Récupérer token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          logger.warn('[ClasseurSelector] ⚠️ Token non disponible');
          return;
        }

        logger.dev('[ClasseurSelector] 🔄 Chargement classeurs...');

        // GET /api/v2/classeurs (avec 's')
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

        if (!isMounted) return; // ✅ Éviter setState sur unmounted component

        if (result.success && Array.isArray(result.classeurs)) {
          // ✅ TypeScript strict: typer la réponse API
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

          // ✅ NE PAS auto-sélectionner (le parent passe déjà selectedClasseurId)
          // Le classeur est sélectionné via props (currentClasseurId de la note)
          
          logger.info('[ClasseurSelector] ✅ Classeurs chargés:', {
            count: classeursData.length,
            selectedClasseurId
          });
        }
      } catch (error) {
        if (isMounted) {
          logger.error('[ClasseurSelector] ❌ Erreur chargement classeurs:', error);
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
    // ✅ Deps vides = charge UNE SEULE FOIS au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler sélection d'un classeur
  const handleSelectClasseur = useCallback((classeurId: string) => {
    onClasseurChange(classeurId);
    setIsOpen(false);
  }, [onClasseurChange]);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="classeur-selector loading">
        <div className="classeur-selector-placeholder">
          Chargement...
        </div>
      </div>
    );
  }

  if (classeurs.length === 0) {
    return (
      <div className="classeur-selector empty">
        <div className="classeur-selector-placeholder">
          Aucun classeur
        </div>
      </div>
    );
  }

  // Trouver le classeur sélectionné
  const selectedClasseur = classeurs.find(c => c.id === selectedClasseurId);

  return (
    <div className="classeur-selector" ref={dropdownRef}>
      {/* Bouton principal */}
      <button
        type="button"
        className={`classeur-selector-button ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
      >
        <span className="classeur-selector-emoji">
          {selectedClasseur?.emoji || '📁'}
        </span>
        <span className="classeur-selector-name">
          {selectedClasseur?.name || 'Sélectionner un classeur'}
        </span>
        <ChevronDown 
          className={`classeur-selector-chevron ${isOpen ? 'rotate' : ''}`}
          size={16} 
        />
      </button>

      {/* Dropdown menu - Toujours dans le DOM pour transition */}
      <div className={`classeur-selector-dropdown ${isOpen ? 'open' : ''}`}>
        {classeurs.map(classeur => (
          <button
            key={classeur.id}
            type="button"
            className={`classeur-selector-option ${classeur.id === selectedClasseurId ? 'active' : ''}`}
            onClick={() => handleSelectClasseur(classeur.id)}
          >
            <span className="classeur-selector-option-emoji">
              {classeur.emoji || '📁'}
            </span>
            <span className="classeur-selector-option-name">
              {classeur.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

