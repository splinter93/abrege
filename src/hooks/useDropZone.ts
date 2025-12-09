import { useState, useCallback, useRef, useEffect } from 'react';
import { FileItem } from '@/types/files';
import { uploadImageForNote } from '@/utils/fileUpload';
import { useAuth } from '@/hooks/useAuth';
import { STORAGE_CONFIG } from '@/config/storage';

type UploadedFile = FileItem | {
  id: string;
  filename: string;
  url?: string;
  mime_type: string;
  size: number;
};

interface UseDropZoneOptions {
  onFilesDropped?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string[];
  disabled?: boolean;
}

interface DropZoneState {
  isDragOver: boolean;
  isValidDrop: boolean;
  isProcessing: boolean;
  dragCounter: number;
}

interface UseDropZoneReturn {
  dropZoneState: DropZoneState;
  handlers: {
    handleDragEnter: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => Promise<void>;
  };
  resetState: () => void;
}

export const useDropZone = ({
  onFilesDropped,
  onError,
  maxFiles = 10,
  maxFileSize = STORAGE_CONFIG.FILE_LIMITS.MAX_FILE_SIZE,
  accept = [...STORAGE_CONFIG.FILE_LIMITS.ALLOWED_MIME_TYPES],
  disabled = false
}: UseDropZoneOptions = {}): UseDropZoneReturn => {
  const { getAccessToken } = useAuth();
  const [state, setState] = useState<DropZoneState>({
    isDragOver: false,
    isValidDrop: false,
    isProcessing: false,
    dragCounter: 0
  });
  
  const dragCounterRef = useRef(0);

  // ========================================
  // VALIDATION DES FICHIERS
  // ========================================

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Vérifier le nombre de fichiers
    if (files.length > maxFiles) {
      errors.push(`Trop de fichiers (maximum: ${maxFiles})`);
      return { valid, errors };
    }

    files.forEach((file) => {
      // Vérifier la taille
      if (file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(1);
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        errors.push(`${file.name}: Fichier trop volumineux (${fileSizeMB}MB, maximum: ${maxSizeMB}MB)`);
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
          errors.push(`${file.name}: Type de fichier non autorisé (${file.type})`);
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
    
    setState(prev => ({
      ...prev,
      isDragOver: true,
      dragCounter: dragCounterRef.current,
      isValidDrop: e.dataTransfer.types.includes('Files')
    }));
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setState(prev => ({
        ...prev,
        isDragOver: false,
        isValidDrop: false,
        dragCounter: 0
      }));
    }
  }, [disabled]);

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
      errors.forEach(error => onError?.(error));
      return;
    }

    if (valid.length === 0) return;

    // Traitement des fichiers
    setState(prev => ({ 
      ...prev, 
      isDragOver: false, 
      isValidDrop: false, 
      dragCounter: 0,
      isProcessing: true 
    }));

    try {
      const uploadedFiles: UploadedFile[] = [];
      
      for (const file of valid) {
        try {
          const result = await uploadImageForNote(file, 'drop-zone');
          if (result.saved) {
            uploadedFiles.push(result.saved);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          onError?.(`Erreur lors de l'upload de ${file.name}: ${errorMessage}`);
        }
      }

      if (uploadedFiles.length > 0) {
        onFilesDropped?.(uploadedFiles);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(`Erreur lors du traitement des fichiers: ${errorMessage}`);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [disabled, validateFiles, onFilesDropped, onError, getAccessToken]);

  // ========================================
  // UTILITAIRES
  // ========================================

  const resetState = useCallback(() => {
    setState({
      isDragOver: false,
      isValidDrop: false,
      isProcessing: false,
      dragCounter: 0
    });
    dragCounterRef.current = 0;
  }, []);

  // ========================================
  // NETTOYAGE
  // ========================================

  useEffect(() => {
    return () => {
      dragCounterRef.current = 0;
    };
  }, []);

  // ========================================
  // RENDU
  // ========================================

  return {
    dropZoneState: state,
    handlers: {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop
    },
    resetState
  };
};
