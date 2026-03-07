"use client";

import { useState, useCallback, useEffect, useMemo, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { FileItem } from "@/types/files";
import { useFilesPage } from "@/hooks/useFilesPage";
import { useAuth } from "@/hooks/useAuth";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import SearchFiles, { FileFilters, FileSortOptions } from "@/components/SearchFiles";
import UnifiedUploadZone from "@/components/UnifiedUploadZone";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { STORAGE_CONFIG } from "@/config/storage";
import { simpleLogger as logger } from "@/utils/logger";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";
import "@/components/DossierLoadingStates.css";
import { FileText, Upload, Image as ImageIcon, File, FileText as FileTextIcon, Video, Music, Archive, X, Search, LayoutGrid, List, MoreVertical, Filter, Pencil, Eye, Trash2 } from "lucide-react";
import "@/styles/main.css";
import "./index.css";
import "./page.css";
import "./glassmorphism.css";
import { motion, AnimatePresence } from "framer-motion";
import { openImageModal } from "@/components/chat/ImageModal";

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
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
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
    viewMode,
    setViewMode
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

  // Fermer le menu contextuel si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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
        let aValue: string | number, bValue: string | number;
        
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
    const imageUrl = file.preview_url || file.url;
    const isImage =
      file.mime_type?.startsWith('image/') ||
      isImageUrl(imageUrl) ||
      (!!imageUrl && /^photo-/i.test(file.filename || ''));
    if (isImage && imageUrl) {
      openImageModal({
        src: imageUrl,
        fileName: file.filename || 'Image',
        alt: file.filename || undefined
      });
    } else if (file.url) {
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

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenuItem = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 156;
    const menuHeight = 132;
    const padding = 8;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - padding;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    setContextMenu({
      file,
      x,
      y
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

  const statsData = useMemo(() => {
    const fileCount = displayFiles.length;
    const totalBytes = displayFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalMB = Math.round(totalBytes / (1024 * 1024));
    return {
      fileCount,
      totalMB,
      fileCountLabel: `fichier${fileCount > 1 ? 's' : ''}`
    };
  }, [displayFiles]);

  const formatTotalSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

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
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-files w-full max-w-none mx-0 bg-[var(--color-bg-primary)]">
        {/* En-tête de contenu — style Linear (titre gradient + sous-titre) */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-4 pb-0">
          <div className="mb-10 mt-5 flex w-full items-start justify-between">
            <div className="flex flex-col items-start font-sans">
              <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
                Mes Fichiers
              </h1>
              <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
                Vos fichiers et médias stockés dans le cloud.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800/60 bg-zinc-900/50 text-zinc-200 text-xs font-semibold hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-zinc-100 transition-all shadow-sm"
                  title="Filtre"
                >
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Vue grille"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Vue liste"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                <button
                  type="button"
                  onClick={handleUploadFile}
                  disabled={loading}
                  className="flex items-center gap-1.5 h-8 px-3 bg-white text-black hover:bg-neutral-200 rounded-md text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                  <span className="sm:hidden">Upload</span>
                </button>
              </div>
            </div>

            {/* Ligne 2 : Barre de recherche (pleine largeur mobile, max-w-md desktop) */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                type="search"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-[var(--color-border-block)] transition-colors"
                style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
              />
            </div>
          </div>

        {/* Contenu principal */}
        <main className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
          <div className="max-w-screen-2xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <SimpleLoadingState message="Chargement" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">Erreur de chargement</h3>
                <p className="text-sm text-zinc-500">{error}</p>
              </div>
            ) : displayFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-4xl mb-4">📁</div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">Aucun fichier</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  {searchQuery || Object.keys(filters).length > 0
                    ? "Aucun fichier ne correspond à votre recherche"
                    : "Vous n'avez pas encore uploadé de fichiers"}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-4 gap-y-8">
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
                      viewMode="grid"
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/40 disabled:opacity-50"
                    >
                      ← Précédent
                    </button>
                    <span className="text-xs text-zinc-500 font-mono">
                      Page {currentPage} / {totalPages} ({displayFiles.length} fichiers)
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/40 disabled:opacity-50"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col border border-zinc-800/40 rounded-xl overflow-hidden divide-y divide-zinc-800/40">
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
                      viewMode="list"
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/40 disabled:opacity-50"
                    >
                      ← Précédent
                    </button>
                    <span className="text-xs text-zinc-500 font-mono">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/40 disabled:opacity-50"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

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

        {/* Menu contextuel (portal, position corrigée, style Linear) */}
        {contextMenu &&
          createPortal(
            <motion.div
              ref={contextMenuRef}
              className="file-context-menu-react"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 9999,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="file-context-menu-list">
                <button
                  type="button"
                  className="file-context-menu-btn"
                  onClick={() => handleContextMenuAction('rename', contextMenu.file)}
                >
                  <Pencil className="file-context-menu-icon" />
                  Renommer
                </button>
                <button
                  type="button"
                  className="file-context-menu-btn"
                  onClick={() => handleContextMenuAction('open', contextMenu.file)}
                >
                  <Eye className="file-context-menu-icon" />
                  Ouvrir
                </button>
                <button
                  type="button"
                  className="file-context-menu-btn file-context-menu-btn-danger"
                  onClick={() => handleContextMenuAction('delete', contextMenu.file)}
                >
                  <Trash2 className="file-context-menu-icon" />
                  Supprimer
                </button>
              </div>
            </motion.div>,
            document.body
          )}
    </PageWithSidebarLayout>
  );
}

function formatFileDate(createdAt: string | undefined): string {
  if (!createdAt) return '—';
  try {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** True si l’URL pointe vraisemblablement vers une image (extension ou chemin). */
function isImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const host = u.hostname.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?|$)/i.test(path)) return true;
    if (host.includes('unsplash.com') || host.includes('images.unsplash.com')) return true;
    if (path.includes('/photo-') || path.includes('/photos/')) return true;
    return false;
  } catch {
    return /\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?|$)/i.test(url) || /unsplash\.com|\/photo-|\/photos\//i.test(url);
  }
}

