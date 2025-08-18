"use client";

import { useState, useCallback } from "react";
import { FileItem } from "@/hooks/useFilesPage";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import FilesContent from "@/components/FilesContent";
import FilesToolbar, { ViewMode } from "@/components/FilesToolbar";
import "./index.css";

export default function FilesPage() {
  const { user } = useAuth();
  const {
    loading,
    error,
    files,
    fetchFiles,
    deleteFile,
    renameFile,
  } = useFilesPage(user?.id || '');

  // État local pour la gestion de l'interface
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);

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
      console.error('Erreur lors de la suppression:', error);
    }
  }, [deleteFile]);

  const handleFileRename = useCallback(async (fileId: string, newName: string) => {
    try {
      await renameFile(fileId, newName);
      setRenamingItemId(null);
    } catch (error) {
      console.error('Erreur lors du renommage:', error);
    }
  }, [renameFile]);

  const handleUploadFile = useCallback(() => {
    // TODO: Implémenter l'upload de fichier
    console.log('Upload de fichier à implémenter');
  }, []);

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
        console.error('Erreur lors de la suppression multiple:', error);
      }
    }
  }, [selectedFiles, deleteFile]);

  const handleRenameSelected = useCallback(() => {
    if (selectedFiles.size === 1) {
      const fileId = Array.from(selectedFiles)[0];
      setRenamingItemId(fileId);
    }
  }, [selectedFiles]);

  const handleContextMenuItem = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    // TODO: Implémenter le menu contextuel
    console.log('Menu contextuel pour:', file);
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
              
              <FilesContent
                files={filteredFiles}
                loading={loading}
                error={error}
                onFileOpen={handleFileOpen}
                onFileDelete={handleFileDelete}
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