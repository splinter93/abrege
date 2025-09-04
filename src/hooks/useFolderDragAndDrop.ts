"use client";
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DropEventDetail } from '../components/types';
import { useFileSystemStore } from '@/store/useFileSystemStore';

import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { simpleLogger as logger } from '@/utils/logger';

interface UseFolderDragAndDropProps {
  classeurId: string;
  parentFolderId?: string;
  moveItem: (itemId: string, targetFolderId: string | null, itemType: 'folder' | 'file') => Promise<void>;
  refreshNow: () => void;
  setRefreshKey: (updater: (key: number) => number) => void;
  userId: string;
}

interface UseFolderDragAndDropReturn {
  isRootDropActive: boolean;
  handleDropItem: (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => void;
  handleRootDragOver: (e: React.DragEvent) => void;
  handleRootDragLeave: () => void;
  handleRootDrop: (e: React.DragEvent) => void;
}

/**
 * Hook pour gérer le drag & drop des dossiers et fichiers
 * Extrait toute la logique de drag & drop du FolderManager
 */
export const useFolderDragAndDrop = ({
  classeurId,
  parentFolderId,
  moveItem,
  refreshNow,
  setRefreshKey
}: UseFolderDragAndDropProps): UseFolderDragAndDropReturn => {
  const [isRootDropActive, setIsRootDropActive] = useState(false);

  // Handler d'imbrication DnD
  const handleDropItem = useCallback((itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => {
    if (itemType === 'folder' && itemId === targetFolderId) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Action empêchée : un dossier ne peut pas être imbriqué dans lui-même.');
      }
      return;
    }
    
    // Vérifier si le déplacement est nécessaire
    const store = useFileSystemStore.getState();
    let shouldMove = false;
    
    if (itemType === 'folder') {
      const folder = store.folders[itemId];
      shouldMove = folder && folder.parent_id !== targetFolderId;
    } else if (itemType === 'file') {
      const note = store.notes[itemId];
      shouldMove = note && note.folder_id !== targetFolderId;
    }
    
    // Ne déplacer que si nécessaire
    if (shouldMove) {
      moveItem(itemId, targetFolderId, itemType);
    }
  }, [moveItem]);

  // Handler drop sur la racine
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDropActive(true);
  }, []);

  const handleRootDragLeave = useCallback(() => {
    setIsRootDropActive(false);
  }, []);

  const handleRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDropActive(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id && data.type) {
        // Vérifier si l'élément est déjà à la racine pour éviter les déplacements inutiles
        const store = useFileSystemStore.getState();
        let shouldMove = false;
        
        if (data.type === 'folder') {
          const folder = store.folders[data.id];
          shouldMove = folder && folder.parent_id !== null;
        } else if (data.type === 'file') {
          const note = store.notes[data.id];
          shouldMove = note && note.folder_id !== null;
        }
        
        // Ne déplacer que si nécessaire
        if (shouldMove) {
          moveItem(data.id, null, data.type);
        }
        
        // Si on déplace le dossier courant, revenir à la racine (navigation gérée par le parent)
        if (data.type === 'folder' && data.id === parentFolderId) {
          // No-op here
        }
      }
    } catch {
      // ignore
    }
  }, [moveItem, parentFolderId]);

  // Handler drop sur un tab de classeur (autre ou courant)
  useEffect(() => {
    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent<DropEventDetail>;
      const { classeurId: targetClasseurId, itemId, itemType } = customEvent.detail || {};
      if (!targetClasseurId || !itemId || !itemType) return;

      toast.loading('Déplacement en cours...');

      try {
        if (targetClasseurId === classeurId) {
          // Drop sur le tab du classeur courant => move à la racine
          await moveItem(itemId, null, itemType);
          refreshNow();
        } else {
          // Cross-classeur: déplacer dans targetClasseurId et racine
          if (itemType === 'folder') {
            // Pour les dossiers, on peut maintenant changer le classeur
            await v2UnifiedApi.moveFolder(itemId, null, targetClasseurId);
          } else {
            // Pour les notes, on peut changer le classeur
            await v2UnifiedApi.moveNote(itemId, null, targetClasseurId);
          }
          // Pas besoin de modifier le store manuellement: V2UnifiedApi a déjà mis à jour Zustand
          // On force un refresh local pour que l'item disparaisse du classeur courant
          setRefreshKey((k) => k + 1);
        }
        toast.dismiss();
        toast.success('Déplacement terminé !');
      } catch (err) {
        toast.dismiss();
        toast.error('Erreur lors du déplacement.');
        if (process.env.NODE_ENV === 'development') {
          logger.error('[DnD] Déplacement ERROR', err);
        }
      }
    };

    window.addEventListener('drop-to-classeur', handler);
    return () => window.removeEventListener('drop-to-classeur', handler);
  }, [classeurId, moveItem, refreshNow, parentFolderId, setRefreshKey]);

  return {
    isRootDropActive,
    handleDropItem,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop
  };
}; 