"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { optimizedClasseurService } from "@/services/optimizedClasseurService";
import { simpleLogger as logger } from "@/utils/logger";
import type { Classeur } from "@/store/useFileSystemStore";

export function useDossiersPage(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeClasseurId, setActiveClasseurId] = useState<string | undefined>();
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  
  // 🔧 OPTIMISATION: Référence pour éviter les fuites mémoire
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  
  // 🔧 FIX: Utiliser des sélecteurs individuels pour éviter l'infinite loop
  const classeurs = useFileSystemStore((state) => state.classeurs);
  const setClasseurs = useFileSystemStore((state) => state.setClasseurs);
  
  // Mémoiser la conversion en array pour éviter les re-renders
  const classeursArray = useMemo(() => Object.values(classeurs), [classeurs]);
  
  // 🔍 Debug: Log quand le store change
  useEffect(() => {
    logger.dev(`[useDossiersPage] 🔍 Store mis à jour:`, {
      classeurs: Object.keys(classeurs).length,
      classeursIds: Object.keys(classeurs),
      classeursArray: classeursArray.length
    });
  }, [classeurs, classeursArray]);

  // 🔧 OPTIMISATION: Fonction de chargement avec gestion d'erreurs robuste
  const loadInitialData = useCallback(async (signal?: AbortSignal) => {
    if (!userId || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      logger.dev('[useDossiersPage] 🚀 Début chargement des données');
      
      const startTime = Date.now();
      
      try {
        const result = await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
        
        // 🔧 OPTIMISATION: Vérifier si l'opération a été annulée
        if (signal?.aborted) {
          logger.dev('[useDossiersPage] ⏹️ Chargement annulé');
          return;
        }
        
        const totalTime = Date.now() - startTime;
        
        logger.dev(`[useDossiersPage] ✅ Service optimisé: ${result.length} classeurs chargés en ${totalTime}ms`);
        
        // 🔍 Vérifier que les données sont bien dans le store
        const currentStoreState = useFileSystemStore.getState();
        if (Object.keys(currentStoreState.classeurs).length > 0) {
          logger.dev('[useDossiersPage] 🎯 Service optimisé fonctionne parfaitement !');
          logger.dev(`[useDossiersPage] 🔍 Store final:`, {
            classeurs: Object.keys(currentStoreState.classeurs).length,
            folders: Object.keys(currentStoreState.folders).length,
            notes: Object.keys(currentStoreState.notes).length
          });
          
          // 🔧 OPTIMISATION: Réinitialiser le compteur de retry en cas de succès
          setRetryCount(0);
        } else {
          logger.warn('[useDossiersPage] ⚠️ Service optimisé retourne des données mais store vide - PROBLÈME IDENTIFIÉ !');
          setError('Erreur: Les données ont été chargées mais ne sont pas disponibles dans l\'interface');
        }
        
      } catch (optimizedError) {
        // 🔧 OPTIMISATION: Vérifier si l'opération a été annulée
        if (signal?.aborted) {
          logger.dev('[useDossiersPage] ⏹️ Chargement annulé');
          return;
        }
        
        const totalTime = Date.now() - startTime;
        logger.error(`[useDossiersPage] ❌ Service optimisé échoué en ${totalTime}ms:`, optimizedError);
        
        // 🔍 Diagnostic détaillé de l'erreur
        if (optimizedError instanceof Error) {
          logger.error('[useDossiersPage] 🔍 Détails de l\'erreur:', {
            message: optimizedError.message,
            stack: optimizedError.stack?.substring(0, 500),
            name: optimizedError.name
          });
        }
        
        setError(`Erreur lors du chargement des classeurs: ${optimizedError instanceof Error ? optimizedError.message : 'Erreur inconnue'}`);
        
        // 🔧 OPTIMISATION: Incrémenter le compteur de retry
        setRetryCount(prev => prev + 1);
      }
      
    } catch (e) {
      // 🔧 OPTIMISATION: Vérifier si l'opération a été annulée
      if (signal?.aborted) {
        logger.dev('[useDossiersPage] ⏹️ Chargement annulé');
        return;
      }
      
      const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue lors du chargement';
      logger.error('[useDossiersPage] ❌ Erreur chargement:', e);
      setError(`Erreur lors du chargement des données: ${errorMessage}`);
      
      // 🔧 OPTIMISATION: Incrémenter le compteur de retry
      setRetryCount(prev => prev + 1);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [userId]);

  useEffect(() => {
    // 🔧 OPTIMISATION: Créer un nouveau contrôleur d'annulation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    loadInitialData(signal);
    
    // 🔧 OPTIMISATION: Nettoyage à la destruction du composant
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadInitialData]);
  
  // Auto-select the first classeur when available
  useEffect(() => {
    if (!activeClasseurId && classeursArray.length > 0) {
      setActiveClasseurId(classeursArray[0].id);
      setCurrentFolderId(undefined);
    }
  }, [classeursArray, activeClasseurId]);

  // 🔧 OPTIMISATION: Fonction de retry avec backoff exponentiel
  const retryWithBackoff = useCallback(async () => {
    if (retryCount >= 3) {
      setError('Nombre maximum de tentatives atteint. Veuillez recharger la page.');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 secondes
    
    logger.dev(`[useDossiersPage] 🔄 Retry dans ${delay}ms (tentative ${retryCount + 1}/3)`);
    
    setTimeout(() => {
      if (abortControllerRef.current) {
        loadInitialData(abortControllerRef.current.signal);
      }
    }, delay);
  }, [retryCount, loadInitialData]);

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

  // 🔧 OPTIMISATION: Fonction pour recharger les données avec gestion d'erreurs
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);
      
      // Invalider le cache pour forcer un rechargement
      optimizedClasseurService.invalidateCache(userId);
      
      if (abortControllerRef.current) {
        await loadInitialData(abortControllerRef.current.signal);
      }
    } catch (error) {
      console.error('Erreur rechargement données:', error);
      setError("Erreur lors du rechargement des données.");
    }
  }, [userId, loadInitialData]);

  // 🔧 OPTIMISATION: Fonction pour forcer un rechargement complet
  const forceReload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);
      
      // Vider complètement le cache
      optimizedClasseurService.clearAllCache();
      
      if (abortControllerRef.current) {
        await loadInitialData(abortControllerRef.current.signal);
      }
    } catch (error) {
      console.error('Erreur rechargement forcé:', error);
      setError("Erreur lors du rechargement forcé des données.");
    }
  }, [loadInitialData]);

  return {
    loading,
    error,
    classeurs: classeursArray, // 🔧 FIX: Retourner l'array mémoisé
    setClasseurs: setClasseurs,
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
    refreshData,
    forceReload, // 🔧 NOUVEAU: Rechargement forcé
    retryWithBackoff, // 🔧 NOUVEAU: Retry avec backoff
    retryCount, // 🔧 NOUVEAU: Compteur de tentatives
    canRetry: retryCount < 3 // 🔧 NOUVEAU: Indicateur de possibilité de retry
  };
} 