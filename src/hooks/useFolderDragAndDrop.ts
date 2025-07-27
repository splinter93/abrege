import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { updateFolder } from '../services/supabase';
import { moveNoteREST } from '../services/api';
import { DropEventDetail } from '../components/types';

interface UseFolderDragAndDropProps {
  classeurId: string;
  parentFolderId?: string;
  moveItem: (itemId: string, targetFolderId: string | null, itemType: 'folder' | 'file') => Promise<void>;
  refreshNow: () => void;
  setRefreshKey: (updater: (key: number) => number) => void;
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
      console.warn('Action empêchée : un dossier ne peut pas être imbriqué dans lui-même.');
      return;
    }
    moveItem(itemId, targetFolderId, itemType);
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
        moveItem(data.id, null, data.type);
        // Si on déplace le dossier courant, revenir à la racine
        if (data.type === 'folder' && data.id === parentFolderId) {
          // Navigation gérée par le parent
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
      
      if (targetClasseurId === classeurId) {
        // Si on drop sur le tab du classeur courant, ramener à la racine
        await moveItem(itemId, null, itemType);
        refreshNow();
        toast.dismiss();
        toast.success('Déplacement terminé !');
      } else {
        // Sinon, changer de classeur ET ramener à la racine
        if (itemType === 'folder') {
          try {
            await updateFolder(itemId, { classeur_id: targetClasseurId, parent_id: null });
            refreshNow();
            toast.dismiss();
            toast.success('Déplacement terminé !');
          } catch (err) {
            toast.dismiss();
            toast.error('Erreur lors du déplacement du dossier.');
            console.error('[DnD] updateFolder ERROR', err);
          }
        } else {
          try {
            await moveNoteREST(itemId, { target_classeur_id: targetClasseurId, target_folder_id: null });
            refreshNow();
            toast.dismiss();
            toast.success('Déplacement terminé !');
          } catch (err) {
            toast.dismiss();
            toast.error('Erreur lors du déplacement de la note.');
            console.error('[DnD] moveNoteREST ERROR', err);
          }
        }
        // Rafraîchir la vue du classeur courant pour que l'item disparaisse
        setRefreshKey(k => k + 1);
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