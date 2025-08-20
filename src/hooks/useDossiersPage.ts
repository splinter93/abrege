"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { optimizedClasseurService } from "@/services/optimizedClasseurService";
import type { Classeur } from "@/store/useFileSystemStore";

export function useDossiersPage(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Correction: Lire le store directement et mémoiser le résultat
  const classeursStore = useFileSystemStore((state) => state.classeurs);
  const setClasseurs = useFileSystemStore((state) => state.setClasseurs);
  
  // Mémoiser la conversion en array pour éviter les re-renders
  const classeurs = useMemo(() => Object.values(classeursStore), [classeursStore]);

  const [activeClasseurId, setActiveClasseurId] = useState<string | undefined>();
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);
        
        // 🚀 Utiliser le service optimisé pour un chargement ultra-rapide
        await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
        
        // Le store Zustand sera automatiquement mis à jour par le service
        // Pas besoin de faire setClasseurs manuellement
        
      } catch (e) {
        setError("Erreur lors du chargement des données.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) {
      loadInitialData();
    }
  }, [userId]);
  
  // Auto-select the first classeur when available
  useEffect(() => {
    if (!activeClasseurId && classeurs.length > 0) {
      setActiveClasseurId(classeurs[0].id);
      setCurrentFolderId(undefined);
    }
  }, [classeurs, activeClasseurId]);

  const handleCreateClasseur = useCallback(async (name: string, emoji?: string) => {
    try {
      // TODO: Implémenter la création via le service optimisé
      // Pour l'instant, on recharge tout
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur création classeur:', error);
      throw error;
    }
  }, [userId]);

  const handleRenameClasseur = useCallback(async (id: string, newName: string) => {
    try {
      // TODO: Implémenter la modification via le service optimisé
      // Pour l'instant, on recharge tout
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur renommage classeur:', error);
      throw error;
    }
  }, [userId]);

  const handleDeleteClasseur = useCallback(async (id: string) => {
    try {
      // TODO: Implémenter la modification via le service optimisé
      // Pour l'instant, on recharge tout
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur suppression classeur:', error);
      throw error;
    }
  }, [userId]);

  const handleUpdateClasseur = useCallback(async (id: string, updates: Partial<Classeur>) => {
    try {
      // TODO: Implémenter la modification via le service optimisé
      // Pour l'instant, on recharge tout
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur modification classeur:', error);
      throw error;
    }
  }, [userId]);

  const handleUpdateClasseurPositions = useCallback(async (updatedClasseurs: Array<{ id: string; position: number }>) => {
    try {
      // TODO: Implémenter la modification des positions via le service optimisé
      // Pour l'instant, on recharge tout
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur modification positions classeurs:', error);
      throw error;
    }
  }, [userId]);

  const handleFolderOpen = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
  }, []);

  const handleGoToRoot = useCallback(() => {
    setCurrentFolderId(undefined);
  }, []);

  const handleGoToFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, []);

  // Calculer le chemin des dossiers
  const folderPath = useMemo(() => {
    if (!currentFolderId) return [];
    
    const path: any[] = [];
    let currentFolder = useFileSystemStore.getState().folders[currentFolderId];
    
    while (currentFolder) {
      path.unshift(currentFolder);
      if (currentFolder.parent_id) {
        currentFolder = useFileSystemStore.getState().folders[currentFolder.parent_id];
      } else {
        break;
      }
    }
    
    return path;
  }, [currentFolderId]);

  // Fonction pour recharger les données (utile pour les mises à jour)
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      // Invalider le cache pour forcer un rechargement
      optimizedClasseurService.invalidateCache(userId);
      await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
    } catch (error) {
      console.error('Erreur rechargement données:', error);
      setError("Erreur lors du rechargement des données.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    classeurs,
    setClasseurs,
    activeClasseurId,
    currentFolderId,
    setActiveClasseurId,
    setCurrentFolderId,
    handleCreateClasseur,
    handleRenameClasseur,
    handleDeleteClasseur,
    handleUpdateClasseur,
    handleUpdateClasseurPositions,
    handleFolderOpen,
    handleGoBack,
    handleGoToRoot,
    handleGoToFolder,
    folderPath,
    refreshData // Nouvelle fonction pour recharger les données
  };
} 