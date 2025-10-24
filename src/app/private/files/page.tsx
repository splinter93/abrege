"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import SearchFiles, { FileFilters, FileSortOptions } from "@/components/SearchFiles";
import UnifiedUploadZone from "@/components/UnifiedUploadZone";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { STORAGE_CONFIG } from "@/config/storage";
import { simpleLogger as logger } from "@/utils/logger";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { FileText, Upload, Image as ImageIcon, File, FileText as FileTextIcon, Video, Music, Archive, X } from "lucide-react";
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

  const { getAccessToken } = useAuth();

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
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem;
    x: number;
    y: number;
  } | null>(null);

  // Synchroniser la recherche avec le hook
  useEffect(() => {
    setSearchQuery(searchTerm);
  }, [searchTerm]);

  // Fonction pour fermer le menu contextuel
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Fermer le menu contextuel si on clique ailleurs
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

  // 🔧 OPTIMISATION: Cache unifié pour les métadonnées de fichiers
  const fileMetadataCache = useMemo(() => {
    const cache = new Map<string, {
      mimeType: string;
      filename: string;
      fileType: string;
      icon: React.ReactNode;
    }>();
    
    const iconSize = 24;
    
    filteredFiles.forEach(file => {
      const mimeType = file.mime_type?.toLowerCase() || '';
      const filename = file.filename?.toLowerCase() || '';
      
      // Déterminer le type de fichier
      let fileType = 'other';
      if (mimeType.startsWith('image/')) fileType = 'image';
      else if (mimeType.startsWith('video/')) fileType = 'video';
      else if (mimeType.startsWith('audio/')) fileType = 'audio';
      else if (mimeType.includes('pdf')) fileType = 'pdf';
      else if (mimeType.includes('word') || mimeType.includes('document') || filename.endsWith('.doc') || filename.endsWith('.docx')) fileType = 'document';
      else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) fileType = 'spreadsheet';
      else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) fileType = 'presentation';
      else if (mimeType.includes('zip') || mimeType.includes('archive') || filename.endsWith('.zip') || filename.endsWith('.rar')) fileType = 'archive';
      else if (mimeType.includes('text/')) fileType = 'text';
      
      // Déterminer l'icône
      let icon: React.ReactNode;
      switch (fileType) {
        case 'image': icon = <ImageIcon size={iconSize} />; break;
        case 'video': icon = <Video size={iconSize} />; break;
        case 'audio': icon = <Music size={iconSize} />; break;
        case 'pdf':
        case 'document':
        case 'spreadsheet':
        case 'presentation':
        case 'text': icon = <FileTextIcon size={iconSize} />; break;
        case 'archive': icon = <Archive size={iconSize} />; break;
        default: icon = <File size={iconSize} />; break;
      }
      
      cache.set(file.id, {
        mimeType,
        filename,
        fileType,
        icon
      });
    });
    
    return cache;
  }, [filteredFiles]);

  // 🔧 OPTIMISATION: Fonction de filtrage simplifiée
  const filterFile = useCallback((file: FileItem, searchTerm: string, typeFilter?: string): boolean => {
    const metadata = fileMetadataCache.get(file.id);
    if (!metadata) return false;

    // Filtre par recherche textuelle
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!metadata.filename.includes(searchLower) && !metadata.mimeType.includes(searchLower)) {
        return false;
      }
    }

    // Filtre par type
    if (typeFilter) {
      switch (typeFilter) {
        case 'image': return metadata.fileType === 'image';
        case 'pdf': return metadata.fileType === 'pdf';
        case 'document': return metadata.fileType === 'document';
        case 'video': return metadata.fileType === 'video';
        case 'audio': return metadata.fileType === 'audio';
        case 'archive': return metadata.fileType === 'archive';
        default: return true;
      }
    }

    return true;
  }, [fileMetadataCache]);

  // Filtrer les fichiers selon la recherche et les filtres
  const displayFiles = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const typeFilter = filters.type;
    
    let files = filteredFiles.filter(file => filterFile(file, searchTerm, typeFilter));

    // Tri optimisé
    if (sortOptions.field !== 'created_at' || sortOptions.order !== 'desc') {
      files.sort((a, b) => {
        let aValue: unknown, bValue: unknown;
        
        switch (sortOptions.field) {
          case 'filename':
            aValue = fileMetadataCache.get(a.id)?.filename || '';
            bValue = fileMetadataCache.get(b.id)?.filename || '';
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
  }, [filteredFiles, searchQuery, filters.type, sortOptions, filterFile, fileMetadataCache]);

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

  // Fonction pour obtenir l'icône selon le type MIME - optimisée avec cache unifié
  const getFileIcon = useCallback((fileId: string, mimeType?: string): React.ReactNode => {
    // Utiliser le cache unifié si disponible
    const metadata = fileMetadataCache.get(fileId);
    if (metadata) {
      return metadata.icon;
    }
    
    // Fallback pour les nouveaux fichiers (rare)
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
  }, [fileMetadataCache]);

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
        logger.warn('[FilesPage] Tentative de renommage avec nom vide');
        handleError(new Error('Le nom du fichier ne peut pas être vide'), 'validation renommage');
        return;
      }

      if (newName.length > 255) {
        logger.warn('[FilesPage] Tentative de renommage avec nom trop long:', newName.length);
        handleError(new Error('Le nom du fichier est trop long (maximum 255 caractères)'), 'validation renommage');
        return;
      }

      // Caractères interdits
      const invalidChars = /[<>:"/\\|?*]/;
      if (invalidChars.test(newName)) {
        logger.warn('[FilesPage] Tentative de renommage avec caractères interdits:', newName);
        handleError(new Error('Le nom du fichier contient des caractères interdits: < > : " / \\ | ? *'), 'validation renommage');
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
          logger.warn('[FilesPage] Tentative de renommage avec nom existant:', newName);
          handleError(new Error('Un fichier avec ce nom existe déjà dans ce dossier'), 'validation renommage');
          return;
        }
      }

      await renameFile(fileId, newName.trim());
      setRenamingItemId(null);
      logger.dev('[FilesPage] Fichier renommé avec succès:', fileId, '->', newName);
    } catch (error) {
      logger.error('[FilesPage] Erreur renommage fichier:', error);
      handleError(error, 'renommage fichier');
    }
  }, [renameFile, handleError, displayFiles]);

  const handleUploadFile = useCallback(() => {
    setShowUploader(prev => !prev);
  }, []);

  const handleUploadComplete = useCallback(() => {
    // Rafraîchir la liste des fichiers
    fetchFiles();
    // Masquer l'uploader
    setShowUploader(false);
  }, [fetchFiles]);

  const handleUploadError = useCallback((error: string) => {
    handleError(error, 'upload fichier');
  }, [handleError]);

  // Fonction utilitaire pour déterminer le type MIME
  const getMimeTypeFromExtension = useCallback((extension: string): string => {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }, []);

  // Fonction utilitaire pour uploader un fichier
  const uploadSingleFile = useCallback(async (file: File) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('Session d\'authentification expirée. Veuillez vous reconnecter.');
    }

    // 1. Initier l'upload
    const uploadResponse = await fetch('/api/ui/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      const errorMessage = errorData.error || 'Erreur lors de l\'initiation de l\'upload';
      
      // ✅ Détecter l'erreur de fichier dupliqué
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        throw new Error(`Le fichier "${file.name}" existe déjà. Veuillez le renommer ou supprimer l'ancien.`);
      }
      
      throw new Error(errorMessage);
    }

    const uploadData = await uploadResponse.json();

    // 2. Upload vers S3
    const s3Response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!s3Response.ok) {
      throw new Error('Erreur lors de l\'upload vers S3');
    }

    logger.dev('[FilesPage] Fichier uploadé avec succès:', file.name);
  }, [getAccessToken]);

  // Fonction utilitaire pour uploader une URL externe
  const uploadExternalUrl = useCallback(async (url: string, fileName: string, mimeType: string) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('Session d\'authentification expirée. Veuillez vous reconnecter.');
    }

    const response = await fetch('/api/ui/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        externalUrl: url,
        fileName: fileName,
        fileType: mimeType,
        fileSize: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l\'enregistrement de l\'URL');
    }

    logger.dev('[FilesPage] URL externe enregistrée avec succès:', url);
  }, [getAccessToken]);

  // Handler pour les fichiers sélectionnés via UnifiedUploadZone
  const handleFileSelect = useCallback(async (files: File[]) => {
    try {
      logger.dev('[FilesPage] Fichiers sélectionnés:', files);
      
      // Valider chaque fichier
      for (const file of files) {
        if (file.size > STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE) {
          throw new Error(`Fichier "${file.name}" trop volumineux (max: ${Math.round(STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024))} MB)`);
        }
        
        // ✅ Vérifier le MIME type avec support des wildcards (image/*, text/*)
        const isAllowed = STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES.some(allowed => {
          if (allowed.endsWith('/*')) {
            const prefix = allowed.slice(0, -2); // 'image/*' → 'image'
            return file.type.startsWith(prefix + '/');
          }
          return file.type === allowed;
        });
        
        if (!isAllowed) {
          throw new Error(`Type de fichier "${file.type}" non autorisé`);
        }
      }

      // Uploader chaque fichier
      for (const file of files) {
        await uploadSingleFile(file);
      }

      // Rafraîchir la liste et fermer la modale
      await fetchFiles();
      setShowUploader(false);
      
    } catch (error) {
      handleError(error, 'upload fichiers');
    }
  }, [handleError, fetchFiles, uploadSingleFile]);

  // Handler pour les URLs soumises via UnifiedUploadZone
  const handleUrlSubmit = useCallback(async (url: string) => {
    try {
      logger.dev('[FilesPage] URL soumise:', url);
      
      // Valider l'URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('URL invalide. Seules les URLs HTTP/HTTPS sont autorisées.');
      }

      // Extraire le nom de fichier de l'URL
      const fileName = urlObj.pathname.split('/').pop() || 'fichier_externe';
      const fileExtension = fileName.split('.').pop() || '';
      
      // Déterminer le type MIME basé sur l'extension
      const mimeType = getMimeTypeFromExtension(fileExtension);

      await uploadExternalUrl(url, fileName, mimeType);

      // Rafraîchir la liste et fermer la modale
      await fetchFiles();
      setShowUploader(false);
      
    } catch (error) {
      handleError(error, 'upload URL');
    }
  }, [handleError, fetchFiles, uploadExternalUrl, getMimeTypeFromExtension]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    
    // TODO: Remplacer par un composant de confirmation modal
    if (confirm(`Voulez-vous vraiment supprimer ${selectedFiles.size} fichier(s) ?`)) {
      const filesToDelete = Array.from(selectedFiles);
      logger.dev('[FilesPage] Suppression en lot de fichiers:', filesToDelete.length);
      
      const promises = filesToDelete.map(async (fileId) => {
        try {
          await deleteFile(fileId);
          setSelectedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileId);
            return newSet;
          });
          logger.dev('[FilesPage] Fichier supprimé:', fileId);
        } catch (error) {
          logger.error('[FilesPage] Erreur suppression fichier:', error);
          handleError(error, 'suppression fichier');
        }
      });
      await Promise.all(promises);
      logger.dev('[FilesPage] Suppression en lot terminée');
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
    
    setContextMenu({
      file,
      x: e.clientX,
      y: e.clientY
    });
    
    logger.dev('[FilesPage] Menu contextuel affiché pour:', file.filename);
  }, []);

  const handleContextMenuAction = useCallback(async (action: string, file: FileItem) => {
    closeContextMenu();
    
    switch (action) {
      case 'rename':
        setRenamingItemId(file.id);
        break;
      case 'open':
        handleFileOpen(file);
        break;
      case 'delete':
        // TODO: Remplacer par un composant de confirmation modal
        if (confirm(`Supprimer "${file.filename}" ?`)) {
          try {
            await deleteFile(file.id);
            logger.dev('[FilesPage] Fichier supprimé via menu contextuel:', file.id);
          } catch (error) {
            logger.error('[FilesPage] Erreur suppression fichier via menu contextuel:', error);
            handleError(error, 'suppression fichier');
          }
        }
        break;
    }
  }, [closeContextMenu, handleFileOpen, deleteFile]);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
  }, []);

  // 🔧 OPTIMISATION: Mémoiser tous les calculs de stats
  const statsData = useMemo(() => {
    const fileCount = displayFiles.length;
    const usedMB = quotaInfo ? Math.round(quotaInfo.usedBytes / (1024 * 1024)) : 0;
    const usagePercentage = quotaInfo ? Math.round((quotaInfo.usedBytes / quotaInfo.quotaBytes) * 100) : 0;
    
    return {
      fileCount,
      usedMB,
      usagePercentage,
      fileCountLabel: `fichier${fileCount > 1 ? 's' : ''}`
    };
  }, [displayFiles.length, quotaInfo]);

  // 🔧 OPTIMISATION: Mémoiser les formats supportés (statique)
  const supportedFormats = useMemo(() => {
    const formats = STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES;
    const simplified: string[] = [];
    
    // Grouper les formats par catégorie
    const hasImages = formats.some(f => f.includes('image'));
    const hasPdf = formats.some(f => f.includes('pdf'));
    const hasText = formats.some(f => f.includes('text'));
    const hasOffice = formats.some(f => f.includes('msword') || f.includes('openxml') || f.includes('excel') || f.includes('powerpoint'));
    
    if (hasImages) simplified.push('Images');
    if (hasPdf) simplified.push('PDF');
    if (hasText) simplified.push('Texte');
    if (hasOffice) simplified.push('Office (Word, Excel, PowerPoint)');
    
    return simplified.join(', ');
  }, []);

  // 🔧 OPTIMISATION: Mémoiser la taille maximale (statique)
  const maxFileSizeMB = useMemo(() => 
    Math.round(STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)),
    []
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
            { number: statsData.fileCount, label: statsData.fileCountLabel },
            { number: statsData.usedMB, label: 'MB' }
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
                {/* Header de la modale */}
                <div className="uploader-modal-header">
                  <h2 className="uploader-modal-title">Upload de fichiers</h2>
                  <button 
                    className="uploader-modal-close"
                    onClick={() => setShowUploader(false)}
                    aria-label="Fermer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Contenu de la modale */}
                <div className="uploader-modal-body">
                  <UnifiedUploadZone
                    placeholder="Coller l'URL du fichier à importer..."
                    onFileSelect={handleFileSelect}
                    onUrlSubmit={handleUrlSubmit}
                    accept={STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES.join(',')}
                    multiple={true}
                    showUrlInput={true}
                    showDropZone={true}
                  />
                </div>

                {/* Footer de la modale */}
                <div className="uploader-modal-footer">
                  <p className="uploader-modal-hint">
                    Formats supportés : {supportedFormats}
                  </p>
                  <p className="uploader-modal-hint">
                    Taille maximale : {maxFileSizeMB} MB
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu contextuel optimisé */}
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