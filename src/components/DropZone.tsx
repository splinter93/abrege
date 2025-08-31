"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '@/types/files';
import { uploadImageForNote } from '@/utils/fileUpload';
import { useAuth } from '@/hooks/useAuth';
import './DropZone.css';

interface DropZoneProps {
  children: React.ReactNode;
  onFilesDropped: (files: FileItem[]) => void;
  onError: (error: string) => void;
  className?: string;
  disabled?: boolean;
  accept?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  showOverlay?: boolean;
  overlayMessage?: string;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

interface DropState {
  isDragOver: boolean;
  dragCounter: number;
  isValidDrop: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({
  children,
  onFilesDropped,
  onError,
  className = '',
  disabled = false,
  accept = [],
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB par défaut
  showOverlay = true,
  overlayMessage = 'Déposez vos fichiers ici',
  onDragEnter,
  onDragLeave
}) => {
  const { getAccessToken } = useAuth();
  const [dropState, setDropState] = useState<DropState>({
    isDragOver: false,
    dragCounter: 0,
    isValidDrop: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounterRef = useRef(0);

  // ========================================
  // VALIDATION DES FICHIERS
  // ========================================

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Vérifier le nombre de fichiers
    if (files.length > maxFiles) {
      errors.push(`Trop de fichiers (max: ${maxFiles})`);
      return { valid, errors };
    }

    files.forEach((file, index) => {
      // Vérifier la taille
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }

      // Vérifier le type MIME
      if (accept.length > 0) {
        const isValidType = accept.some(type => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
          }
          return file.type === type;
        });

        if (!isValidType) {
          errors.push(`${file.name}: Type non autorisé (${file.type})`);
          return;
        }
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [maxFiles, maxFileSize, accept]);

  // ========================================
  // GESTION DU DRAG & DROP
  // ========================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    dragCounterRef.current++;
    
    setDropState(prev => ({
      ...prev,
      isDragOver: true,
      dragCounter: dragCounterRef.current,
      isValidDrop: e.dataTransfer.types.includes('Files')
    }));

    onDragEnter?.();
  }, [disabled, onDragEnter]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setDropState(prev => ({
        ...prev,
        isDragOver: false,
        dragCounter: 0,
        isValidDrop: false
      }));
      onDragLeave?.();
    }
  }, [disabled, onDragLeave]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validation des fichiers
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      errors.forEach(error => onError(error));
      return;
    }

    if (valid.length === 0) return;

    // Traitement des fichiers
    setIsProcessing(true);
    setDropState(prev => ({ ...prev, isDragOver: false, dragCounter: 0 }));

    try {
      const uploadedFiles: FileItem[] = [];
      
      for (const file of valid) {
        try {
          const result = await uploadImageForNote(file, getAccessToken);
          if (result.saved) {
            uploadedFiles.push(result.saved);
          }
        } catch (error) {
          onError(`Erreur lors de l'upload de ${file.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      if (uploadedFiles.length > 0) {
        onFilesDropped(uploadedFiles);
      }
    } catch (error) {
      onError(`Erreur lors du traitement des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, validateFiles, onFilesDropped, onError, getAccessToken]);

  // ========================================
  // RÉINITIALISATION DU COMPTEUR
  // ========================================

  useEffect(() => {
    return () => {
      dragCounterRef.current = 0;
    };
  }, []);

  // ========================================
  // RENDU
  // ========================================

  return (
    <div
      className={`drop-zone ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Overlay de drag & drop */}
      <AnimatePresence>
        {showOverlay && dropState.isDragOver && dropState.isValidDrop && (
          <motion.div
            className="drop-zone-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="drop-zone-content">
              <div className="drop-zone-icon">📁</div>
              <div className="drop-zone-message">{overlayMessage}</div>
              {isProcessing && (
                <div className="drop-zone-processing">
                  <div className="drop-zone-spinner"></div>
                  <span>Traitement en cours...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropZone;
