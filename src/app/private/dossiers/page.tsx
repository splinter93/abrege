"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Classeur, Folder } from "@/store/useFileSystemStore";
import type { FileArticle } from "@/components/types";
import ClasseurNavigation from "@/components/ClasseurNavigation";
import FolderManager from "@/components/FolderManager";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import AuthGuard from "@/components/AuthGuard";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { Folder } from "lucide-react";

import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import type { AuthenticatedUser } from "@/types/dossiers";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import TargetedPollingManager from "@/components/TargetedPollingManager";
import TargetedPollingMonitor from "@/components/TargetedPollingMonitor";
import { useRealtime } from "@/hooks/useRealtime";
import RealtimeStatus from "@/components/RealtimeStatus";

import "@/styles/main.css";
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
  // 🔧 FIX: TOUS les hooks doivent être appelés dans le même ordre à chaque render
  // État pour le mode de vue
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Gestionnaire d'erreur sécurisé - TOUJOURS en premier
  const { handleError } = useSecureErrorHandler({
    context: 'DossiersPage',
    operation: 'gestion_dossiers',
    userId: user.id
  });

  // 🔄 Realtime Service - Initialisation pour les mises à jour en temps réel
  const realtime = useRealtime({
    userId: user.id,
    debug: process.env.NODE_ENV === 'development',
    onEvent: (event) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 📨 Événement realtime reçu:', event);
      }
    },
    onStateChange: (state) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 🔄 État realtime:', state);
      }
    }
  });
  
  // Appeler useDossiersPage - TOUJOURS en deuxième
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
  } = useDossiersPage(user.id);
  
  // 🎯 Le système de polling ciblé est maintenant géré par TargetedPollingManager
  
  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

  // 🔧 OPTIMISATION: Calculer le nombre total de notes avec sélecteur Zustand
  const totalNotes = useFileSystemStore((state) => Object.keys(state.notes).length);

  // Auto-sélectionner le premier classeur si aucun n'est actif
  useEffect(() => {
    if (!activeClasseurId && classeurs.length > 0 && !loading) {
      setActiveClasseurId(classeurs[0].id);
    }
  }, [activeClasseurId, classeurs, loading, setActiveClasseurId]);

  // Handlers pour la création (utilisent maintenant V2UnifiedApi avec optimistic UI)
  const handleCreateFolder = useCallback(async () => {
    if (!activeClasseur || !user?.id) return;
    
    try {
      const name = prompt('Nom du dossier :');
      if (name && name.trim()) {
        const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
        const v2Api = V2UnifiedApi.getInstance();
        
        const result = await v2Api.createFolder({
          name: name.trim(),
          classeur_id: activeClasseur.id,
          parent_id: currentFolderId || null
        });
        
        if (result.success) {
          console.log('[DossiersPage] ✅ Dossier créé avec V2UnifiedApi (optimistic UI)');
        } else {
          throw new Error(result.error || 'Erreur lors de la création du dossier');
        }
      }
    } catch (e) {
      handleError(e, 'création dossier');
    }
  }, [activeClasseur, user?.id, currentFolderId, handleError]);

  const handleCreateNote = useCallback(async () => {
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
        
        // 🎯 Le polling ciblé est déjà déclenché par V2UnifiedApi dans DossierService
        console.log('[DossiersPage] ✅ Note créée, polling ciblé déclenché automatiquement');
      }
    } catch (e) {
      handleError(e, 'création note');
    }
  }, [activeClasseur, user?.id, currentFolderId, handleError]);

  // Handlers pour les classeurs (utilisent maintenant le service optimisé)
  const handleCreateClasseurClick = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await handleCreateClasseur("Nouveau classeur", "📚");
    } catch (e) {
      handleError(e, 'création classeur');
    }
  }, [user?.id, handleCreateClasseur, handleError]);

  const handleRenameClasseurClick = useCallback(async (id: string, newName: string) => {
    if (!user?.id) return;
    
    try {
      await handleRenameClasseur(id, newName);
    } catch (e) {
      handleError(e, 'renommage classeur');
    }
  }, [user?.id, handleRenameClasseur, handleError]);

  const handleUpdateClasseurClick = useCallback(async (id: string, data: Partial<Classeur>) => {
    if (!user?.id) return;
    try {
      await handleUpdateClasseur(id, data);
    } catch (e) {
      handleError(e, 'mise à jour classeur');
    }
  }, [user?.id, handleUpdateClasseur, handleError]);

  const handleDeleteClasseurClick = useCallback(async (id: string) => {
    if (!user?.id) return;
    
    try {
      await handleDeleteClasseur(id);
    } catch (e) {
      handleError(e, 'suppression classeur');
    }
  }, [user?.id, handleDeleteClasseur, handleError]);

  const handleFolderOpenClick = useCallback((folder: Folder) => {
    handleFolderOpen(folder.id);
  }, [handleFolderOpen]);

  const handleToggleView = useCallback((mode: 'list' | 'grid') => {
    setViewMode(mode);
  }, []);

  // 🔧 OPTIMISATION: Mémoiser la transformation des classeurs pour éviter les re-renders
  const transformedClasseurs = useMemo(() => 
    classeurs.map((c: Classeur) => ({ 
      id: c.id, 
      name: c.name, 
      emoji: c.emoji || '📁', 
      color: '#e55a2c'
    })), 
    [classeurs]
  );

  // 🔧 OPTIMISATION: Mémoiser le handler de sélection de classeur
  const handleSelectClasseur = useCallback((id: string) => {
    setActiveClasseurId(id);
    setCurrentFolderId(undefined);
  }, [setActiveClasseurId, setCurrentFolderId]);

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

  return (
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
        {/* Titre de la page avec design uniforme */}
        <UnifiedPageTitle
          icon={Folder}
          title="Mes Classeurs"
          subtitle="Organisez et gérez vos connaissances"
          stats={[
            { number: classeurs.length, label: `classeur${classeurs.length > 1 ? 's' : ''}` },
            { number: totalNotes, label: `note${totalNotes > 1 ? 's' : ''}` }
          ]}
        />

        {/* Dashboard principal avec design moderne */}
        <div className="main-dashboard">
          {/* Navigation des classeurs */}
          {classeurs.length > 0 && (
            <motion.section
              className="dashboard-section"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              <div className="section-header">
                <div className="section-title-row">
                  <h2 className="section-title">Classeurs</h2>
                </div>
                <div className="section-separator"></div>
              </div>
              <div className="section-content">
                <ClasseurNavigation
                  classeurs={transformedClasseurs}
                  activeClasseurId={activeClasseurId || null}
                  onSelectClasseur={handleSelectClasseur}
                  onCreateClasseur={handleCreateClasseurClick}
                  onRenameClasseur={handleRenameClasseurClick}
                  onDeleteClasseur={handleDeleteClasseurClick}
                  onUpdateClasseur={handleUpdateClasseurClick}
                  onUpdateClasseurPositions={handleUpdateClasseurPositions}
                />
              </div>
            </motion.section>
          )}

          {/* Gestionnaire de dossiers */}
          {activeClasseur && (
            <motion.section 
              className="dashboard-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="section-header">
                <div className="section-title-row">
                  <h2 className="section-title">{activeClasseur.name}</h2>
                </div>
                <div className="section-separator"></div>
              </div>
              <div className="section-content">
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
                  preloadedFolders={useFileSystemStore.getState().folders as any}
                  preloadedNotes={useFileSystemStore.getState().notes as { [key: string]: FileArticle }}
                  skipApiCalls={true}
                  viewMode={viewMode}
                  onToggleView={handleToggleView}
                  onCreateFolder={handleCreateFolder}
                  onCreateFile={handleCreateNote}
                />
              </div>
            </motion.section>
          )}
        </div>
      </main>
      
      <TargetedPollingManager />
      <TargetedPollingMonitor />
      <RealtimeStatus userId={user.id} />
    </div>
  );
} 