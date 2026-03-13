import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileItem } from '@/types/files';
import ImageModal from './ImageModal';
import DropZone from './DropZone';
import RenameInput from './RenameInput';
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
  onFilesDropped?: (files: FileItem[]) => void;
  onUploadError?: (error: string) => void;
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
  onFilesDropped,
  onUploadError,
}) => {
  // Conversion de File[] (navigateur) vers FileItem[] (métier)
  const handleFilesDropped = useCallback((droppedFiles: File[]) => {
    if (!onFilesDropped) return;
    // Convertir File[] en FileItem[] (création temporaire pour upload)
    const fileItems: FileItem[] = droppedFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      user_id: '', // Sera rempli lors de l'upload
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
      url: '', // Sera rempli après upload
      s3_key: '', // Sera rempli après upload
      visibility_mode: 'inherit_note',
      owner_id: '', // Sera rempli lors de l'upload
      status: 'uploading' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    onFilesDropped(fileItems);
  }, [onFilesDropped]);

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

  const handleFileClick = useCallback((file: FileItem) => {
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
  }, [safeFiles, onFileOpen]);

  const handleFileDoubleClick = useCallback((file: FileItem) => {
    // Double-clic : commencer le renommage
    onFileRename(file.id, file.filename);
  }, [onFileRename]);

  const handleCloseImageModal = useCallback(() => {
    setImageModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleOpenImageInNewTab = useCallback(() => {
    window.open(imageModal.imageUrl, '_blank');
  }, [imageModal.imageUrl]);

  const handlePreviousImage = useCallback(() => {
    const imageFiles = safeFiles.filter(f => f.mime_type?.startsWith('image/'));
    const newIndex = imageModal.currentIndex > 0 ? imageModal.currentIndex - 1 : imageFiles.length - 1;
    const newFile = imageFiles[newIndex];
    setImageModal({
      isOpen: true,
      imageUrl: newFile.url,
      imageName: newFile.filename || 'Image',
      currentIndex: newIndex,
    });
  }, [safeFiles, imageModal.currentIndex]);

  const handleNextImage = useCallback(() => {
    const imageFiles = safeFiles.filter(f => f.mime_type?.startsWith('image/'));
    const newIndex = imageModal.currentIndex < imageFiles.length - 1 ? imageModal.currentIndex + 1 : 0;
    const newFile = imageFiles[newIndex];
    setImageModal({
      isOpen: true,
      imageUrl: newFile.url,
      imageName: newFile.filename || 'Image',
      currentIndex: newIndex,
    });
  }, [safeFiles, imageModal.currentIndex]);

  return (
    <motion.div 
      className="files-content-container"
      variants={contentVariants}
      initial="initial"
      animate="animate"
    >
      {viewMode === 'grid' ? (
        <DropZone
          onFilesDropped={handleFilesDropped}
          onError={onUploadError}
          className="files-grid-drop-zone"
          overlayMessage="Déposez vos fichiers ici pour les ajouter à votre bibliothèque"
          showOverlay={true}
          onDragEnter={() => {
            // Ajouter une classe pour l'indicateur visuel
            const dropZone = document.querySelector('.files-grid-drop-zone');
            if (dropZone) {
              dropZone.classList.add('drag-over');
            }
          }}
          onDragLeave={() => {
            // Retirer la classe quand le drag se termine
            const dropZone = document.querySelector('.files-grid-drop-zone');
            if (dropZone) {
              dropZone.classList.remove('drag-over');
            }
          }}
        >
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenuItem?.(e, file);
                }}
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
                      <div className="rename-input-container" onClick={(e) => e.stopPropagation()}>
                        <RenameInput
                          initialValue={file.filename || ''}
                          onSubmit={(name) => onFileRename(file.id, name)}
                          onCancel={onCancelRename || (() => {})}
                          autoFocus
                          variant="item"
                        />
                      </div>
                    ) : (
                      <div 
                        className="file-name-display"
                        title="Double-clic pour renommer"
                        style={{
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {file.filename || 'Fichier sans nom'}
                      </div>
                    )}
                  </div>
                  {/* Suppression de file-meta pour gagner de l'espace vertical */}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </DropZone>
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
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenuItem?.(e, file);
              }}
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
                    <div className="rename-input-container" onClick={(e) => e.stopPropagation()}>
                      <RenameInput
                        initialValue={file.filename || ''}
                        onSubmit={(name) => onFileRename(file.id, name)}
                        onCancel={onCancelRename || (() => {})}
                        autoFocus
                        variant="item"
                      />
                    </div>
                  ) : (
                    <div 
                      className="file-name-display"
                      title="Double-clic pour renommer"
                      style={{
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {file.filename || 'Fichier sans nom'}
                    </div>
                  )}
                </div>
                {/* Suppression de file-meta pour gagner de l'espace vertical */}
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