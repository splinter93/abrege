"use client";

import { useMemo } from "react";
import type { Folder } from "@/components/types";
import type { Classeur } from "@/store/useFileSystemStore";
import ClasseurTabs from "@/components/ClasseurTabs";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FolderManager from "@/components/FolderManager";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import "./index.css";

export default function DossiersPage() {
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
    handleGoToRoot, // 🔧 NOUVEAU: Navigation vers la racine
    handleGoToFolder, // 🔧 NOUVEAU: Navigation directe vers un dossier
    folderPath, // 🔧 NOUVEAU: Chemin de navigation pour le breadcrumb
  } = useDossiersPage(user?.id || '');

  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

  return (
    <div className="dossiers-page-wrapper">
      <header className="dossiers-header-fixed">
        <LogoHeader size="medium" position="left" />
      </header>

      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
      </aside>

      <main className="dossiers-content-area">
        <ClasseurTabs
          classeurs={classeurs.map((c: Classeur) => ({ 
            id: c.id, 
            name: c.name, 
            emoji: c.emoji, 
            color: '#e55a2c' // Couleur par défaut
          }))}
          setClasseurs={setClasseurs}
          activeClasseurId={activeClasseurId || null}
          onSelectClasseur={(id) => {
            setActiveClasseurId(id);
            setCurrentFolderId(undefined);
          }}
          onCreateClasseur={handleCreateClasseur}
          onRenameClasseur={handleRenameClasseur}
          onDeleteClasseur={handleDeleteClasseur}
          onUpdateClasseur={handleUpdateClasseur}
          onUpdateClasseurPositions={handleUpdateClasseurPositions}
        />

        {loading && <div className="loading-state">Chargement...</div>}
        {error && <div className="error-state">{error}</div>}
        
        {!loading && !error && activeClasseur && (
          <FolderManager
            classeurId={activeClasseur.id}
            classeurName={activeClasseur.name}
            classeurIcon={(activeClasseur as any).emoji}
            parentFolderId={currentFolderId}
            onFolderOpen={handleFolderOpen}
            onGoBack={handleGoBack}
            onGoToRoot={handleGoToRoot} // 🔧 NOUVEAU: Navigation vers la racine
            onGoToFolder={handleGoToFolder} // 🔧 NOUVEAU: Navigation directe vers un dossier
            folderPath={folderPath} // 🔧 NOUVEAU: Chemin de navigation pour le breadcrumb
          />
        )}

        {!loading && !error && !activeClasseur && (
          <div className="empty-state">
            <h2>Aucun classeur sélectionné</h2>
            <p>Choisissez un classeur pour voir son contenu ou créez-en un nouveau.</p>
          </div>
        )}
      </main>
    </div>
  );
} 