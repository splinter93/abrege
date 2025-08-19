import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileItem } from '@/types/files';
import ImageModal from './ImageModal';
import './FilesContent.css';
import './FolderGridItems.css';
import { 
  contentVariants, 
  loadingVariants, 
  errorVariants, 
  emptyStateVariants,
  fileListVariants,
  gridRowVariants,
  gridColumnVariants
} from './FolderAnimation';

interface FilesContentProps {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  onFileOpen: (file: FileItem) => void;
  onFileRename: (fileId: string, newName: string) => void;
  renamingItemId?: string | null;
  onCancelRename?: () => void;
  onContextMenuItem?: (e: React.MouseEvent, item: FileItem) => void;
  emptyMessage?: React.ReactNode;
  viewMode?: 'grid' | 'list';
}

// Fonction pour obtenir l'icône selon le type MIME
const getFileIcon = (mimeType: string): string => {
  const type = mimeType || '';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
  if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
  if (type.includes('zip') || type.includes('archive')) return '📦';
  if (type.includes('text/')) return '📄';
  return '📁';
};

// Composant pour l'aperçu d'image
const ImagePreview = ({ file }: { file: FileItem }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="file-icon">
        {getFileIcon(file.mime_type || '')}
      </div>
    );
  }

  return (
    <div className="file-image-preview">
      <img
        src={file.url}
        alt={file.filename || 'Aperçu'}
        className={`preview-image ${imageLoaded ? 'loaded' : ''}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
      {!imageLoaded && !imageError && (
        <div className="preview-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

// Fonction pour formater la taille du fichier
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FilesContent: React.FC<FilesContentProps> = ({
  files,
  loading,
  error,
  onFileOpen,
  onFileRename,
  renamingItemId,
  onCancelRename,
  onContextMenuItem,
  emptyMessage,
  viewMode = 'grid',
}) => {
  // État pour la modal d'image
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName: string;
    currentIndex: number;
  }>({
    isOpen: false,
    imageUrl: '',
    imageName: '',
    currentIndex: 0,
  });

  // Robustesse : toujours un tableau pour éviter les erreurs React
  const safeFiles = Array.isArray(files) ? files : [];

  if (loading) {
    return (
      <motion.div 
        className="files-content-loading"
        variants={loadingVariants}
        initial="initial"
        animate="animate"
      >
        <div className="files-loading-spinner">⏳</div>
        <span>Chargement des fichiers…</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="files-content-error"
        variants={errorVariants}
        initial="initial"
        animate="animate"
      >
        <span className="files-error-icon">😕</span>
        <span>Une erreur est survenue lors du chargement des fichiers.</span>
      </motion.div>
    );
  }

  if (safeFiles.length === 0) {
    return (
      emptyMessage ? (
        emptyMessage
      ) : (
        <motion.div 
          className="files-content-empty"
          variants={emptyStateVariants}
          initial="initial"
          animate="animate"
        >
          <div className="files-empty-icon">📁</div>
          <div className="files-empty-title">Aucun fichier</div>
          <div className="files-empty-subtitle">Vous n&apos;avez pas encore uploadé de fichiers.</div>
        </motion.div>
      )
    );
  }

  const handleFileClick = (file: FileItem) => {
    // Si c'est une image, ouvrir la modal
    if (file.mime_type?.startsWith('image/')) {
      const imageFiles = safeFiles.filter(f => f.mime_type?.startsWith('image/'));
      const currentIndex = imageFiles.findIndex(f => f.id === file.id);
      setImageModal({
        isOpen: true,
        imageUrl: file.url,
        imageName: file.filename || 'Image',
        currentIndex,
      });
    } else {
      // Pour les autres types de fichiers, utiliser le comportement par défaut
      onFileOpen(file);
    }
  };

  const handleFileDoubleClick = (file: FileItem) => {
    // Ouvrir le fichier dans un nouvel onglet
    window.open(file.url, '_blank');
  };

  const handleCloseImageModal = () => {
    setImageModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleOpenImageInNewTab = () => {
    window.open(imageModal.imageUrl, '_blank');
  };

  const handlePreviousImage = () => {
    const imageFiles = safeFiles.filter(f => f.mime_type?.startsWith('image/'));
    const newIndex = imageModal.currentIndex > 0 ? imageModal.currentIndex - 1 : imageFiles.length - 1;
    const newFile = imageFiles[newIndex];
    setImageModal({
      isOpen: true,
      imageUrl: newFile.url,
      imageName: newFile.filename || 'Image',
      currentIndex: newIndex,
    });
  };

  const handleNextImage = () => {
    const imageFiles = safeFiles.filter(f => f.mime_type?.startsWith('image/'));
    const newIndex = imageModal.currentIndex < imageFiles.length - 1 ? imageModal.currentIndex + 1 : 0;
    const newFile = imageFiles[newIndex];
    setImageModal({
      isOpen: true,
      imageUrl: newFile.url,
      imageName: newFile.filename || 'Image',
      currentIndex: newIndex,
    });
  };

  return (
    <motion.div 
      className="files-content-container"
      variants={contentVariants}
      initial="initial"
      animate="animate"
    >
      {viewMode === 'grid' ? (
        <motion.div 
          className="files-grid"
          variants={fileListVariants}
          initial="initial"
          animate="animate"
        >
          {safeFiles.map((file) => (
            <motion.div
              key={file.id}
              className="file-grid-item"
              variants={gridColumnVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFileClick(file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
              onContextMenu={(e) => onContextMenuItem?.(e, file)}
            >
              {file.mime_type?.startsWith('image/') ? (
                <ImagePreview file={file} />
              ) : (
                <div className="file-icon">
                  {getFileIcon(file.mime_type || '')}
                </div>
              )}
              <div className="file-info">
                <div className="file-name">
                  {renamingItemId === file.id ? (
                    <input
                      type="text"
                      defaultValue={file.filename || ''}
                      onBlur={(e) => onFileRename(file.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onFileRename(file.id, e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                          onCancelRename?.();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    file.filename || 'Fichier sans nom'
                  )}
                </div>
                <div className="file-meta">
                  <span className="file-size">{formatFileSize(file.size || 0)}</span>
                  <span className="file-date">
                    {new Date(file.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="files-list"
          variants={fileListVariants}
          initial="initial"
          animate="animate"
        >
          {safeFiles.map((file) => (
            <motion.div
              key={file.id}
              className="file-list-item"
              variants={gridRowVariants}
              whileHover={{ backgroundColor: 'var(--hover-bg)' }}
              onClick={() => handleFileClick(file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
              onContextMenu={(e) => onContextMenuItem?.(e, file)}
            >
              {file.mime_type?.startsWith('image/') ? (
                <ImagePreview file={file} />
              ) : (
                <div className="file-icon">
                  {getFileIcon(file.mime_type || '')}
                </div>
              )}
              <div className="file-info">
                <div className="file-name">
                  {renamingItemId === file.id ? (
                    <input
                      type="text"
                      defaultValue={file.filename || ''}
                      onBlur={(e) => onFileRename(file.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onFileRename(file.id, e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                          onCancelRename?.();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    file.filename || 'Fichier sans nom'
                  )}
                </div>
                <div className="file-meta">
                  <span className="file-size">{formatFileSize(file.size || 0)}</span>
                  <span className="file-type">{file.mime_type || 'Type inconnu'}</span>
                  <span className="file-date">
                    {new Date(file.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal pour les images */}
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={handleCloseImageModal}
        imageUrl={imageModal.imageUrl}
        imageName={imageModal.imageName}
        onOpenInNewTab={handleOpenImageInNewTab}
        onPrevious={handlePreviousImage}
        onNext={handleNextImage}
        hasPrevious={safeFiles.filter(f => f.mime_type?.startsWith('image/')).length > 1}
        hasNext={safeFiles.filter(f => f.mime_type?.startsWith('image/')).length > 1}
      />
    </motion.div>
  );
};

export default FilesContent; 