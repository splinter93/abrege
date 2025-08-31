"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '@/types/files';
import { STORAGE_CONFIG, formatBytes } from '@/config/storage';
import { useAuth } from '@/hooks/useAuth';
import './FileUploaderLocal.css';

interface FileUploaderLocalProps {
  onUploadComplete: (file: FileItem) => void;
  onUploadError: (error: string) => void;
  folderId?: string;
  notebookId?: string;
  maxFileSize?: number; // en bytes
  allowedTypes?: string[];
  multiple?: boolean;
}

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const FileUploaderLocal: React.FC<FileUploaderLocalProps> = ({
  onUploadComplete,
  onUploadError,
  folderId,
  maxFileSize = STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE, // Utilise la config centralisée
  allowedTypes = STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES, // Utilise la config centralisée
  multiple = false
}) => {
  const { getAccessToken } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // VALIDATION DES FICHIERS
  // ========================================

  const validateFile = useCallback((file: File): string | null => {
    // Vérifier la taille
    if (file.size > maxFileSize) {
      return `Fichier trop volumineux (max: ${formatBytes(maxFileSize)})`;
    }

    // Vérifier le type
    const isValidType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `Type de fichier non autorisé: ${file.type}`;
    }

    return null;
  }, [maxFileSize, allowedTypes]);

  // ========================================
  // GESTION DU DRAG & DROP
  // ========================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  // ========================================
  // GESTION DE LA SÉLECTION DE FICHIERS
  // ========================================

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);

    // Créer les entrées de progression
    const newUploads: UploadProgress[] = files.map(file => ({
      fileId: generateFileId(),
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upload = newUploads[i];

      try {
        // Validation
        const validationError = validateFile(file);
        if (validationError) {
          setUploads(prev => prev.map(u => 
            u.fileId === upload.fileId 
              ? { ...u, status: 'error', error: validationError }
              : u
          ));
          continue;
        }

        // Upload via l'API v2
        await uploadFile(file, upload);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        setUploads(prev => prev.map(u => 
          u.fileId === upload.fileId 
            ? { ...u, status: 'error', error: errorMessage }
            : u
        ));
        onUploadError(errorMessage);
      }
    }

    setIsUploading(false);
  }, [validateFile, onUploadError]);

  // ========================================
  // UPLOAD VIA L'API V2
  // ========================================

  const uploadFile = async (file: File, upload: UploadProgress) => {
    try {
      // 1. Récupérer le token d'authentification
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('Session d\'authentification expirée. Veuillez vous reconnecter.');
      }

      // 2. Initier l'upload avec le token d'authentification
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
          folderId: folderId || undefined,
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Erreur lors de l\'initiation de l\'upload');
      }

      const uploadData = await uploadResponse.json();

      // 3. Upload vers S3
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

      // 4. Marquer comme terminé
      setUploads(prev => prev.map(u => 
        u.fileId === upload.fileId 
          ? { ...u, status: 'complete', progress: 100 }
          : u
      ));

      // 5. Notifier le composant parent
      if (uploadData.file) {
        onUploadComplete(uploadData.file);
      }

      // 6. Nettoyer après un délai
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.fileId !== upload.fileId));
      }, 3000);

    } catch (error) {
      throw error;
    }
  };

  // ========================================
  // GESTION DES URLS EXTERNES
  // ========================================

  const handleExternalUrl = useCallback(async () => {
    if (!externalUrl.trim()) return;

    setIsUrlUploading(true);
    const uploadId = generateFileId();

    try {
      // Validation de l'URL
      const url = new URL(externalUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('URL invalide');
      }

      // Ajouter à la liste des uploads
      const newUpload: UploadProgress = {
        fileId: uploadId,
        fileName: `URL externe: ${url.hostname}`,
        progress: 0,
        status: 'uploading'
      };

      setUploads(prev => [...prev, newUpload]);

      // Upload via l'API
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch('/api/ui/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          externalUrl: externalUrl.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const uploadData = await response.json();

      // Mettre à jour le statut
      setUploads(prev => prev.map(u => 
        u.fileId === uploadId 
          ? { ...u, status: 'complete', progress: 100 }
          : u
      ));

      // Notifier le composant parent
      if (uploadData.file) {
        onUploadComplete(uploadData.file);
      }

      // Nettoyer l'URL
      setExternalUrl('');

      // Nettoyer après un délai
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.fileId !== uploadId));
      }, 3000);

    } catch (error: any) {
      // Mettre à jour le statut d'erreur
      setUploads(prev => prev.map(u => 
        u.fileId === uploadId 
          ? { ...u, status: 'error', error: error.message }
          : u
      ));

      onUploadError(error.message);
    } finally {
      setIsUrlUploading(false);
    }
  }, [externalUrl, getAccessToken, onUploadComplete, onUploadError]);

  // ========================================
  // UTILITAIRES
  // ========================================

  const generateFileId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // ========================================
  // RENDU
  // ========================================

  return (
    <div className="file-uploader">
      {/* Section URL externe */}
      <div className="external-url-section">
        <h3>📎 Ajouter une image depuis une URL</h3>
        <div className="url-input-group">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExternalUrl()}
            className="url-input"
            disabled={isUrlUploading}
          />
          <button
            onClick={handleExternalUrl}
            disabled={!externalUrl.trim() || isUrlUploading}
            className="url-upload-btn"
          >
            {isUrlUploading ? '⏳...' : 'Ajouter'}
          </button>
        </div>
        <p className="url-hint">
          Collez l'URL d'une image et cliquez sur "Ajouter"
        </p>
      </div>

      {/* Séparateur */}
      <div className="upload-separator">
        <span>ou</span>
      </div>

      {/* Zone de drag & drop */}
      <motion.div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <h3>Glissez vos fichiers ici</h3>
            <p>ou cliquez pour sélectionner</p>
          </div>
          <div className="upload-info">
            <p>Types autorisés: {allowedTypes.join(', ')}</p>
            <p>Taille max: {formatBytes(maxFileSize)}</p>
          </div>
        </div>

        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </motion.div>

      {/* Liste des uploads en cours */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            className="uploads-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4>Uploads en cours</h4>
            {uploads.map((upload) => (
              <motion.div
                key={upload.fileId}
                className={`upload-item ${upload.status}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="upload-item-info">
                  <div className="upload-item-name">{upload.fileName}</div>
                  <div className="upload-item-status">
                    {upload.status === 'uploading' && '⏳ Upload...'}
                    {upload.status === 'processing' && '⚙️ Traitement...'}
                    {upload.status === 'complete' && '✅ Terminé'}
                    {upload.status === 'error' && '❌ Erreur'}
                  </div>
                </div>

                {upload.status === 'uploading' && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className="progress-text">{upload.progress}%</span>
                  </div>
                )}

                {upload.status === 'error' && upload.error && (
                  <div className="upload-error">{upload.error}</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploaderLocal; 