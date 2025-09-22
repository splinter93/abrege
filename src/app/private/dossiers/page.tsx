"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Classeur, Folder } from "@/store/useFileSystemStore";
import type { FileArticle } from "@/components/types";
import FolderManager from "@/components/FolderManager";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import DossierErrorBoundary from "@/components/DossierErrorBoundary";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import AuthGuard from "@/components/AuthGuard";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import SearchBar, { SearchResult } from "@/components/SearchBar";
import FolderToolbar from "@/components/FolderToolbar";
import { Folder as FolderIcon } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import type { AuthenticatedUser } from "@/types/dossiers";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import TargetedPollingManager from "@/components/TargetedPollingManager";
import TargetedPollingMonitor from "@/components/TargetedPollingMonitor";
import { useRealtime } from "@/hooks/useRealtime";
import RealtimeStatus from "@/components/RealtimeStatus";
import { logger, LogCategory } from "@/utils/logger";
import { useClasseurContextMenu } from "@/hooks/useClasseurContextMenu";
import { useCrossClasseurDrag } from "@/hooks/useCrossClasseurDrag";
import { DRAG_SENSOR_CONFIG, DRAG_ZONE_CONFIG } from "@/constants/dragAndDropConfig";
import SimpleContextMenu from "@/components/SimpleContextMenu";

import "@/styles/main.css";
import "./index.css";
import "./glassmorphism.css";
import "@/components/DossierErrorBoundary.css";
import "@/components/DossierLoadingStates.css";

// Interface pour les classeurs
interface ClasseurTab {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  slug?: string;
}

// Composant SortableTab pour le drag and drop
interface SortableTabProps {
  classeur: ClasseurTab;
  isActive: boolean;
  onSelectClasseur: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, classeur: ClasseurTab) => void;
  isOverlay?: boolean;
  onDragOver?: (e: React.DragEvent, classeur: ClasseurTab) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, classeur: ClasseurTab) => void;
  isDragOver?: boolean;
}

