'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText, Image as ImageIcon, File, Video, Music, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFilesPage } from '@/hooks/useFilesPage';
import { FileItem } from '@/types/files';
import { simpleLogger as logger } from '@/utils/logger';
import RenameInput from '@/components/RenameInput';
import '@/styles/editor-sidebar.css';
import '@/app/private/files/page.css';

/**
 * EditorSidebarFilesList - Liste des fichiers dans la sidebar
 * 
 * Affiche la liste des fichiers uploadés par l'utilisateur
 * - Liste simple avec icônes
 * - Double-clic pour ouvrir
 * - Menu contextuel (à venir)
 * 
 * @module components/editor/EditorSidebarFilesList
 */

interface EditorSidebarFilesListProps {
  /** Callback pour sélectionner un fichier (pour l'instant, on ne gère que les notes) */
  onNoteSelect: (noteId: string) => void;
}

export default function EditorSidebarFilesList({ onNoteSelect }: EditorSidebarFilesListProps) {
  const {
    loading,
    error,
    filteredFiles,
    fetchFiles,
    deleteFile,
    renameFile
  } = useFilesPage();

  // État pour le menu contextuel
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem;
    x: number;
    y: number;
  } | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);

  // Charger les fichiers au montage
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Obtenir l'icône selon le type MIME
  const getFileIcon = useCallback((mimeType?: string) => {
    if (!mimeType) return <File size={16} />;
    
    if (mimeType.startsWith('image/')) {
      return <ImageIcon size={16} />;
    } else if (mimeType.startsWith('video/')) {
      return <Video size={16} />;
    } else if (mimeType.startsWith('audio/')) {
      return <Music size={16} />;
    } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
      return <Archive size={16} />;
    } else {
      return <FileText size={16} />;
    }
  }, []);

  // Handler pour ouvrir un fichier
  const handleFileClick = useCallback((file: FileItem) => {
    // Pour l'instant, on ne gère que les notes
    // Les fichiers seront ouverts dans une modale ou nouvelle page
    logger.dev('[EditorSidebarFilesList] Fichier cliqué:', { fileId: file.id, filename: file.filename });
    
    // TODO: Implémenter l'ouverture des fichiers (images, PDF, etc.)
    if (file.url) {
      window.open(file.url, '_blank');
    }
  }, []);

  // Handler pour le début du drag
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, file: FileItem) => {
    if (!file.url) return;

    const isImage = file.mime_type?.startsWith('image/');
    
    if (isImage) {
      // Pour les images : drag l'image directement
      // Créer une image pour le drag preview
      const dragImage = new Image();
      dragImage.src = file.url;
      dragImage.onload = () => {
        e.dataTransfer.setDragImage(dragImage, dragImage.width / 2, dragImage.height / 2);
      };
      
      // ✅ Type personnalisé pour identifier les images
      const imageMarkdown = `![${file.filename || 'Image'}](${file.url})`;
      e.dataTransfer.setData('application/x-scrivia-image-url', file.url);
      e.dataTransfer.setData('text/uri-list', file.url);
      e.dataTransfer.setData('text/plain', imageMarkdown); // ✅ Markdown d'image au lieu de l'URL seule
      e.dataTransfer.effectAllowed = 'copy';
    } else {
      // Pour les autres fichiers : drag le lien
      e.dataTransfer.setData('application/x-scrivia-file-link', file.url);
      e.dataTransfer.setData('text/uri-list', file.url);
      e.dataTransfer.setData('text/plain', `[${file.filename || 'Fichier'}](${file.url})`);
      e.dataTransfer.effectAllowed = 'copy';
    }
    
    // Ajouter classe pour feedback visuel
    e.currentTarget.classList.add('dragging');
  }, []);

  // Handler pour la fin du drag
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
  }, []);

  // Handler pour le menu contextuel
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      file,
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  // Fermer le menu contextuel
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);

  // Handler pour les actions du menu contextuel
  const handleContextMenuAction = useCallback(async (action: string, file: FileItem) => {
    closeContextMenu();
    
    switch (action) {
      case 'rename':
        setRenamingItemId(file.id);
        break;
      case 'open':
        handleFileClick(file);
        break;
      case 'delete':
        if (window.confirm(`Supprimer "${file.filename}" ?`)) {
          try {
            await deleteFile(file.id);
            await fetchFiles(); // Rafraîchir la liste
            logger.dev('[EditorSidebarFilesList] Fichier supprimé:', file.id);
          } catch (error) {
            logger.error('[EditorSidebarFilesList] Erreur suppression fichier:', error);
          }
        }
        break;
    }
  }, [closeContextMenu, handleFileClick, deleteFile, fetchFiles]);

  // ✅ Trier les fichiers du plus récent au plus vieux (AVANT les conditions de retour)
  const sortedFiles = React.useMemo(() => {
    if (!filteredFiles || filteredFiles.length === 0) return [];
    
    return [...filteredFiles].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Ordre décroissant (plus récent en premier)
    });
  }, [filteredFiles]);

  if (loading) {
    return (
      <div className="editor-sidebar-loading">
        <Loader2 size={20} className="animate-spin" />
        <span>Chargement des fichiers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-sidebar-error">
        Erreur: {error}
      </div>
    );
  }

  if (!sortedFiles || sortedFiles.length === 0) {
    return (
      <div className="editor-sidebar-search-empty">
        Aucun fichier
      </div>
    );
  }

  return (
    <>
      <div className="editor-sidebar-files-list">
        {sortedFiles.slice(0, 50).map((file) => (
          <div
            key={file.id}
            className="editor-sidebar-file-item"
            onClick={() => handleFileClick(file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
            draggable={!!file.url}
            onDragStart={(e) => handleDragStart(e, file)}
            onDragEnd={handleDragEnd}
            style={{
              padding: '10px 12px',
              cursor: 'grab',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
          <div style={{ 
            color: 'var(--text-secondary)',
            flexShrink: 0
          }}>
            {getFileIcon(file.mime_type)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renamingItemId === file.id ? (
              <RenameInput
                initialValue={file.filename || ''}
                onSubmit={async (name) => {
                  setRenamingItemId(null);
                  try {
                    await renameFile(file.id, name);
                    await fetchFiles();
                  } catch (error) {
                    logger.error('[EditorSidebarFilesList] Erreur renommage fichier:', error);
                  }
                }}
                onCancel={() => setRenamingItemId(null)}
                autoFocus
                variant="item"
              />
            ) : (
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {file.filename || 'Fichier sans nom'}
              </div>
            )}
          </div>
        </div>
      ))}
      </div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            className="file-context-menu-react"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 2000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-options">
              <button
                className="context-menu-item"
                onClick={() => handleContextMenuAction('rename', contextMenu.file)}
              >
                ✏️ Renommer
              </button>
              <button
                className="context-menu-item"
                onClick={() => handleContextMenuAction('open', contextMenu.file)}
              >
                👁️ Ouvrir
              </button>
              <button
                className="context-menu-item"
                onClick={() => handleContextMenuAction('delete', contextMenu.file)}
              >
                🗑️ Supprimer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

