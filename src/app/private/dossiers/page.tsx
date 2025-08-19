"use client";

import { useMemo, useState } from "react";
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
import { supabase } from "@/supabaseClient";
import { v2UnifiedApi } from "@/services/V2UnifiedApi";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import "./index.css";

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
  const { user } = useAuth();
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
  } = useDossiersPage(user?.id || '');

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

  // État pour le mode de vue
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Handlers pour la création
  const handleCreateFolder = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      const result = await v2UnifiedApi.createFolder({
        name: "Nouveau dossier",
        notebook_id: activeClasseur.id,
        parent_id: currentFolderId || null
      }, user.id);
      
      // Recharger les données
      await v2UnifiedApi.loadClasseursWithContent(user.id);
    } catch (e) {
      handleError(e, 'création dossier');
    }
  };

  const handleCreateNote = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      const result = await v2UnifiedApi.createNote({
        source_title: "Nouvelle note",
        notebook_id: activeClasseur.id,
        folder_id: currentFolderId || null,
        markdown_content: ""
      }, user.id);
      
      // Recharger les données
      await v2UnifiedApi.loadClasseursWithContent(user.id);
    } catch (e) {
      handleError(e, 'création note');
    }
  };

  const handleToggleView = (mode: ViewMode) => {
    setViewMode(mode);
  };

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
            onCreateClasseur={handleCreateClasseur}
            onRenameClasseur={handleRenameClasseur}
            onDeleteClasseur={handleDeleteClasseur}
          />
        </section>

        {/* Section de contenu des dossiers */}
        <section className="folders-section">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Chargement des dossiers...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Erreur de chargement</h3>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && activeClasseur && (
            <div className="folder-content">
              <div className="folder-header">
                <div className="folder-info">
                  <span className="folder-icon">{(activeClasseur as any).emoji}</span>
                  <h2 className="folder-title">{activeClasseur.name}</h2>
                </div>
                {/* Remplacer les anciens boutons par la FolderToolbar */}
                <div className="folder-actions">
                  <FolderToolbar
                    onCreateFolder={handleCreateFolder}
                    onCreateFile={handleCreateNote}
                    onToggleView={handleToggleView}
                    viewMode={viewMode}
                  />
                </div>
              </div>
              
              <FolderManager
                classeurId={activeClasseur.id}
                classeurName={activeClasseur.name}
                classeurIcon={(activeClasseur as any).emoji}
                parentFolderId={currentFolderId}
                onFolderOpen={handleFolderOpen}
                onGoBack={handleGoBack}
                onGoToRoot={handleGoToRoot}
                onGoToFolder={handleGoToFolder}
                folderPath={folderPath}
              />
            </div>
          )}

          {!loading && !error && !activeClasseur && (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h2>Aucun classeur sélectionné</h2>
              <p>Choisissez un classeur pour voir son contenu ou créez-en un nouveau.</p>
              <button className="action-btn primary" onClick={handleCreateClasseur}>
                Créer un classeur
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 