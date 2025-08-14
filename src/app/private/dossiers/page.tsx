"use client";

import { useMemo } from "react";
import type { Folder, Classeur } from "@/components/types";
import ClasseurTabs from "@/components/ClasseurTabs";
import LogoScrivia from "@/components/LogoScrivia";
import Sidebar from "@/components/Sidebar";
import FolderManager from "@/components/FolderManager";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import "./index.css";

export default function DossiersPage() {
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
  } = useDossiersPage();

  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

  return (
    <div className="dossiers-page-wrapper">
      <header className="dossiers-header-fixed">
        <LogoScrivia width={130} />
      </header>

      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
      </aside>

      <main className="dossiers-content-area">
        <ClasseurTabs
          classeurs={classeurs.map((c: Classeur) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color }))}
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