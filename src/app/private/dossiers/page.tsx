"use client";

import { useMemo, useState, useEffect } from "react";
import type { Classeur, Folder } from "@/store/useFileSystemStore";
import ClasseurBandeau from "@/components/ClasseurBandeau";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FolderManager from "@/components/FolderManager";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import AuthGuard from "@/components/AuthGuard";
import RealtimeInitializer from "@/components/RealtimeInitializer";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import type { AuthenticatedUser } from "@/types/dossiers";

import "./index.css";
import "@/components/DossierErrorBoundary.css";
import "@/components/DossierLoadingStates.css";
import { useFileSystemStore } from "@/store/useFileSystemStore";

export default function DossiersPage() {
  return (
    <DossierErrorBoundary>
      <AuthGuard>
        <RealtimeInitializer />
        <DossiersPageContent />
      </AuthGuard>
    </DossierErrorBoundary>
  );
}

function DossiersPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return <DossierLoadingState type="initial" message="Vérification de l'authentification..." />;
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedDossiersContent user={user} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedDossiersContent({ user }: { user: AuthenticatedUser }) {
  // État pour le mode de vue
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Appeler useDossiersPage maintenant que nous avons un user.id valide
  const {
    loading,
    error,
    classeurs,
    activeClasseurId,
    currentFolderId,
    setActiveClasseurId,
    setCurrentFolderId,
    handleCreateClasseur,
    handleRenameClasseur,
    handleDeleteClasseur,
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
  } = useDossiersPage(user.id);
  
  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'DossiersPage',
    operation: 'gestion_dossiers',
    userId: user.id
  });
  
  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

  // Auto-sélectionner le premier classeur si aucun n'est actif
  useEffect(() => {
    if (!activeClasseurId && classeurs.length > 0 && !loading) {
      setActiveClasseurId(classeurs[0].id);
    }
  }, [activeClasseurId, classeurs, loading, setActiveClasseurId]);

  // Afficher l'état de chargement initial
  if (loading && classeurs.length === 0) {
    return <DossierLoadingState type="initial" />;
  }

  // Afficher l'état d'erreur
  if (error) {
    return (
      <DossierErrorState
        message={error}
        retryCount={retryCount}
        canRetry={canRetry}
        onRetry={retryWithBackoff}
        onRefresh={refreshData}
        onForceReload={forceReload}
      />
    );
  }

  // Handlers pour la création (utilisent maintenant le service optimisé)
  const handleCreateFolder = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      const name = prompt('Nom du dossier :');
      if (name && name.trim()) {
        const { DossierService } = await import('@/services/dossierService');
        const dossierService = DossierService.getInstance();
        await dossierService.createFolder({
          name: name.trim(),
          notebook_id: activeClasseur.id,
          parent_id: currentFolderId || null
        }, user.id);
      }
    } catch (e) {
      handleError(e, 'création dossier');
    }
  };

  const handleCreateNote = async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      const name = prompt('Nom de la note :');
      if (name && name.trim()) {
        const { DossierService } = await import('@/services/dossierService');
        const dossierService = DossierService.getInstance();
        await dossierService.createNote({
          source_title: name.trim(),
          notebook_id: activeClasseur.id,
          markdown_content: `# ${name.trim()}\n\nContenu de la note...`,
          folder_id: currentFolderId || null
        }, user.id);
      }
    } catch (e) {
      handleError(e, 'création note');
    }
  };

  // Handlers pour les classeurs (utilisent maintenant le service optimisé)
  const handleCreateClasseurClick = async () => {
    if (!user?.id) return;
    
    try {
      await handleCreateClasseur("Nouveau classeur", "📚");
    } catch (e) {
      handleError(e, 'création classeur');
    }
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

  const handleFolderOpenClick = (folder: Folder) => {
    handleFolderOpen(folder.id);
  };

  const handleToggleView = (mode: 'list' | 'grid') => {
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
                folderPath={folderPath.map(folder => ({
                  id: folder.id,
                  name: folder.name,
                  parent_id: folder.parent_id || null,
                  classeur_id: folder.classeur_id || '',
                  position: folder.position || 0,
                  created_at: folder.created_at || '',
                  updated_at: new Date().toISOString(),
                  user_id: user.id
                }))}
                // 🔧 FIX: Passer les données déjà chargées pour éviter le double chargement
                preloadedFolders={useFileSystemStore.getState().folders}
                preloadedNotes={useFileSystemStore.getState().notes}
                skipApiCalls={true}
                viewMode={viewMode}
                onToggleView={handleToggleView}
                onCreateFolder={handleCreateFolder}
                onCreateFile={handleCreateNote}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
} 