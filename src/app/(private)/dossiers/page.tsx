'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FolderManager from '@/components/FolderManager';
import ClasseurTabs from '@/components/ClasseurTabs';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { Folder } from '@/components/types';
import { simpleLogger as logger } from '@/utils/logger';
import { optimizedApi } from '@/services/optimizedApi';

export default function DossiersPage() {
  const router = useRouter();
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Récupérer les données depuis le store
  const folders = useFileSystemStore(state => state.folders);
  const classeurs = useFileSystemStore(state => state.classeurs);
  const notes = useFileSystemStore(state => state.notes);
  const setActiveClasseurIdStore = useFileSystemStore(state => state.setActiveClasseurId);
  const setClasseurs = useFileSystemStore(state => state.setClasseurs);
  const setFolders = useFileSystemStore(state => state.setFolders);
  const setNotes = useFileSystemStore(state => state.setNotes);

  // Convertir en arrays de manière stable
  const foldersArray = React.useMemo(() => Object.values(folders), [folders]);
  const classeursArray = React.useMemo(() => Object.values(classeurs), [classeurs]);
  const notesArray = React.useMemo(() => Object.values(notes), [notes]);

  // Sélectionner le premier classeur par défaut
  useEffect(() => {
    if (classeursArray.length > 0 && !activeClasseurId) {
      const firstClasseur = classeursArray[0];
      setActiveClasseurId(firstClasseur.id);
      setActiveClasseurIdStore(firstClasseur.id);
      logger.dev('[DossiersPage] 🎯 Premier classeur sélectionné:', firstClasseur.name, firstClasseur.id);
    }
  }, [classeursArray, activeClasseurId, setActiveClasseurIdStore]);

  // Debug: Vérifier l'état du store
  React.useEffect(() => {
    logger.dev('[DossiersPage] 🔍 État du store:', {
      classeursCount: classeursArray.length,
      foldersCount: foldersArray.length,
      notesCount: notesArray.length,
      activeClasseurId,
      currentFolderId,
      classeurs: classeursArray.map(c => ({ id: c.id, name: c.name })),
      folders: foldersArray.map(f => ({ id: f.id, name: f.name, classeur_id: f.classeur_id, parent_id: f.parent_id })),
      notes: notesArray.map(n => ({ id: n.id, title: n.source_title, classeur_id: n.classeur_id, folder_id: n.folder_id }))
    });

    // Debug: Vérifier la correspondance classeur_id
    if (activeClasseurId && foldersArray.length > 0) {
      const matchingFolders = foldersArray.filter(f => f.classeur_id === activeClasseurId);
      const matchingNotes = notesArray.filter(n => n.classeur_id === activeClasseurId);
      
      logger.dev('[DossiersPage] 🔍 Correspondance classeur_id:', {
        activeClasseurId,
        totalFolders: foldersArray.length,
        matchingFolders: matchingFolders.length,
        totalNotes: notesArray.length,
        matchingNotes: matchingNotes.length,
        allClasseurIds: [...new Set(foldersArray.map(f => f.classeur_id))],
        allNoteClasseurIds: [...new Set(notesArray.map(n => n.classeur_id))]
      });
    }
  }, [classeursArray.length, foldersArray.length, notesArray.length, activeClasseurId, currentFolderId, classeursArray, foldersArray, notesArray]);

  // Charger les données initiales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        logger.dev('[DossiersPage] 🚀 Chargement des données via OptimizedApi...');

        // Utiliser l'optimizedApi pour charger tous les classeurs avec leur contenu
        await optimizedApi.loadClasseursWithContent();

        setIsLoading(false);
        logger.dev('[DossiersPage] ✅ Données chargées avec succès via OptimizedApi');
      } catch (error) {
        logger.error('[DossiersPage] ❌ Erreur chargement via OptimizedApi:', error);
        setError('Erreur lors du chargement des données');
        setIsLoading(false);
      }
    };

    // Charger seulement si le store est vide
    if (classeursArray.length === 0) {
      loadInitialData();
    } else {
      setIsLoading(false);
    }
  }, [classeursArray.length]);

  // Filtrer les dossiers et notes pour le classeur actif
  const filteredFolders = React.useMemo(() => {
    if (!activeClasseurId) {
      logger.dev('[DossiersPage] ⚠️ Pas de classeur actif pour filtrer les dossiers');
      return [];
    }
    
    const filtered = foldersArray.filter(f => {
      // Filtre par classeur
      if (f.classeur_id !== activeClasseurId) return false;
      
      // Filtre par parent_id pour navigation imbriquée
      if (currentFolderId === undefined) {
        // À la racine : afficher seulement les dossiers sans parent
        return f.parent_id === null;
      } else {
        // Dans un dossier : afficher seulement les sous-dossiers du dossier courant
        return f.parent_id === currentFolderId;
      }
    });

    logger.dev('[DossiersPage] 🔍 Filtrage dossiers:', {
      totalFolders: foldersArray.length,
      activeClasseurId,
      currentFolderId,
      filteredCount: filtered.length,
      filtered: filtered.map(f => ({ id: f.id, name: f.name, classeur_id: f.classeur_id, parent_id: f.parent_id }))
    });

    return filtered;
  }, [foldersArray, activeClasseurId, currentFolderId]);

  const filteredNotes = React.useMemo(() => {
    if (!activeClasseurId) {
      logger.dev('[DossiersPage] ⚠️ Pas de classeur actif pour filtrer les notes');
      return [];
    }
    
    const filtered = notesArray.filter(n => {
      // Filtre par classeur
      if (n.classeur_id !== activeClasseurId) return false;
      
      // Filtre par folder_id pour navigation imbriquée
      if (currentFolderId === undefined) {
        // À la racine : afficher seulement les notes sans dossier
        return n.folder_id === null;
      } else {
        // Dans un dossier : afficher seulement les notes du dossier courant
        return n.folder_id === currentFolderId;
      }
    });

    logger.dev('[DossiersPage] 🔍 Filtrage notes:', {
      totalNotes: notesArray.length,
      activeClasseurId,
      currentFolderId,
      filteredCount: filtered.length,
      filtered: filtered.map(n => ({ id: n.id, title: n.source_title, classeur_id: n.classeur_id, folder_id: n.folder_id }))
    });

    return filtered;
  }, [notesArray, activeClasseurId, currentFolderId]);

  // Éviter les rendus inutiles quand il n'y a pas de données
  if (isLoading) {
    return (
      <div className="dossiers-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Chargement des dossiers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dossiers-error">
        <div className="error-content">
          <h2>Erreur de chargement</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!activeClasseurId || classeursArray.length === 0) {
    return (
      <div className="dossiers-empty">
        <div className="empty-content">
          <h2>Aucun classeur disponible</h2>
          <p>Créez votre premier classeur pour commencer</p>
        </div>
      </div>
    );
  }

  // Handler pour ouvrir un dossier
  const handleFolderOpen = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    logger.dev('[DossiersPage] 📁 Ouverture dossier:', folder.name);
  };

  // Handler pour revenir en arrière
  const handleGoBack = () => {
    setCurrentFolderId(undefined);
    logger.dev('[DossiersPage] ◀ Retour à la racine');
  };

  // Handler pour changer de classeur
  const handleSelectClasseur = (classeurId: string) => {
    setActiveClasseurId(classeurId);
    setActiveClasseurIdStore(classeurId);
    setCurrentFolderId(undefined); // Retour à la racine du nouveau classeur
    logger.dev('[DossiersPage] 🔄 Changement classeur:', classeurId);
    
    // L'optimizedApi a déjà chargé tout le contenu, pas besoin de recharger
  };

  // Handler pour créer un nouveau classeur
  const handleCreateClasseur = () => {
    logger.dev('[DossiersPage] ➕ Création nouveau classeur');
    // TODO: Implémenter la création de classeur
  };

  // Handlers pour ClasseurTabs
  const handleSetClasseurs = (newClasseurs: any[]) => {
    logger.dev('[DossiersPage] 🔄 Mise à jour classeurs');
    // TODO: Implémenter la mise à jour des classeurs
  };

  const handleRenameClasseur = (id: string, name: string) => {
    logger.dev('[DossiersPage] ✏️ Renommage classeur:', id, name);
    // TODO: Implémenter le renommage
  };

  const handleDeleteClasseur = (id: string) => {
    logger.dev('[DossiersPage] 🗑️ Suppression classeur:', id);
    // TODO: Implémenter la suppression
  };

  const handleUpdateClasseur = (id: string, data: any) => {
    logger.dev('[DossiersPage] 🔄 Mise à jour classeur:', id, data);
    // TODO: Implémenter la mise à jour
  };

  const handleUpdateClasseurPositions = (positions: { id: string; position: number }[]) => {
    logger.dev('[DossiersPage] 📐 Mise à jour positions:', positions);
    // TODO: Implémenter la mise à jour des positions
  };

  const activeClasseur = classeursArray.find(c => c.id === activeClasseurId);

  return (
    <div className="dossiers-page">
      {/* Header avec onglets des classeurs */}
      <div className="dossiers-header">
        <ClasseurTabs
          classeurs={classeursArray}
          setClasseurs={handleSetClasseurs}
          activeClasseurId={activeClasseurId}
          onSelectClasseur={handleSelectClasseur}
          onCreateClasseur={handleCreateClasseur}
          onRenameClasseur={handleRenameClasseur}
          onDeleteClasseur={handleDeleteClasseur}
          onUpdateClasseur={handleUpdateClasseur}
          onUpdateClasseurPositions={handleUpdateClasseurPositions}
        />
      </div>

      {/* Contenu principal */}
      <div className="dossiers-content">
        <FolderManager
          classeurId={activeClasseurId}
          classeurName={activeClasseur?.name || 'Classeur'}
          classeurIcon={activeClasseur?.icon || '📁'}
          parentFolderId={currentFolderId}
          onFolderOpen={handleFolderOpen}
          onGoBack={handleGoBack}
          filteredFolders={filteredFolders}
          filteredNotes={filteredNotes}
        />
      </div>

      <style jsx>{`
        .dossiers-page {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-main);
        }

        .dossiers-header {
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--border-secondary);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
        }

        .dossiers-content {
          flex: 1;
          overflow: hidden;
          padding: 0;
        }

        .dossiers-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--bg-main);
        }

        .loading-spinner {
          text-align: center;
          color: var(--text-secondary);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-secondary);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .dossiers-error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--bg-main);
        }

        .error-content {
          text-align: center;
          color: var(--text-primary);
          max-width: 400px;
          padding: 2rem;
        }

        .error-content h2 {
          color: #ef4444;
          margin-bottom: 1rem;
        }

        .retry-button {
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 1rem;
          font-weight: 500;
        }

        .retry-button:hover {
          background: var(--accent-hover);
        }

        .dossiers-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--bg-main);
        }

        .empty-content {
          text-align: center;
          color: var(--text-secondary);
          max-width: 400px;
          padding: 2rem;
        }

        .empty-content h2 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
} 