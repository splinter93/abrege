"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import LogoHeader from "@/components/LogoHeader";
import UnifiedPageLayout from "@/components/UnifiedPageLayout";
import FilesContent from "@/components/FilesContent";
import FilesToolbar, { ViewMode } from "@/components/FilesToolbar";
import FileUploaderLocal from "./FileUploaderLocal";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { STORAGE_CONFIG } from "@/config/storage";
import { simpleLogger as logger } from "@/utils/logger";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { FileText } from "lucide-react";
import "@/styles/main.css";
import "./index.css";
import "./page.css"; // CSS critique pour éviter le flash
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";

export default function FilesPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <FilesPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function FilesPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return (
      <UnifiedPageLayout className="page-files">
        <div className="loading-state">
          <p>Chargement...</p>
        </div>
      </UnifiedPageLayout>
    );
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedFilesContent user={user} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedFilesContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const {
    loading,
    error,
    quotaInfo,
    fetchFiles,
    deleteFile,
    renameFile,
    filteredFiles,
    searchTerm,
    viewMode: hookViewMode
  } = useFilesPage();

  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'FilesPage',
    operation: 'gestion_fichiers',
    userId: user.id
  });

  // État local pour la gestion de l'interface
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Synchroniser la recherche avec le hook
  useEffect(() => {
    setSearchQuery(searchTerm);
  }, [searchTerm]);

  // Synchroniser le mode d'affichage avec le hook
  useEffect(() => {
    setViewMode(hookViewMode);
  }, [hookViewMode]);

  // Filtrer les fichiers selon la recherche
  const displayFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredFiles;
    }
    
    return filteredFiles.filter(file =>
      (file.filename?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (file.mime_type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [filteredFiles, searchQuery]);

  // Gestion des actions sur les fichiers
  const handleFileOpen = useCallback((file: FileItem) => {
    // Ouvrir le fichier dans un nouvel onglet
    if (file.url) {
      window.open(file.url, '_blank');
    }
  }, []);



  const handleFileRename = useCallback(async (fileId: string, newName: string) => {
    try {
      // Validation du nom
      if (!newName || newName.trim() === '') {
        alert('Le nom du fichier ne peut pas être vide');
        return;
      }

      if (newName.length > 255) {
        alert('Le nom du fichier est trop long (maximum 255 caractères)');
        return;
      }

      // Caractères interdits
      const invalidChars = /[<>:"/\\|?*]/;
      if (invalidChars.test(newName)) {
        alert('Le nom du fichier contient des caractères interdits: < > : " / \\ | ? *');
        return;
      }

      // Vérifier si le nom existe déjà dans le même dossier
      const currentFile = displayFiles.find(f => f.id === fileId);
      if (currentFile) {
        const existingFile = displayFiles.find(f => 
          f.id !== fileId && 
          f.filename === newName.trim() && 
          f.folder_id === currentFile.folder_id
        );
        
        if (existingFile) {
          alert('Un fichier avec ce nom existe déjà dans ce dossier');
          return;
        }
      }

      await renameFile(fileId, newName.trim());
      setRenamingItemId(null);
    } catch (error) {
      console.error('Erreur renommage fichier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du renommage';
      alert(`Erreur: ${errorMessage}`);
      handleError(error, 'renommage fichier');
    }
  }, [renameFile, handleError, displayFiles]);

  const handleUploadFile = useCallback(() => {
    setShowUploader(!showUploader);
  }, [showUploader]);

  const handleUploadComplete = useCallback(() => {
    // Rafraîchir la liste des fichiers
    fetchFiles();
    // Masquer l'uploader
    setShowUploader(false);
  }, [fetchFiles]);

  const handleUploadError = useCallback((error: string) => {
    handleError(error, 'upload fichier');
  }, [handleError]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    
    if (confirm(`Voulez-vous vraiment supprimer ${selectedFiles.size} fichier(s) ?`)) {
      const promises = Array.from(selectedFiles).map(async (fileId) => {
        try {
          await deleteFile(fileId);
          setSelectedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileId);
            return newSet;
          });
        } catch (error) {
          console.error('Erreur suppression fichier:', error);
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la suppression';
          alert(`Erreur: ${errorMessage}`);
          handleError(error, 'suppression fichier');
        }
      });
      await Promise.all(promises);
    }
  }, [selectedFiles, deleteFile, handleError]);

  const handleRenameSelected = useCallback(() => {
    if (selectedFiles.size === 1) {
      const fileId = Array.from(selectedFiles)[0];
      setRenamingItemId(fileId);
    }
  }, [selectedFiles]);

  const handleContextMenuItem = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Supprimer tous les menus contextuels existants
    const existingMenus = document.querySelectorAll('.file-context-menu');
    existingMenus.forEach(menu => menu.remove());
    
    // Créer le menu contextuel
    const contextMenu = document.createElement('div');
    contextMenu.className = 'file-context-menu';
    contextMenu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      min-width: 160px;
      padding: 4px 0;
    `;

    // Options du menu
    const options = [
      {
        label: 'Renommer',
        icon: '✏️',
        action: () => {
          setRenamingItemId(file.id);
          contextMenu.remove();
        }
      },
      {
        label: 'Ouvrir',
        icon: '👁️',
        action: () => {
          handleFileOpen(file);
          contextMenu.remove();
        }
      },
      {
        label: 'Supprimer',
        icon: '🗑️',
        action: async () => {
          if (confirm(`Supprimer "${file.filename}" ?`)) {
            try {
              await deleteFile(file.id);
            } catch (error) {
              console.error('Erreur suppression fichier:', error);
              const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la suppression';
              alert(`Erreur: ${errorMessage}`);
            }
          }
          contextMenu.remove();
        }
      }
    ];

    // Créer les éléments du menu
    options.forEach(option => {
      const item = document.createElement('div');
      item.className = 'context-menu-item';
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--text-primary);
        transition: background-color 0.2s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      `;
      item.innerHTML = `<span>${option.icon}</span><span>${option.label}</span>`;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--hover-bg)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        option.action();
      });
      
      contextMenu.appendChild(item);
    });

    // Ajouter au DOM
    document.body.appendChild(contextMenu);

    // Fermer le menu si on clique ailleurs
    const closeMenu = (e: MouseEvent) => {
      if (!contextMenu.contains(e.target as Node)) {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
        document.removeEventListener('contextmenu', closeMenu);
      }
    };

    // Attendre un tick pour éviter la fermeture immédiate
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
      document.addEventListener('contextmenu', closeMenu);
    }, 0);

    logger.dev('[FilesPage] Menu contextuel affiché pour:', file.filename);
  }, [handleFileOpen, deleteFile]);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
  }, []);

  // 🔧 OPTIMISATION: Mémoiser le calcul du pourcentage d'utilisation
  const usagePercentage = useMemo(() => 
    quotaInfo ? Math.round((quotaInfo.usedBytes / quotaInfo.quotaBytes) * 100) : 0,
    [quotaInfo]
  );

  return (
    <UnifiedPageLayout className="page-files">
        {/* Titre de la page avec design uniforme */}
        <UnifiedPageTitle
          icon={FileText}
          title="Mes Fichiers"
          subtitle="Gérez et organisez vos documents"
          stats={[
            { number: displayFiles.length, label: `fichier${displayFiles.length > 1 ? 's' : ''}` },
            { number: quotaInfo ? Math.round(quotaInfo.usedBytes / (1024 * 1024)) : 0, label: 'MB' }
          ]}
        />

        {/* Toolbar and Content Section */}
        <motion.section
          className="files-body-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Chargement des fichiers...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Erreur de chargement</h3>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <FilesToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onUploadFile={handleUploadFile}
                selectedFilesCount={selectedFiles.size}
                onDeleteSelected={handleDeleteSelected}
                onRenameSelected={handleRenameSelected}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <AnimatePresence>
                {showUploader && (
                  <motion.div
                    className="uploader-container"
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    <FileUploaderLocal
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                      maxFileSize={STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE}
                      allowedTypes={[...STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES]}
                      multiple={true}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <FilesContent
                files={displayFiles}
                loading={loading}
                error={error}
                onFileOpen={handleFileOpen}
                onFileRename={handleFileRename}
                renamingItemId={renamingItemId}
                onCancelRename={handleCancelRename}
                onContextMenuItem={handleContextMenuItem}
                viewMode={viewMode}
                onFilesDropped={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </>
          )}
        </motion.section>
    </UnifiedPageLayout>
  );
} 