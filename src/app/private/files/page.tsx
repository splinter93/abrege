"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import SearchFiles, { FileFilters, FileSortOptions } from "@/components/SearchFiles";
import FileUploaderLocal from "./FileUploaderLocal";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { STORAGE_CONFIG } from "@/config/storage";
import { simpleLogger as logger } from "@/utils/logger";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { FileText, Upload, Image as ImageIcon, File, FileText as FileTextIcon, Video, Music, Archive } from "lucide-react";
import "@/styles/main.css";
import "./index.css";
import "./page.css";
import "./glassmorphism.css";
import { motion, AnimatePresence } from "framer-motion";

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
          <UnifiedSidebar />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [filters, setFilters] = useState<FileFilters>({});
  const [sortOptions, setSortOptions] = useState<FileSortOptions>({
    field: 'created_at',
    order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 50; // Limiter à 50 fichiers par page

  // Synchroniser la recherche avec le hook
  useEffect(() => {
    setSearchQuery(searchTerm);
  }, [searchTerm]);

  // 🔧 OPTIMISATION: Cache pour les types MIME et noms de fichiers
  const fileTypeCache = useMemo(() => {
    const cache = new Map<string, string>();
    filteredFiles.forEach(file => {
      if (file.mime_type) cache.set(file.id, file.mime_type.toLowerCase());
    });
    return cache;
  }, [filteredFiles]);

  const filenameCache = useMemo(() => {
    const cache = new Map<string, string>();
    filteredFiles.forEach(file => {
      if (file.filename) cache.set(file.id, file.filename.toLowerCase());
    });
    return cache;
  }, [filteredFiles]);

  // 🔧 OPTIMISATION: Fonction de filtrage optimisée
  const filterFile = useCallback((file: FileItem, searchTerm: string, typeFilter?: string): boolean => {
    // Filtre par recherche textuelle
    if (searchTerm) {
      const filename = filenameCache.get(file.id) || '';
      const mimeType = fileTypeCache.get(file.id) || '';
      if (!filename.includes(searchTerm) && !mimeType.includes(searchTerm)) {
        return false;
      }
    }

    // Filtre par type
    if (typeFilter) {
      const mimeType = fileTypeCache.get(file.id) || '';
      const filename = filenameCache.get(file.id) || '';
      
      switch (typeFilter) {
        case 'image':
          return mimeType.startsWith('image/');
        case 'pdf':
          return mimeType.includes('pdf') || filename.endsWith('.pdf');
        case 'document':
          return mimeType.includes('word') || mimeType.includes('document') || 
                 filename.endsWith('.doc') || filename.endsWith('.docx');
        case 'video':
          return mimeType.startsWith('video/');
        case 'audio':
          return mimeType.startsWith('audio/');
        case 'archive':
          return mimeType.includes('zip') || mimeType.includes('archive') ||
                 filename.endsWith('.zip') || filename.endsWith('.rar');
        default:
          return true;
      }
    }

    return true;
  }, [fileTypeCache, filenameCache]);

  // Filtrer les fichiers selon la recherche et les filtres
  const displayFiles = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const typeFilter = filters.type;
    
    let files = filteredFiles.filter(file => filterFile(file, searchTerm, typeFilter));

    // Tri optimisé
    if (sortOptions.field !== 'created_at' || sortOptions.order !== 'desc') {
      files.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortOptions.field) {
          case 'filename':
            aValue = filenameCache.get(a.id) || '';
            bValue = filenameCache.get(b.id) || '';
            break;
          case 'size':
            aValue = a.size || 0;
            bValue = b.size || 0;
            break;
          case 'created_at':
            aValue = new Date(a.created_at || 0).getTime();
            bValue = new Date(b.created_at || 0).getTime();
            break;
          default:
            return 0;
        }

        if (sortOptions.order === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return files;
  }, [filteredFiles, searchQuery, filters.type, sortOptions, filterFile, fileTypeCache, filenameCache]);

  // Pagination des fichiers pour les performances
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    return displayFiles.slice(startIndex, endIndex);
  }, [displayFiles, currentPage, filesPerPage]);

  const totalPages = Math.ceil(displayFiles.length / filesPerPage);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortOptions]);

  // 🔧 OPTIMISATION: Cache pour les icônes de fichiers
  const iconCache = useMemo(() => {
    const cache = new Map<string, React.ReactNode>();
    const iconSize = 24;
    
    filteredFiles.forEach(file => {
      if (file.mime_type) {
        const type = file.mime_type.toLowerCase();
        let icon: React.ReactNode;
        
        if (type.startsWith('image/')) icon = <ImageIcon size={iconSize} />;
        else if (type.startsWith('video/')) icon = <Video size={iconSize} />;
        else if (type.startsWith('audio/')) icon = <Music size={iconSize} />;
        else if (type.includes('pdf')) icon = <FileTextIcon size={iconSize} />;
        else if (type.includes('word') || type.includes('document')) icon = <FileTextIcon size={iconSize} />;
        else if (type.includes('excel') || type.includes('spreadsheet')) icon = <FileTextIcon size={iconSize} />;
        else if (type.includes('powerpoint') || type.includes('presentation')) icon = <FileTextIcon size={iconSize} />;
        else if (type.includes('zip') || type.includes('archive')) icon = <Archive size={iconSize} />;
        else if (type.includes('text/')) icon = <FileTextIcon size={iconSize} />;
        else icon = <File size={iconSize} />;
        
        cache.set(file.id, icon);
      }
    });
    
    return cache;
  }, [filteredFiles]);

  // Fonction pour obtenir l'icône selon le type MIME - optimisée avec cache
  const getFileIcon = useCallback((fileId: string, mimeType?: string): React.ReactNode => {
    // Utiliser le cache si disponible
    if (iconCache.has(fileId)) {
      return iconCache.get(fileId);
    }
    
    // Fallback pour les nouveaux fichiers
    const type = mimeType?.toLowerCase() || '';
    const iconSize = 24;
    
    if (type.startsWith('image/')) return <ImageIcon size={iconSize} />;
    if (type.startsWith('video/')) return <Video size={iconSize} />;
    if (type.startsWith('audio/')) return <Music size={iconSize} />;
    if (type.includes('pdf')) return <FileTextIcon size={iconSize} />;
    if (type.includes('word') || type.includes('document')) return <FileTextIcon size={iconSize} />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FileTextIcon size={iconSize} />;
    if (type.includes('powerpoint') || type.includes('presentation')) return <FileTextIcon size={iconSize} />;
    if (type.includes('zip') || type.includes('archive')) return <Archive size={iconSize} />;
    if (type.includes('text/')) return <FileTextIcon size={iconSize} />;
    
    return <File size={iconSize} />;
  }, [iconCache]);

  // Fonction pour formater la taille de fichier
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

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
    
    // Créer le menu contextuel avec le style glassmorphism
    const contextMenu = document.createElement('div');
    contextMenu.className = 'file-context-menu context-menu-container';
    contextMenu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      z-index: 2000;
      min-width: 140px;
      background: rgba(15, 15, 15, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      padding: 8px 0;
      color: #ffffff;
      font-family: 'Noto Sans', Inter, Arial, sans-serif;
      font-size: 13px;
      font-weight: 400;
      user-select: none;
      animation: fadeInMenu 0.2s ease-out;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      overflow: hidden;
    `;

    // Ajouter l'effet de gradient glassmorphique
    const gradient = document.createElement('div');
    gradient.className = 'context-menu-gradient';
    gradient.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.05) 0%, 
        rgba(255, 255, 255, 0.01) 50%, 
        rgba(255, 255, 255, 0.05) 100%);
      opacity: 0.8;
      pointer-events: none;
      z-index: 1;
      border-radius: 12px;
    `;
    contextMenu.appendChild(gradient);

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

    // Créer les éléments du menu avec le style glassmorphism
    options.forEach(option => {
      const item = document.createElement('button');
      item.className = 'context-menu-item';
      item.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        font-size: 13px;
        font-weight: 400;
        border-radius: 8px;
        transition: all 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        color: #ffffff;
        margin: 2px 6px;
        position: relative;
        z-index: 2;
      `;
      item.innerHTML = `<span class="context-menu-item-text">${option.icon} ${option.label}</span>`;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
        item.style.color = '#ffffff';
        item.style.transform = 'translateX(2px)';
        item.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
        item.style.color = '#ffffff';
        item.style.transform = 'translateX(0)';
        item.style.boxShadow = 'none';
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
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
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

        {/* Container glassmorphism principal */}
        <motion.div 
          className="files-glass-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
          {/* Header avec recherche et upload */}
          <div className="files-glass-header">
            <div className="files-search-section">
              <SearchFiles
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilters}
                onSortChange={setSortOptions}
                placeholder="Rechercher des fichiers..."
                disabled={loading}
              />
            </div>
            
            <div className="files-upload-section">
              <button 
                className="files-upload-btn"
                onClick={handleUploadFile}
                disabled={loading}
              >
                <div className="files-upload-icon">
                  <Upload size={18} />
              </div>
                <span className="files-upload-text">Upload</span>
              </button>
            </div>
          </div>

          {/* Contenu des fichiers */}
          <div className="files-glass-content">
              {loading ? (
              <div className="files-loading-state">
                <div className="files-loading-spinner">⏳</div>
                  <p>Chargement des fichiers...</p>
                </div>
              ) : error ? (
              <div className="files-error-state">
                <div className="files-error-icon">⚠️</div>
                  <h3>Erreur de chargement</h3>
                  <p>{error}</p>
                </div>
            ) : displayFiles.length === 0 ? (
              <div className="files-empty-state">
                <div className="files-empty-icon">📁</div>
                <div className="files-empty-title">Aucun fichier</div>
                <div className="files-empty-subtitle">
                  {searchQuery || Object.keys(filters).length > 0 
                    ? "Aucun fichier ne correspond à votre recherche" 
                    : "Vous n'avez pas encore uploadé de fichiers"}
                </div>
                </div>
              ) : (
                <>
                <div className="files-grid-container">
                  {paginatedFiles.map((file, index) => (
                    <FileItemMemo
                      key={file.id}
                      file={file}
                      index={index}
                      renamingItemId={renamingItemId}
                      onFileOpen={handleFileOpen}
                      onFileRename={handleFileRename}
                      onContextMenuItem={handleContextMenuItem}
                      onSetRenamingItemId={setRenamingItemId}
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="files-pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      ← Précédent
                    </button>
                    
                    <span className="pagination-info">
                      Page {currentPage} sur {totalPages} ({displayFiles.length} fichiers)
                    </span>
                    
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Uploader modal */}
                  <AnimatePresence>
                    {showUploader && (
                      <motion.div
              className="uploader-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploader(false)}
            >
              <motion.div
                className="uploader-modal-content"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                      >
                        <FileUploaderLocal
                          onUploadComplete={handleUploadComplete}
                          onUploadError={handleUploadError}
                          maxFileSize={STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE}
                          allowedTypes={[...STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES]}
                          multiple={true}
                        />
              </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
      </main>
    </div>
  );
}

// 🔧 OPTIMISATION: Composant mémorisé pour les éléments de fichier
const FileItemMemo = memo(({ 
  file, 
  index, 
  renamingItemId, 
  onFileOpen, 
  onFileRename, 
  onContextMenuItem, 
  onSetRenamingItemId, 
  getFileIcon, 
  formatFileSize 
}: {
  file: FileItem;
  index: number;
  renamingItemId: string | null;
  onFileOpen: (file: FileItem) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onContextMenuItem: (e: React.MouseEvent, file: FileItem) => void;
  onSetRenamingItemId: (id: string | null) => void;
  getFileIcon: (fileId: string, mimeType?: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFileRename(file.id, e.currentTarget.value);
    } else if (e.key === 'Escape') {
      onSetRenamingItemId(null);
    }
  }, [file.id, onFileRename, onSetRenamingItemId]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onFileRename(file.id, e.target.value);
  }, [file.id, onFileRename]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuItem(e, file);
  }, [file, onContextMenuItem]);

  const handleFileOpen = useCallback(() => {
    onFileOpen(file);
  }, [file, onFileOpen]);

  const handleDoubleClick = useCallback(() => {
    onFileRename(file.id, file.filename || '');
  }, [file.id, file.filename, onFileRename]);

  return (
    <motion.div
      className="file-item-glass"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut",
        delay: Math.min(index * 0.02, 0.3) // Stagger limité
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleFileOpen}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {file.mime_type?.startsWith('image/') ? (
        <div className="file-image-preview-glass">
          <img
            src={file.url}
            alt={file.filename || 'Aperçu'}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="file-icon-glass hidden">
            {getFileIcon(file.id, file.mime_type)}
          </div>
        </div>
      ) : (
        <div className="file-icon-glass">
          {getFileIcon(file.id, file.mime_type)}
        </div>
      )}
      
      <div className="file-name-glass">
        {renamingItemId === file.id ? (
          <input
            type="text"
            defaultValue={file.filename || ''}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            autoFocus
            className="file-rename-input"
          />
        ) : (
          file.filename || 'Fichier sans nom'
        )}
      </div>
      
      <div className="file-meta-glass">
        {formatFileSize(file.size || 0)}
      </div>
    </motion.div>
  );
}); 