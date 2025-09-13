"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FilesContent from "@/components/FilesContent";
import FilesToolbar, { ViewMode } from "@/components/FilesToolbar";
import FileUploaderLocal from "./FileUploaderLocal";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { STORAGE_CONFIG } from "@/config/storage";
import { simpleLogger as logger } from "@/utils/logger";
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
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <Sidebar />
        </aside>
        <main className="page-content-area">
          <div className="loading-state">
            <p>Chargement...</p>
          </div>
        </main>
      </div>
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
      await renameFile(fileId, newName);
      setRenamingItemId(null);
    } catch (error) {
      handleError(error, 'renommage fichier');
    }
  }, [renameFile, handleError]);

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

  const handleContextMenuItem = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Menu contextuel - fonctionnalité à implémenter dans une version future
    logger.dev('[FilesPage] Menu contextuel demandé pour:', e.currentTarget);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
  }, []);

  // 🔧 OPTIMISATION: Mémoiser le calcul du pourcentage d'utilisation
  const usagePercentage = useMemo(() => 
    quotaInfo ? Math.round((quotaInfo.usedBytes / quotaInfo.quotaBytes) * 100) : 0,
    [quotaInfo]
  );

  return (
    <div className="page-wrapper">
      {/* Sidebar fixe */}
      <aside className="page-sidebar-fixed">
        <Sidebar />
      </aside>

      {/* Zone de contenu principal */}
      <main className="page-content-area">
        {/* Section des fichiers avec header glassmorphism uniforme */}
        <motion.section 
          className="files-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <div className="page-title-container-glass">
            <div className="page-title-content">
              <div className="page-title-left-section">
                <motion.div 
                  className="page-title-icon-container"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="page-title-icon">📁</span>
                </motion.div>
                <div className="page-title-section">
                  <h2 className="page-title">Mes Fichiers</h2>
                  <p className="page-subtitle">Gérez et organisez vos documents</p>
                </div>
              </div>
              
              <div className="page-title-stats">
                <div className="page-title-stats-item">
                  <span className="page-title-stats-number">{displayFiles.length}</span>
                  <span className="page-title-stats-label">fichier{displayFiles.length > 1 ? 's' : ''}</span>
                </div>
                
                {quotaInfo && (
                  <div className="page-title-stats-item">
                    <div className="page-title-stats-number">{usagePercentage}%</div>
                    <span className="page-title-stats-label">utilisé</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section de contenu des fichiers */}
        <motion.section 
          className="files-content-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          {loading && (
            <motion.div 
              className="loading-state-glass"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="loading-spinner-glass"></div>
              <p>Chargement des fichiers...</p>
            </motion.div>
          )}
          
          {error && (
            <motion.div 
              className="error-state-glass"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="error-icon">⚠️</div>
              <h3>Erreur de chargement</h3>
              <p>{error}</p>
            </motion.div>
          )}
          
          {!loading && !error && (
            <div className="files-content">
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
              
              {/* Composant d'upload avec animation */}
              <AnimatePresence>
                {showUploader && (
                  <motion.div 
                    className="uploader-section-glass"
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
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
} 