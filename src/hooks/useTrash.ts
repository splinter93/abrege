import { useState, useEffect, useCallback } from 'react';
import { TrashService } from '@/services/trashService';
import type { TrashItem, TrashStatistics } from '@/types/supabase';

interface UseTrashReturn {
  // État
  items: TrashItem[];
  statistics: TrashStatistics;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadItems: () => Promise<void>;
  restoreItem: (item: TrashItem) => Promise<void>;
  permanentlyDeleteItem: (item: TrashItem) => Promise<void>;
  emptyTrash: () => Promise<void>;
  purgeOldItems: () => Promise<void>;
  moveToTrash: (resourceType: 'note' | 'folder' | 'classeur' | 'file', resourceId: string) => Promise<void>;
  
  // Utilitaires
  clearError: () => void;
}

/**
 * Hook personnalisé pour la gestion de la corbeille
 * Centralise la logique de gestion de la corbeille avec gestion d'état
 */
export function useTrash(): UseTrashReturn {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [statistics, setStatistics] = useState<TrashStatistics>({
    total: 0,
    notes: 0,
    folders: 0,
    classeurs: 0,
    files: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge les éléments de la corbeille
   */
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TrashService.getTrashItems();
      setItems(data.items);
      setStatistics(data.statistics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur chargement corbeille:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restaure un élément de la corbeille
   */
  const restoreItem = useCallback(async (item: TrashItem) => {
    try {
      await TrashService.restoreItem(item.type, item.id);
      // Recharger la liste après restauration
      await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la restauration';
      setError(errorMessage);
      console.error('Erreur restauration:', err);
      throw err; // Re-throw pour permettre la gestion d'erreur dans le composant
    }
  }, [loadItems]);

  /**
   * Supprime définitivement un élément de la corbeille
   */
  const permanentlyDeleteItem = useCallback(async (item: TrashItem) => {
    try {
      await TrashService.permanentlyDeleteItem(item.type, item.id);
      // Recharger la liste après suppression
      await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMessage);
      console.error('Erreur suppression:', err);
      throw err; // Re-throw pour permettre la gestion d'erreur dans le composant
    }
  }, [loadItems]);

  /**
   * Vide complètement la corbeille
   */
  const emptyTrash = useCallback(async () => {
    try {
      await TrashService.emptyTrash();
      // Vider la liste locale
      setItems([]);
      setStatistics({
        total: 0,
        notes: 0,
        folders: 0,
        classeurs: 0,
        files: 0
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du vidage de la corbeille';
      setError(errorMessage);
      console.error('Erreur vidage corbeille:', err);
      throw err; // Re-throw pour permettre la gestion d'erreur dans le composant
    }
  }, []);

  /**
   * Purge automatique des éléments anciens
   */
  const purgeOldItems = useCallback(async () => {
    try {
      const result = await TrashService.purgeOldItems();
      // Recharger la liste après purge
      await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la purge';
      setError(errorMessage);
      console.error('Erreur purge:', err);
      throw err; // Re-throw pour permettre la gestion d'erreur dans le composant
    }
  }, [loadItems]);

  /**
   * Met un élément en corbeille
   */
  const moveToTrash = useCallback(async (resourceType: 'note' | 'folder' | 'classeur' | 'file', resourceId: string) => {
    try {
      await TrashService.moveToTrash(resourceType, resourceId);
      // Optionnel: recharger la liste si on est sur la page corbeille
      // await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise en corbeille';
      setError(errorMessage);
      console.error('Erreur mise en corbeille:', err);
      throw err; // Re-throw pour permettre la gestion d'erreur dans le composant
    }
  }, []);

  /**
   * Efface l'erreur actuelle
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Charger les données au montage du hook
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    // État
    items,
    statistics,
    loading,
    error,
    
    // Actions
    loadItems,
    restoreItem,
    permanentlyDeleteItem,
    emptyTrash,
    purgeOldItems,
    moveToTrash,
    
    // Utilitaires
    clearError
  };
}
