"use client";
import { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { simpleLogger as logger } from '@/utils/logger';
import { DRAG_DATA_TYPES, CUSTOM_EVENTS } from '@/constants/dragAndDropConfig';

interface DropEventDetail {
  classeurId: string;
  itemId: string;
  itemType: 'folder' | 'file';
}

interface UseCrossClasseurDragProps {
  classeurId: string;
  onRefresh?: () => void;
  onSetRefreshKey?: (updater: (key: number) => number) => void;
}

interface UseCrossClasseurDragReturn {
  handleDrop: (e: React.DragEvent, targetClasseurId: string) => void;
  handleDragOver: (e: React.DragEvent, targetClasseurId: string) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  setupCrossClasseurListener: () => void;
  cleanupCrossClasseurListener: () => void;
}

/**
 * Hook commun pour gérer le drag & drop cross-classeur
 * Centralise la logique de déplacement entre classeurs
 */
export const useCrossClasseurDrag = ({
  classeurId,
  onRefresh,
  onSetRefreshKey
}: UseCrossClasseurDragProps): UseCrossClasseurDragReturn => {

  /**
   * Gère le drop sur un classeur (cross-classeur ou même classeur)
   */
  const handleDrop = useCallback((e: React.DragEvent, targetClasseurId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[CrossClasseurDrag] 🎯 DROP EVENT sur classeur: ${targetClasseurId}`);
      logger.dev(`[CrossClasseurDrag] Types:`, e.dataTransfer.types);
    }
    
    // Vérifier que des données sont disponibles
    const hasJsonData = e.dataTransfer.types.includes(DRAG_DATA_TYPES.JSON);
    const hasItemId = e.dataTransfer.types.includes(DRAG_DATA_TYPES.ITEM_ID);
    
    if (!hasJsonData && !hasItemId) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[CrossClasseurDrag] Pas de données de drag valides');
      }
      return;
    }
    
    let itemId: string | null = null;
    let itemType: 'folder' | 'file' | null = null;
    
    // Essayer d'abord les données JSON (format préféré)
    if (hasJsonData) {
      try {
        const data = JSON.parse(e.dataTransfer.getData(DRAG_DATA_TYPES.JSON));
        if (data && data.id && data.type) {
          itemId = data.id;
          itemType = data.type;
          if (process.env.NODE_ENV === 'development') {
            logger.dev('[CrossClasseurDrag] Drop JSON data:', data);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('[CrossClasseurDrag] Erreur parsing JSON:', error);
        }
      }
    }
    
    // Fallback pour les données non-JSON (compatibilité)
    if (!itemId || !itemType) {
      const fallbackItemId = e.dataTransfer.getData(DRAG_DATA_TYPES.ITEM_ID);
      const fallbackItemType = e.dataTransfer.getData(DRAG_DATA_TYPES.ITEM_TYPE) as 'folder' | 'file';
      
      if (fallbackItemId && fallbackItemType) {
        itemId = fallbackItemId;
        itemType = fallbackItemType;
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[CrossClasseurDrag] Drop fallback data:', { itemId, itemType });
        }
      }
    }
    
    // Déclencher l'événement custom pour le drop sur classeur
    if (itemId && itemType) {
      const customEvent = new CustomEvent(CUSTOM_EVENTS.DROP_TO_CLASSEUR, {
        detail: { 
          classeurId: targetClasseurId, 
          itemId: itemId, 
          itemType: itemType 
        }
      });
      window.dispatchEvent(customEvent);
    } else {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[CrossClasseurDrag] Impossible de récupérer les données de drag');
      }
    }
  }, []);

  /**
   * Gère le drag over sur un classeur
   */
  const handleDragOver = useCallback((e: React.DragEvent, targetClasseurId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[CrossClasseurDrag] 🎯 DRAG OVER sur classeur: ${targetClasseurId}`);
    }
  }, []);

  /**
   * Gère le drag leave d'un classeur
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Vérifier si on quitte vraiment la zone du classeur
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Ajouter une marge de tolérance pour éviter les faux positifs
    const margin = 5;
    
    // Si on est encore dans la zone (avec marge), ne pas réinitialiser
    if (x >= rect.left - margin && x <= rect.right + margin && 
        y >= rect.top - margin && y <= rect.bottom + margin) {
      return;
    }
  }, []);

  /**
   * Configure l'écouteur d'événements cross-classeur
   */
  const setupCrossClasseurListener = useCallback(() => {
    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent<DropEventDetail>;
      const { classeurId: targetClasseurId, itemId, itemType } = customEvent.detail || {};
      if (!targetClasseurId || !itemId || !itemType) return;

      toast.loading('Déplacement en cours...');

      try {
        if (targetClasseurId === classeurId) {
          // Drop sur le tab du classeur courant => move à la racine
          // Cette logique sera gérée par le composant parent
          if (onRefresh) {
            onRefresh();
          }
        } else {
          // Cross-classeur: déplacer dans targetClasseurId et racine
          if (itemType === 'folder') {
            await v2UnifiedApi.moveFolder(itemId, null, targetClasseurId);
          } else {
            await v2UnifiedApi.moveNote(itemId, null, targetClasseurId);
          }
          
          // Forcer un refresh local pour que l'item disparaisse du classeur courant
          if (onSetRefreshKey) {
            onSetRefreshKey((k) => k + 1);
          }
        }
        toast.dismiss();
        toast.success('Déplacement terminé !');
      } catch (err) {
        toast.dismiss();
        toast.error('Erreur lors du déplacement.');
        if (process.env.NODE_ENV === 'development') {
          logger.error('[CrossClasseurDrag] Déplacement ERROR', err);
        }
      }
    };

    window.addEventListener(CUSTOM_EVENTS.DROP_TO_CLASSEUR, handler);
    return handler;
  }, [classeurId, onRefresh, onSetRefreshKey]);

  /**
   * Nettoie l'écouteur d'événements cross-classeur
   */
  const cleanupCrossClasseurListener = useCallback(() => {
    // La fonction de cleanup sera appelée automatiquement par useEffect
  }, []);

  return {
    handleDrop,
    handleDragOver,
    handleDragLeave,
    setupCrossClasseurListener,
    cleanupCrossClasseurListener
  };
};
