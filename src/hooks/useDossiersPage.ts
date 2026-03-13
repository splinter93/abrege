"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { optimizedClasseurService } from "@/services/optimizedClasseurService";
import { DossierService } from "@/services/dossierService";
import { simpleLogger as logger } from "@/utils/logger";
import { triggerPollingAfterClasseurAction, triggerPollingAfterFolderAction, triggerPollingAfterNoteAction } from "@/services/uiActionPolling";
import type { Classeur, Folder } from "@/store/useFileSystemStore";

function readUrlParam(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

function syncUrlParams(classeurId?: string, folderId?: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (classeurId) {
    url.searchParams.set("classeur", classeurId);
  } else {
    url.searchParams.delete("classeur");
  }
  if (folderId) {
    url.searchParams.set("folder", folderId);
  } else {
    url.searchParams.delete("folder");
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

export function useDossiersPage(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeClasseurId, setActiveClasseurIdRaw] = useState<string | undefined>(
    () => readUrlParam("classeur")
  );
  const [currentFolderId, setCurrentFolderIdRaw] = useState<string | undefined>(
    () => readUrlParam("folder")
  );

  const setActiveClasseurId = useCallback((id: string | undefined) => {
    setActiveClasseurIdRaw(id);
    syncUrlParams(id, undefined);
  }, []);

  const setCurrentFolderId = useCallback((id: string | undefined) => {
    setCurrentFolderIdRaw(id);
    setActiveClasseurIdRaw((prev) => {
      syncUrlParams(prev, id);
      return prev;
    });
  }, []);
  
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
  
  // Auto-select first classeur if none active or URL references a deleted one
  useEffect(() => {
    if (classeursArray.length === 0) return;
    const isValid = activeClasseurId && classeursArray.some((c) => c.id === activeClasseurId);
    if (!isValid) {
      setActiveClasseurId(classeursArray[0].id);
      setCurrentFolderId(undefined);
    }
  }, [classeursArray, activeClasseurId, setActiveClasseurId, setCurrentFolderId]);

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

  // 🚀 IMPLÉMENTATION COMPLÈTE: Utiliser le DossierService
  const dossierService = DossierService.getInstance();

  const handleCreateClasseur = useCallback(async (name: string, emoji?: string) => {
    try {
      logger.dev('[useDossiersPage] 🚀 Création classeur via service:', { name, emoji });
      
      const newClasseur = await dossierService.createClasseur({
        name,
        emoji,
        description: `Classeur ${name}`
      }, userId);
      
      logger.dev('[useDossiersPage] ✅ Classeur créé avec succès:', newClasseur.id);
      
      // 🎯 Polling ciblé après création
      await triggerPollingAfterClasseurAction('classeur_created');
      
      return newClasseur;
    } catch (error) {
      logger.error('[useDossiersPage] ❌ Erreur création classeur:', error);
      throw error;
    }
  }, [userId, dossierService]);

  const handleRenameClasseur = useCallback(async (id: string, newName: string) => {
    try {
      logger.dev('[useDossiersPage] 🔄 Renommage classeur via service:', { id, newName });
      
      const updatedClasseur = await dossierService.updateClasseur(id, {
        name: newName
      }, userId);
      
      logger.dev('[useDossiersPage] ✅ Classeur renommé avec succès:', id);
      return updatedClasseur;
    } catch (error) {
      logger.error('[useDossiersPage] ❌ Erreur renommage classeur:', error);
      throw error;
    }
  }, [userId, dossierService]);

  const handleDeleteClasseur = useCallback(async (id: string) => {
    const store = useFileSystemStore.getState();
    const classeurToRestore = store.classeurs[id];
    const originalClasseurs = { ...store.classeurs };
    const originalFolders = { ...store.folders };
    const originalNotes = { ...store.notes };

    // 1. Mise à jour optimiste : retirer immédiatement du store
    logger.dev('[useDossiersPage] 🚀 Suppression optimiste du classeur:', id);
    const remainingFolders = Object.values(originalFolders).filter(
      (f) => f.classeur_id !== id
    );
    const remainingNotes = Object.values(originalNotes).filter(
      (n) => n.classeur_id !== id
    );
    store.removeClasseur(id);
    store.setFolders(remainingFolders);
    store.setNotes(remainingNotes);

    // Si on supprime le classeur actif, basculer sur un autre
    if (activeClasseurId === id) {
      const remaining = Object.values(originalClasseurs).filter((c) => c.id !== id);
      const nextId = remaining[0]?.id ?? undefined;
      setActiveClasseurId(nextId);
      setCurrentFolderId(undefined);
    }

    try {
      await dossierService.deleteClasseur(id, userId);
      logger.dev('[useDossiersPage] ✅ Classeur supprimé avec succès:', id);
    } catch (error) {
      logger.error('[useDossiersPage] ❌ Erreur suppression - rollback:', error);
      // Rollback : restaurer l'état précédent
      store.setClasseurs(Object.values(originalClasseurs));
      store.setFolders(Object.values(originalFolders));
      store.setNotes(Object.values(originalNotes));
      if (activeClasseurId === id && classeurToRestore) {
        setActiveClasseurId(id);
      }
      throw error;
    }
  }, [userId, dossierService, activeClasseurId, setActiveClasseurId, setCurrentFolderId]);

  const handleUpdateClasseur = useCallback(async (id: string, updates: Partial<Classeur>) => {
    try {
      logger.dev('[useDossiersPage] 🔄 Mise à jour classeur via service:', { id, updates });
      
      const updatedClasseur = await dossierService.updateClasseur(id, updates, userId);
      
      logger.dev('[useDossiersPage] ✅ Classeur mis à jour avec succès:', id);
      return updatedClasseur;
    } catch (error) {
      logger.error('[useDossiersPage] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }, [userId, dossierService]);

  const handleUpdateClasseurPositions = useCallback(async (reorderedClasseurs: Classeur[]) => {
    // 1. Sauvegarder l'état actuel pour un rollback en cas d'erreur
    const originalClasseurs = Object.values(useFileSystemStore.getState().classeurs);

    // 2. Mise à jour optimiste de l'UI via le store Zustand
    logger.dev('[useDossiersPage] 🚀 Mise à jour optimiste des positions');
    setClasseurs(reorderedClasseurs);

    try {
      // 3. Préparer les données et appeler l'API
      const positionsToUpdate = reorderedClasseurs.map((c, index) => ({ id: c.id, position: index }));
      logger.dev('[useDossiersPage] 🔄 Appel API pour mise à jour positions', positionsToUpdate);
      
      await dossierService.updateClasseurPositions(positionsToUpdate, userId);
      
      logger.dev('[useDossiersPage] ✅ Positions mises à jour avec succès (côté serveur)');
    } catch (error) {
      logger.error('[useDossiersPage] ❌ Erreur API - Rollback de la mise à jour optimiste', error);
      
      // 4. Rollback en cas d'erreur de l'API
      setClasseurs(originalClasseurs);
      
      // 5. Propager l'erreur pour affichage à l'utilisateur
      throw error;
    }
  }, [userId, dossierService, setClasseurs]);

  const handleFolderOpen = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, [setCurrentFolderId]);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
  }, [setCurrentFolderId]);

  const handleGoToRoot = useCallback(() => {
    setCurrentFolderId(undefined);
  }, [setCurrentFolderId]);

  const handleGoToFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, [setCurrentFolderId]);

  // Calculer le chemin des dossiers
  const folderPath = useMemo(() => {
    if (!currentFolderId) return [];
    
    const path: Folder[] = [];
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
      logger.error('[useDossiersPage] ❌ Erreur rechargement données:', error);
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
      logger.error('[useDossiersPage] ❌ Erreur rechargement forcé:', error);
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