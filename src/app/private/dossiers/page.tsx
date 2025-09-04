"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Classeur, Folder } from "@/store/useFileSystemStore";
import ClasseurNavigation from "@/components/ClasseurNavigation";
import Sidebar from "@/components/Sidebar";
import FolderManager from "@/components/FolderManager";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import AuthGuard from "@/components/AuthGuard";

import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import type { AuthenticatedUser } from "@/types/dossiers";
import { useUnifiedRealtime } from "@/hooks/useUnifiedRealtime";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import UnifiedRealtimeManager from "@/components/UnifiedRealtimeManager";

import "./index.css";
import "@/components/DossierErrorBoundary.css";
import "@/components/DossierLoadingStates.css";

export default function DossiersPage() {
  return (
    <DossierErrorBoundary>
      <AuthGuard>
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
  
  // Utiliser le nouveau hook unifié pour le realtime
  const { isConnected, provider, status, triggerPolling } = useUnifiedRealtime({
    autoInitialize: true,
    debug: process.env.NODE_ENV === 'development'
  });
  
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

  // 🔧 NOUVEAU: Calculer le nombre total de notes
  const totalNotes = useMemo(() => {
    return Object.values(useFileSystemStore.getState().notes).length;
  }, []);

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
      {/* Gestionnaire realtime unifié pour la synchronisation */}
      <UnifiedRealtimeManager />
      
      {/* Sidebar fixe */}
      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
      </aside>

      {/* Zone de contenu principal */}
      <main className="dossiers-content-area">
        {/* Titre de la page avec design glassmorphism uniforme */}
        <motion.div 
          className="page-title-container-glass"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="page-title-content">
            <div className="page-title-left-section">
              <motion.div 
                className="page-title-icon-container"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="page-title-icon">📚</span>
              </motion.div>
              <div className="page-title-section">
                <h1 className="page-title">Mes Classeurs</h1>
                <p className="page-subtitle">Organisez et gérez vos connaissances</p>
              </div>
            </div>
            <div className="page-title-stats">
              <div className="page-title-stats-item">
                <span className="page-title-stats-number">{classeurs.length}</span>
                <span className="page-title-stats-label">classeur{classeurs.length > 1 ? 's' : ''}</span>
              </div>
              <div className="page-title-stats-item">
                <span className="page-title-stats-number">{totalNotes}</span>
                <span className="page-title-stats-label">note{totalNotes > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation des classeurs - Au-dessus du container principal */}
        {classeurs.length > 0 && (
          <motion.div
            className="classeur-navigation-wrapper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <ClasseurNavigation
              classeurs={classeurs.map((c: Classeur) => ({ 
                id: c.id, 
                name: c.name, 
                emoji: c.emoji || '📁', 
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
          </motion.div>
        )}

        {/* Section des classeurs - Container simple sans glassmorphism */}
        {activeClasseur && (
          <>
            <motion.section 
              className="content-section-simple"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <div className="content-main-container-simple">
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
              </div>
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
} 