"use client";

import { useState, useCallback, useEffect } from "react";
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
import "./index.css";
import "./page.css"; // CSS critique pour éviter le flash

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
  const { user } = useAuth();
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
    userId: user?.id
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
  const displayFiles = filteredFiles.filter(file =>
    (file.filename?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (file.mime_type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

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

  const handleRefresh = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

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
    // TODO: Implémenter le menu contextuel
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
  }, []);

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
        {/* Section des fichiers avec header */}
        <section className="files-section">
          <div className="files-header">
            <div className="files-info">
              <span className="files-icon">📁</span>
              <h2 className="files-title">Mes Fichiers</h2>
            </div>
            <div className="files-stats">
              <span>{displayFiles.length} fichier{displayFiles.length > 1 ? 's' : ''}</span>
              {quotaInfo && (
                <span className="quota-info">
                  {Math.round((quotaInfo.usedBytes / quotaInfo.quotaBytes) * 100)}% utilisé
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section de contenu des fichiers */}
        <section className="files-content-section">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Chargement des fichiers...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Erreur de chargement</h3>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && (
            <div className="files-content">
              <FilesToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onUploadFile={handleUploadFile}
                onRefresh={handleRefresh}
                selectedFilesCount={selectedFiles.size}
                onDeleteSelected={handleDeleteSelected}
                onRenameSelected={handleRenameSelected}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              
              {/* Composant d'upload */}
              {showUploader && (
                <div className="uploader-section">
                  <FileUploaderLocal
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    maxFileSize={STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE} // Utilise la config centralisée
                    allowedTypes={[...STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES]} // Copie mutable pour éviter l'erreur de type
                    multiple={true}
                  />
                </div>
              )}
              
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
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 