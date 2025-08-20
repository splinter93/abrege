"use client";

import { useMemo, useState, useEffect } from "react";
import type { Folder } from "@/components/types";
import type { Classeur } from "@/store/useFileSystemStore";
import ClasseurBandeau from "@/components/ClasseurBandeau";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FolderManager from "@/components/FolderManager";
import FolderToolbar, { ViewMode } from "@/components/FolderToolbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import "./index.css";
import { useFileSystemStore } from "@/store/useFileSystemStore";

export default function DossiersPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <DossiersPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function DossiersPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Utiliser un user ID de test si l'utilisateur n'est pas authentifié
  const effectiveUserId = user?.id || "3223651c-5580-4471-affb-b3f4456bd729";
  
  const {
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
    refreshData,
    forceReload,
    retryWithBackoff,
    retryCount,
    canRetry
  } = useDossiersPage(effectiveUserId);

  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'DossiersPage',
    operation: 'gestion_dossiers',
    userId: user?.id
  });

  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

  // 🔧 FIX: Auto-sélectionner le premier classeur si aucun n'est actif
  useEffect(() => {
    if (!activeClasseurId && classeurs.length > 0 && !loading) {
      setActiveClasseurId(classeurs[0].id);
    }
  }, [activeClasseurId, classeurs, loading, setActiveClasseurId]);

  // État pour le mode de vue
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Handlers pour la création
  const handleCreateFolder = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      // TODO: Implémenter la création via le service optimisé
      // Pour l'instant, on recharge tout
      await handleUpdateClasseur(activeClasseur.id, {}); // Recharger les données
    } catch (e) {
      handleError(e, 'création dossier');
    }
  };

  const handleCreateNote = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      // TODO: Implémenter la création via le service optimisé
      // Pour l'instant, on recharge tout
      await handleUpdateClasseur(activeClasseur.id, {}); // Recharger les données
    } catch (e) {
      handleError(e, 'création note');
    }
  };

  // Handlers pour les classeurs
  const handleCreateClasseurClick = async () => {
    if (!user?.id) return;
    
    try {
      await handleCreateClasseur("Nouveau classeur", "📚");
    } catch (e) {
      handleError(e, 'création classeur');
    }
  };

  const handleCreateClasseurButtonClick = () => {
    handleCreateClasseurClick();
  };

  const handleRenameClasseurClick = async (id: string, newName: string) => {
    if (!user?.id) return;
    
    try {
      await handleRenameClasseur(id, newName);
    } catch (e) {
      handleError(e, 'renommage classeur');
    }
  };

  const handleDeleteClasseurClick = async (id: string) => {
    if (!user?.id) return;
    
    try {
      await handleDeleteClasseur(id);
    } catch (e) {
      handleError(e, 'suppression classeur');
    }
  };

  const handleFolderOpenClick = (folder: any) => {
    handleFolderOpen(folder.id);
  };

  const handleToggleView = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // 🔧 FIX: Afficher l'état d'authentification
  if (authLoading) {
    return (
      <div className="dossiers-page-wrapper">
        <div className="dossiers-content-area">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
          </div>
        </div>
      </div>
    );
  }

  // 🔧 FIX: Afficher un message si pas d'authentification
  if (!user) {
    return (
      <div className="dossiers-page-wrapper">
        <div className="dossiers-content-area">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">Mode Test</h3>
                <p className="mt-1 text-yellow-700">
                  Vous n'êtes pas authentifié. Utilisation du mode test avec l'ID: {effectiveUserId.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dossiers-page-wrapper">
      {/* Header fixe avec navigation */}
      <header className="dossiers-header-fixed">
        <div className="header-content">
          <LogoHeader size="medium" position="left" />
        </div>
      </header>

      {/* Sidebar fixe */}
      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
      </aside>

      {/* Zone de contenu principal */}
      <main className="dossiers-content-area">
        {/* Section des classeurs avec navigation */}
        {activeClasseur && (
          <>
            <section className="classeurs-section">
              <ClasseurBandeau
                classeurs={classeurs.map((c: Classeur) => ({ 
                  id: c.id, 
                  name: c.name, 
                  emoji: c.emoji, 
                  color: '#e55a2c'
                }))}
                activeClasseurId={activeClasseurId || null}
                onSelectClasseur={(id) => {
                  setActiveClasseurId(id);
                  setCurrentFolderId(undefined);
                }}
                onCreateClasseur={handleCreateClasseurClick}
                onRenameClasseur={handleRenameClasseurClick}
                onDeleteClasseur={handleDeleteClasseurClick}
              />
            </section>

            <section className="content-section">
              <FolderManager
                classeurId={activeClasseur.id}
                classeurName={activeClasseur.name}
                classeurIcon={activeClasseur.emoji}
                parentFolderId={currentFolderId}
                onFolderOpen={handleFolderOpenClick}
                onGoBack={handleGoBack}
                onGoToRoot={handleGoToRoot}
                onGoToFolder={handleGoToFolder}
                folderPath={folderPath}
                // 🔧 FIX: Passer les données déjà chargées pour éviter le double chargement
                preloadedFolders={useFileSystemStore.getState().folders}
                preloadedNotes={useFileSystemStore.getState().notes}
                skipApiCalls={true}
              />
            </section>
          </>
        )}

        {/* Affichage des erreurs avec retry */}
        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Erreur de chargement</h2>
            <p>{error}</p>
            <div className="error-actions">
              {retryCount < 3 && (
                <button 
                  className="action-btn secondary" 
                  onClick={retryWithBackoff}
                >
                  🔄 Réessayer ({3 - retryCount} tentatives restantes)
                </button>
              )}
              <button 
                className="action-btn primary" 
                onClick={refreshData}
              >
                🔄 Recharger
              </button>
              <button 
                className="action-btn warning" 
                onClick={forceReload}
              >
                💥 Rechargement forcé
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 