/**
 * Composant ImageUploadZone
 * Gère le drag & drop d'images et l'upload via bouton
 */

'use client';

import React, { useRef, useCallback, useState, memo } from 'react';
import { Image as ImageIcon, AlertCircle } from 'react-feather';
import type { ImageAttachment, ImageUploadStats } from '@/types/image';
import { processImageFiles, revokeImageAttachments } from '@/utils/imageUtils';
import { logger, LogCategory } from '@/utils/logger';
import ImagePreview from './ImagePreview';

interface ImageUploadZoneProps {
  /**
   * Images actuellement attachées
   */
  images: ImageAttachment[];
  
  /**
   * Callback quand de nouvelles images sont ajoutées
   */
  onImagesAdd: (images: ImageAttachment[]) => void;
  
  /**
   * Callback quand une image est supprimée
   */
  onImageRemove: (id: string) => void;
  
  /**
   * Composant désactivé
   */
  disabled?: boolean;
  
  /**
   * Nombre maximum d'images autorisées
   * @default 10
   */
  maxImages?: number;
  
  /**
   * Callback appelé lors d'erreurs de validation
   */
  onError?: (stats: ImageUploadStats) => void;
}

/**
 * Composant ImageUploadZone
 * Zone de drag & drop avec preview des images
 */
const ImageUploadZone: React.FC<ImageUploadZoneProps> = memo(({
  images,
  onImagesAdd,
  onImageRemove,
  disabled = false,
  maxImages = 10,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounterRef = useRef(0);

  /**
   * Traite les fichiers sélectionnés
   */
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled || isProcessing) return;
    
    const filesArray = Array.from(files);
    
    // Vérifier la limite
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      logger.warn(LogCategory.EDITOR, '⚠️ Limite d\'images atteinte');
      return;
    }
    
    const filesToProcess = filesArray.slice(0, remainingSlots);
    
    if (filesToProcess.length < filesArray.length) {
      logger.warn(LogCategory.EDITOR, `⚠️ Limite atteinte: ${filesToProcess.length}/${filesArray.length} fichiers seront traités`);
    }
    
    setIsProcessing(true);
    
    try {
      logger.debug(LogCategory.EDITOR, `📤 Traitement de ${filesToProcess.length} fichier(s)...`);
      
      const { attachments, stats } = await processImageFiles(filesToProcess);
      
      if (attachments.length > 0) {
        onImagesAdd(attachments);
      }
      
      // Notifier les erreurs si callback fourni
      if (stats.errors.length > 0 && onError) {
        onError(stats);
      }
      
      logger.info(LogCategory.EDITOR, `✅ Upload terminé: ${stats.successCount} succès, ${stats.rejectedCount} rejetés`);
    } catch (error) {
      logger.error(LogCategory.EDITOR, '❌ Erreur traitement fichiers:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, isProcessing, maxImages, images.length, onImagesAdd, onError]);

  /**
   * Gestion du drag & drop
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    const { files } = e.dataTransfer;
    
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  /**
   * Gestion du clic sur le bouton d'upload
   */
  const handleButtonClick = useCallback(() => {
    if (disabled || isProcessing) return;
    fileInputRef.current?.click();
  }, [disabled, isProcessing]);

  /**
   * Gestion de la sélection de fichiers via input
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    
    if (files && files.length > 0) {
      handleFiles(files);
    }
    
    // Reset l'input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  }, [handleFiles]);

  /**
   * Suppression d'une image
   */
  const handleRemove = useCallback((id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    
    if (imageToRemove) {
      // Révoquer l'URL de preview
      revokeImageAttachments([imageToRemove]);
      onImageRemove(id);
    }
  }, [images, onImageRemove]);

  const hasImages = images.length > 0;
  const canAddMore = images.length < maxImages;

  return (
    <div className="chat-image-upload-zone">
      {/* Preview des images */}
      {hasImages && (
        <div className="chat-image-previews">
          {images.map((image) => (
            <ImagePreview
              key={image.id}
              attachment={image}
              onRemove={handleRemove}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      
      {/* Zone de drop (visible seulement si on peut ajouter des images) */}
      {canAddMore && (
        <div
          className={`chat-image-drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Zone de dépôt d'images"
        >
          {isDragging ? (
            <div className="chat-image-drop-zone-content">
              <ImageIcon size={24} />
              <span>Déposez vos images ici</span>
            </div>
          ) : isProcessing ? (
            <div className="chat-image-drop-zone-content">
              <div className="chat-image-processing-spinner" />
              <span>Traitement en cours...</span>
            </div>
          ) : (
            <div className="chat-image-drop-zone-content">
              <ImageIcon size={20} />
              <span className="chat-image-drop-zone-text">
                Glissez des images ici ou{' '}
                <button
                  type="button"
                  onClick={handleButtonClick}
                  disabled={disabled || isProcessing}
                  className="chat-image-drop-zone-button"
                >
                  cliquez pour parcourir
                </button>
              </span>
              <span className="chat-image-drop-zone-hint">
                JPG, PNG • Max 20 Mo • {images.length}/{maxImages} images
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Limite atteinte */}
      {!canAddMore && (
        <div className="chat-image-limit-warning">
          <AlertCircle size={16} />
          <span>Limite de {maxImages} images atteinte</span>
        </div>
      )}
      
      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled || isProcessing}
        aria-hidden="true"
      />
    </div>
  );
});

ImageUploadZone.displayName = 'ImageUploadZone';

export default ImageUploadZone;