function SortableTab({ 
  classeur, 
  isActive, 
  onSelectClasseur, 
  onContextMenu, 
  isOverlay,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: classeur.id });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: isDragging ? 'none' : transition, // Pas de transition pendant le drag
    opacity: isDragging ? 0.8 : 1,
    zIndex: isOverlay ? 9999 : isDragging ? 1000 : "auto",
    pointerEvents: isOverlay ? ("none" as const) : undefined,
    display: "inline-block",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <button
        className={`classeur-tab-glassmorphism ${isActive ? "active" : ""} ${isDragOver ? "drag-over" : ""}`}
        style={{ position: 'relative' }}
        onClick={() => onSelectClasseur(classeur.id)}
        draggable={false}
        onContextMenu={(e) => {
          if (onContextMenu && !isOverlay) {
            onContextMenu(e, classeur);
          }
        }}
        onDragOver={(e) => {
          if (onDragOver && !isOverlay) {
            e.preventDefault();
            e.stopPropagation();
            onDragOver(e, classeur);
          }
        }}
        onDragLeave={(e) => {
          if (onDragLeave && !isOverlay) {
            e.preventDefault();
            e.stopPropagation();
            onDragLeave(e);
          }
        }}
        onDrop={(e) => {
          if (onDrop && !isOverlay) {
            e.preventDefault();
            e.stopPropagation();
            onDrop(e, classeur);
          }
        }}
      >
        <span className="classeur-emoji">
          {classeur.emoji || '📁'}
        </span>
        <span className="classeur-name">{classeur.name}</span>
        {/* Zone de drag invisible avec curseur approprié */}
        <div 
          className="classeur-drag-handle"
          {...listeners}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: `${DRAG_ZONE_CONFIG.handleWidth}px`,
            height: '100%',
            cursor: 'grab',
            zIndex: 1
          }}
        />
      </button>
    </div>
  );
}

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
      logger.debug(LogCategory.API, '[DossiersPage] 📨 Événement realtime reçu:', event);
    },
    onStateChange: (state) => {
      logger.debug(LogCategory.API, '[DossiersPage] 🔄 État realtime:', state);
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

  /**
   * Crée un nouveau dossier dans le classeur actif
   * Utilise V2UnifiedApi avec mise à jour optimiste de l'UI
   */
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
          logger.info(LogCategory.API, '[DossiersPage] ✅ Dossier créé avec V2UnifiedApi (optimistic UI)', { classeurId: activeClasseur.id });
        } else {
          throw new Error(result.error || 'Erreur lors de la création du dossier');
        }
      }
    } catch (e) {
      handleError(e, 'création dossier');
    }
  }, [activeClasseur, user?.id, currentFolderId, handleError]);

  /**
   * Crée une nouvelle note dans le classeur actif
   * Utilise DossierService avec polling ciblé automatique
   */
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
        logger.info(LogCategory.API, '[DossiersPage] ✅ Note créée, polling ciblé déclenché automatiquement', { noteName: name.trim() });
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

  // Hook pour le menu contextuel des classeurs
  const {
    contextMenuState,
    handleContextMenuClasseur,
    handleRename,
    handleDelete,
    closeContextMenu
  } = useClasseurContextMenu({
    onRenameClasseur: handleRenameClasseurClick,
    onDeleteClasseur: handleDeleteClasseurClick,
    onUpdateClasseur: handleUpdateClasseurClick
  });

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

  // Drag and Drop logic
  const [draggedClasseur, setDraggedClasseur] = useState<ClasseurTab | null>(null);
  const [dragOverClasseurId, setDragOverClasseurId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: DRAG_SENSOR_CONFIG.classeurs
    })
  );
  
  /**
   * Gère le début du drag & drop des classeurs
   * @param event - Événement de début de drag
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = transformedClasseurs.find((c) => c.id === active.id) || null;
    setDraggedClasseur(found);
  };
  
  /**
   * Gère la fin du drag & drop des classeurs
   * Met à jour les positions via l'API avec types stricts
   * @param event - Événement de fin de drag
   */
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedClasseur(null);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = transformedClasseurs.findIndex((c) => c.id === active.id);
      const newIndex = transformedClasseurs.findIndex((c) => c.id === over.id);
      const reorderedClasseurs = arrayMove(transformedClasseurs, oldIndex, newIndex);
      
      // Convertir vers le format Classeur pour l'API
      const reorderedClasseursForApi: Classeur[] = reorderedClasseurs.map((c, index) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        color: c.color,
        position: index,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      handleUpdateClasseurPositions(reorderedClasseursForApi);
    }
  };

  /**
   * Sélectionne un classeur et réinitialise le dossier courant
   * @param id - ID du classeur à sélectionner
   */
  const handleSelectClasseur = useCallback((id: string) => {
    setActiveClasseurId(id);
    setCurrentFolderId(undefined);
  }, [setActiveClasseurId, setCurrentFolderId]);

  // Hook pour le drag & drop cross-classeur
  const {
    handleDrop: handleCrossClasseurDrop,
    handleDragOver: handleCrossClasseurDragOver,
    handleDragLeave: handleCrossClasseurDragLeave,
    setupCrossClasseurListener,
    cleanupCrossClasseurListener
  } = useCrossClasseurDrag({
    classeurId: activeClasseurId || '',
    onRefresh: refreshData,
    onSetRefreshKey: () => {} // Pas de refresh key nécessaire ici
  });

  // Configurer l'écouteur cross-classeur
  useEffect(() => {
    const handler = setupCrossClasseurListener();
    return () => cleanupCrossClasseurListener();
  }, [setupCrossClasseurListener, cleanupCrossClasseurListener]);

  /**
   * Handler pour le drop sur les onglets des classeurs
   * Utilise le hook commun pour la logique cross-classeur
   */
  const handleClasseurDrop = useCallback((e: React.DragEvent, classeur: ClasseurTab) => {
    setDragOverClasseurId(null);
    handleCrossClasseurDrop(e, classeur.id);
  }, [handleCrossClasseurDrop]);

  /**
   * Handlers pour l'état visuel de drag over
   */
  const handleClasseurDragOver = useCallback((e: React.DragEvent, classeur: ClasseurTab) => {
    handleCrossClasseurDragOver(e, classeur.id);
    setDragOverClasseurId(classeur.id);
  }, [handleCrossClasseurDragOver]);

  const handleClasseurDragLeave = useCallback((e: React.DragEvent) => {
    handleCrossClasseurDragLeave(e);
    setDragOverClasseurId(null);
  }, [handleCrossClasseurDragLeave]);

  /**
   * Gère les résultats de recherche (navigation par défaut du composant SearchBar)
   * @param result - Résultat de recherche sélectionné
   */
  const handleSearchResult = useCallback((result: SearchResult) => {
    // Navigation par défaut du composant SearchBar
    // Le composant gère déjà la navigation
  }, []);

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
          icon={FolderIcon}
          title="Mes Classeurs"
          subtitle="Organisez et gérez vos connaissances"
          stats={[
            { number: classeurs.length, label: `classeur${classeurs.length > 1 ? 's' : ''}` },
            { number: totalNotes, label: `note${totalNotes > 1 ? 's' : ''}` }
          ]}
        />


        {/* Container glassmorphism principal */}
        <motion.div 
          className="glassmorphism-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          {/* Onglets des classeurs avec drag and drop */}
          {classeurs.length > 0 && (
            <div className="classeur-tabs-container">
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
              >
                <div className="classeur-tabs-glassmorphism">
                  <div className="classeur-tabs-content">
                    <SortableContext items={transformedClasseurs.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                      {transformedClasseurs.map((classeur) => (
                        <SortableTab
                          key={classeur.id}
                          classeur={classeur}
                          isActive={activeClasseurId === classeur.id}
                          onSelectClasseur={handleSelectClasseur}
                          onContextMenu={handleContextMenuClasseur}
                          onDragOver={handleClasseurDragOver}
                          onDragLeave={handleClasseurDragLeave}
                          onDrop={handleClasseurDrop}
                          isDragOver={dragOverClasseurId === classeur.id}
                        />
                      ))}
                    </SortableContext>
                  </div>
                  <button 
                    className="add-classeur-tab-glassmorphism"
                    onClick={handleCreateClasseurClick}
                    title="Nouveau classeur"
                  >
                    <span className="add-icon">+</span>
                  </button>
                </div>
                <DragOverlay>
                  {draggedClasseur ? (
                    <SortableTab
                      classeur={draggedClasseur}
                      isActive={draggedClasseur.id === activeClasseurId}
                      onSelectClasseur={handleSelectClasseur}
                      isOverlay={true}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          {/* Contenu du classeur actif */}
          {activeClasseur && (
            <div className="classeur-content-glassmorphism">
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
                preloadedNotes={useFileSystemStore.getState().notes as unknown as { [key: string]: FileArticle }}
                skipApiCalls={true}
                viewMode={viewMode}
                onToggleView={handleToggleView}
                onCreateFolder={handleCreateFolder}
                onCreateFile={handleCreateNote}
                onSearchResult={handleSearchResult}
              />
            </div>
          )}
        </motion.div>
      </main>
      
      <TargetedPollingManager />
      <TargetedPollingMonitor />
      <RealtimeStatus userId={user.id} />
      
      {/* Menu contextuel des classeurs */}
      {contextMenuState.visible && contextMenuState.item && (
        <SimpleContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          visible={contextMenuState.visible}
          options={[
            { label: 'Renommer', onClick: handleRename },
            { label: 'Supprimer', onClick: handleDelete }
          ]}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
} 