const FileItemMemo = memo(({
  file,
  index,
  renamingItemId,
  onFileOpen,
  onFileRename,
  onContextMenuItem,
  onSetRenamingItemId,
  getFileIcon,
  formatFileSize,
  viewMode,
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
  viewMode: 'grid' | 'list';
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

  const openOptionsMenu = useCallback((e: React.MouseEvent) => {
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

  const imagePreviewUrl = file.preview_url || file.url;
  const looksLikeImage =
    file.mime_type?.startsWith('image/') ||
    isImageUrl(imagePreviewUrl) ||
    (!!imagePreviewUrl && /^photo-/i.test(file.filename || ''));
  const showImagePreview = !!imagePreviewUrl && looksLikeImage;
  const sizeStr = formatFileSize(file.size || 0);
  const dateStr = formatFileDate(file.created_at);

  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleFileOpen}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => { if (e.key === 'Enter') handleFileOpen(); }}
        className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/20 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-zinc-900/20 border border-zinc-800/40 flex items-center justify-center shrink-0 overflow-hidden">
          {showImagePreview ? (
            <img src={imagePreviewUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <FileText className="w-4 h-4 text-zinc-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {renamingItemId === file.id ? (
            <input
              type="text"
              defaultValue={file.filename || ''}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              autoFocus
              className="w-full bg-zinc-800/40 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          ) : (
            <span className="text-sm font-medium text-zinc-200 truncate block">{file.filename || 'Fichier sans nom'}</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-14 text-right">{sizeStr}</span>
        <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-20 text-right">{dateStr}</span>
        <button
          type="button"
          onClick={openOptionsMenu}
          className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors shrink-0"
          aria-label="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="group flex flex-col gap-2 cursor-pointer"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.02, 0.3) }}
      onClick={handleFileOpen}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 1. Conteneur de l'image (Bounding Box Linear-Style) */}
      <div className="relative aspect-square w-full rounded-xl bg-[#141414] border border-white/[0.05] overflow-hidden">
        {showImagePreview ? (
          <>
            <img
              src={imagePreviewUrl}
              alt={file.filename || ''}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).classList.remove('hidden');
              }}
            />
            <div className="absolute inset-0 hidden flex items-center justify-center bg-[#141414]" aria-hidden>
              {getFileIcon(file.id, file.mime_type)}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-zinc-400 fill-zinc-500/10 group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        {/* Bouton Menu Kebab (Glassmorphism, visible au survol) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openOptionsMenu(e); }}
          className="absolute top-2 right-2 w-7 h-7 bg-black/40 backdrop-blur-md border border-white/[0.1] rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60 text-white z-10"
          aria-label="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Métadonnées (Texte en dessous, centré) */}
      <div className="flex flex-col px-1 min-w-0 items-center text-center">
        {renamingItemId === file.id ? (
          <input
            type="text"
            defaultValue={file.filename || ''}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            autoFocus
            className="w-full bg-zinc-800/40 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500 text-center"
          />
        ) : (
          <span className="text-sm font-medium text-neutral-200 truncate w-full" title={file.filename || 'Fichier sans nom'}>
            {file.filename || 'Fichier sans nom'}
          </span>
        )}
        <span className="text-[11px] text-neutral-500 mt-0.5 tracking-wide">
          {sizeStr}
        </span>
      </div>
    </motion.div>
  );
}); 