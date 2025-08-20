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
import PerformanceMonitor from "@/components/PerformanceMonitor";
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
              />

              <div className="toolbar-actions">
                <button
                  onClick={handleCreateFolder}
                  className="action-button create-folder"
                  title="Créer un dossier"
                >
                  📁 Nouveau dossier
                </button>
                <button
                  onClick={handleCreateNote}
                  className="action-button create-note"
                  title="Créer une note"
                >
                  📝 Nouvelle note
                </button>
                <button
                  onClick={handleCreateClasseurButtonClick}
                  className="action-button create-classeur"
                  title="Créer un classeur"
                >
                  📚 Nouveau classeur
                </button>
              </div>
            </section>
          </>
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
              </main>
        
        {/* Moniteur de performance */}
        <PerformanceMonitor />
      </div>
    );
  } 