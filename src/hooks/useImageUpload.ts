/**
 * Hook pour gérer l'upload d'images dans le chat
 * @module hooks/useImageUpload
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { ImageAttachment } from '@/types/image';
import { convertFileToBase64, revokeImageAttachments } from '@/utils/imageUtils';
import { chatImageUploadService } from '@/services/chatImageUploadService';

interface UseImageUploadOptions {
  sessionId: string;
}

// Constantes de validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Hook useImageUpload
 * Gère l'upload d'images avec preview instantané et upload S3 asynchrone
 */
export function useImageUpload({ sessionId }: UseImageUploadOptions) {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /**
   * Traiter et uploader une image
   */
  const processAndUploadImage = useCallback(async (file: File): Promise<boolean> => {
    try {
      // ✅ Validation 1: Type de fichier
      if (!ALLOWED_TYPES.includes(file.type)) {
        const message = `Format non supporté (${file.type}). Formats acceptés : JPEG, PNG, GIF, WebP`;
        setUploadError(message);
        logger.warn('[useImageUpload] Format invalide:', { type: file.type, name: file.name });
        return false;
      }

      // ✅ Validation 2: Taille de fichier
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        const message = `Image trop grande (${sizeMB} MB). Taille max : ${maxMB} MB`;
        setUploadError(message);
        logger.warn('[useImageUpload] Fichier trop grand:', { size: file.size, max: MAX_FILE_SIZE, name: file.name });
        return false;
      }

      const base64 = await convertFileToBase64(file);
      const tempId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempImage: ImageAttachment = {
        id: tempId,
        file: file,
        previewUrl: base64,
        base64: base64,
        detail: 'auto',
        fileName: file.name,
        mimeType: file.type as import('@/types/image').SupportedImageFormat,
        size: file.size,
        addedAt: Date.now()
      };
      
      setImages(prev => [...prev, tempImage]);
      
      const uploadResult = await chatImageUploadService.uploadImages(
        [{ file, fileName: file.name, mimeType: file.type, size: file.size }],
        sessionId
      );
      
      if (uploadResult.success && uploadResult.images && uploadResult.images[0]) {
        const s3Image = uploadResult.images[0];
        setImages(prev => prev.map(img => 
          img.id === tempId 
            ? { ...img, base64: s3Image.url, previewUrl: s3Image.url }
            : img
        ));
        
        logger.dev('[useImageUpload] ✅ Image uploadée:', s3Image.url);
        return true;
      } else {
        throw new Error(uploadResult.error || 'Échec upload S3');
      }
    } catch (error) {
      logger.error('[useImageUpload] ❌ Erreur traitement image:', error);
      setUploadError(`Erreur avec ${file.name}`);
      return false;
    }
  }, [sessionId]);

  /**
   * Supprimer une image
   */
  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const imageToRemove = prev[index];
      if (imageToRemove) {
        revokeImageAttachments([imageToRemove]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /**
   * Réinitialiser les images
   */
  const clearImages = useCallback(() => {
    if (images.length > 0) {
      revokeImageAttachments(images);
      setImages([]);
    }
  }, [images]);

  // Handlers drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setUploadError('Seules les images sont acceptées');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    for (const file of imageFiles) {
      await processAndUploadImage(file);
    }
  }, [processAndUploadImage]);

  /**
   * Handler pour capturer une photo
   */
  const handleCameraCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await processAndUploadImage(file);
    
    if (e.target) {
      e.target.value = '';
    }
  }, [processAndUploadImage]);

  /**
   * Ouvrir le sélecteur de caméra
   */
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // Cleanup des images au démontage
  useEffect(() => {
    return () => {
      if (images.length > 0) {
        revokeImageAttachments(images);
      }
    };
  }, [images]);

  return {
    images,
    setImages,
    uploadError,
    setUploadError,
    isDragging,
    cameraInputRef,
    processAndUploadImage,
    removeImage,
    clearImages,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleCameraCapture,
    openCamera
  };
}

