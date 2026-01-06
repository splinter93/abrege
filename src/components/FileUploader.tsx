"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '@/types/files';
import DropZone from './DropZone';
import './FileUploader.css';

interface FileUploaderProps {
  onFilesDropped: (files: FileItem[]) => void;
  onError: (error: string) => void;
  className?: string;
  disabled?: boolean;
  accept?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  showOverlay?: boolean;
  overlayMessage?: string;
  children?: React.ReactNode;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesDropped,
  onError,
  className = '',
  disabled = false,
  accept = [],
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB par défaut
  showOverlay = true,
  overlayMessage = 'Déposez vos fichiers ici',
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Conversion de File[] (navigateur) vers FileItem[] (métier)
  const handleFilesDropped = useCallback((droppedFiles: File[]) => {
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

  return (
    <div className={`file-uploader ${className}`}>
      {/* Zone de drop principale */}
      <DropZone
        onFilesDropped={handleFilesDropped}
        onError={onError}
        className="file-uploader-drop-zone"
        disabled={disabled}
        accept={accept}
        maxFiles={maxFiles}
        maxFileSize={maxFileSize}
        showOverlay={showOverlay}
        overlayMessage={overlayMessage}
      >
        {children || (
          <div className="file-uploader-placeholder">
            <div className="file-uploader-icon">📁</div>
            <div className="file-uploader-text">
              Glissez et déposez vos fichiers ici
            </div>
            <div className="file-uploader-hint">
              ou cliquez pour sélectionner des fichiers
            </div>
          </div>
        )}
      </DropZone>

      {/* Bouton d'expansion pour plus d'options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="file-uploader-expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="file-uploader-options">
              <div className="file-uploader-option">
                <label htmlFor="file-input" className="file-uploader-label">
                  📎 Sélectionner des fichiers
                </label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept={accept.join(',')}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      // Simuler un drop pour utiliser la même logique
                      const dropEvent = new DragEvent('drop', {
                        dataTransfer: new DataTransfer()
                      });
                      // Note: Cette approche est simplifiée, en production on utiliserait
                      // une logique d'upload directe
                      onError('Sélection de fichiers via bouton à implémenter');
                    }
                  }}
                  className="file-uploader-input"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton toggle */}
      <button
        className="file-uploader-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Masquer les options' : 'Afficher les options'}
      >
        {isExpanded ? '−' : '+'}
      </button>
    </div>
  );
};

export default FileUploader; 