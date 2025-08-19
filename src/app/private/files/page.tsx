"use client";

import { useState, useCallback } from "react";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FilesContent from "@/components/FilesContent";
import FilesToolbar, { ViewMode } from "@/components/FilesToolbar";
import FileUploaderWrapper from "./FileUploaderWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import "./index.css";

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
    files,
    quotaInfo,
    fetchFiles,
    deleteFile,
    renameFile,
    refreshQuota,
    clearError,
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

  // Filtrer les fichiers selon la recherche
  const filteredFiles = files.filter(file =>
    (file.filename?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (file.mime_type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Gestion des actions sur les fichiers
  const handleFileOpen = useCallback((file: FileItem) => {
    // Ouvrir le fichier dans un nouvel onglet
    window.open(file.url, '_blank');
  }, []);

  const handleFileDelete = useCallback(async (fileId: string) => {
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
  }, [deleteFile, handleError]);

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

  const handleUploadComplete = useCallback((file: FileItem) => {
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
      const promises = Array.from(selectedFiles).map(fileId => deleteFile(fileId));
      try {
        await Promise.all(promises);
        setSelectedFiles(new Set());
      } catch (error) {
        handleError(error, 'suppression multiple fichiers');
      }
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
    // TODO: Implémenter le menu contextuel
    // Log sécurisé en développement uniquement
    if (process.env.NODE_ENV === 'development') {
      console.log('Menu contextuel pour:', file.filename);
    }
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
              <span>{filteredFiles.length} fichier{filteredFiles.length > 1 ? 's' : ''}</span>
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
                  <FileUploaderWrapper
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    maxFileSize={100 * 1024 * 1024} // 100MB
                    allowedTypes={[
                      'image/*',
                      'application/pdf',
                      'text/*',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      'application/vnd.ms-powerpoint',
                      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    ]}
                    multiple={true}
                  />
                </div>
              )}
              
              <FilesContent
                files={filteredFiles}
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