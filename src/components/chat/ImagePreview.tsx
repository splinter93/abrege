/**
 * Composant ImagePreview
 * Affiche une miniature d'image avec bouton de suppression
 */

'use client';

import React, { memo } from 'react';
import { X } from 'react-feather';
import type { ImageAttachment } from '@/types/image';
import { formatFileSize } from '@/utils/imageUtils';
import { logger, LogCategory } from '@/utils/logger';

interface ImagePreviewProps {
  /**
   * L'image à afficher
   */
  attachment: ImageAttachment;
  
  /**
   * Callback appelé lors de la suppression
   */
  onRemove: (id: string) => void;
  
  /**
   * Composant désactivé (pas d'interaction)
   */
  disabled?: boolean;
}

/**
 * Composant ImagePreview
 * Affiche une miniature cliquable avec overlay de suppression
 */
const ImagePreview: React.FC<ImagePreviewProps> = memo(({ 
  attachment, 
  onRemove,
  disabled = false 
}) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    logger.debug(LogCategory.EDITOR, `🗑️ Suppression image: ${attachment.id}`);
    onRemove(attachment.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onRemove(attachment.id);
    }
  };

  return (
    <div 
      className="chat-image-preview"
      role="figure"
      aria-label={`Image: ${attachment.fileName}`}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Image miniature */}
      <img
        src={attachment.previewUrl}
        alt={attachment.fileName}
        className="chat-image-preview-img"
        loading="eager"
      />
      
      {/* Overlay avec informations */}
      <div className="chat-image-preview-overlay">
        <div className="chat-image-preview-info">
          <span className="chat-image-preview-filename" title={attachment.fileName}>
            {attachment.fileName}
          </span>
          <span className="chat-image-preview-size">
            {formatFileSize(attachment.size)}
          </span>
        </div>
      </div>
      
      {/* Bouton de suppression */}
      {!disabled && (
        <button
          onClick={handleRemove}
          className="chat-image-preview-remove"
          aria-label={`Supprimer ${attachment.fileName}`}
          type="button"
        >
          <X size={14} />
        </button>
      )}
      
      {/* Badge de niveau de détail si non-auto */}
      {attachment.detail && attachment.detail !== 'auto' && (
        <div className="chat-image-preview-badge">
          {attachment.detail === 'high' ? 'HD' : 'LD'}
        </div>
      )}
    </div>
  );
});

ImagePreview.displayName = 'ImagePreview';

export default ImagePreview;

