"use client";

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Plus, Link, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';
import './UnifiedUploadZone.css';

interface UnifiedUploadZoneProps {
  className?: string;
  placeholder?: string;
  onFileSelect?: (files: File[]) => void;
  onUrlSubmit?: (url: string) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  showUrlInput?: boolean;
  showDropZone?: boolean;
}

/**
 * Zone d'upload unifiée avec barre de saisie URL et zone de drop
 * Design moderne et réutilisable dans toute l'application
 */
const UnifiedUploadZone: React.FC<UnifiedUploadZoneProps> = ({
  className = '',
  placeholder = "Coller l'URL du fichier à importer...",
  onFileSelect,
  onUrlSubmit,
  accept = ".md,.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif",
  multiple = true,
  disabled = false,
  showUrlInput = true,
  showDropZone = true
}) => {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isUrlUploading, setIsUrlUploading] = useState(false);

  // Gestion du drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    logger.dev('[UnifiedUploadZone] Fichiers déposés:', files);
    
    if (onFileSelect) {
      onFileSelect(files);
    } else {
      // Comportement par défaut : rediriger vers la page d'import
      router.push('/private/dossiers?import=true');
    }
  }, [disabled, onFileSelect, router]);

  // Gestion du clic pour ouvrir le sélecteur de fichiers
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    const input = document.getElementById('unified-upload-file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }, [disabled]);

  // Gestion du changement de fichier
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      logger.dev('[UnifiedUploadZone] Fichiers sélectionnés:', files);
      
      if (onFileSelect) {
        onFileSelect(Array.from(files));
      } else {
        // Comportement par défaut : rediriger vers la page d'import
        router.push('/private/dossiers?import=true');
      }
    }
  }, [onFileSelect, router]);

  // Gestion de l'upload par URL
  const handleUrlUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || disabled) return;

    setIsUrlUploading(true);
    try {
      logger.dev('[UnifiedUploadZone] Upload URL:', urlInput);
      
      if (onUrlSubmit) {
        onUrlSubmit(urlInput);
      } else {
        // Comportement par défaut : rediriger vers la page d'import avec l'URL
        router.push(`/private/dossiers?import=true&url=${encodeURIComponent(urlInput)}`);
      }
    } catch (error) {
      logger.error('[UnifiedUploadZone] Erreur upload URL:', error);
    } finally {
      setIsUrlUploading(false);
    }
  }, [urlInput, disabled, onUrlSubmit, router]);

  return (
    <div className={`unified-upload-zone ${className}`}>
      {/* Barre de saisie URL */}
      {showUrlInput && (
        <form onSubmit={handleUrlUpload} className="url-upload-form">
          <div className="url-input-container">
            <Link size={16} className="url-input-icon" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={placeholder}
              className="url-input"
              disabled={isUrlUploading || disabled}
              aria-label="URL du fichier à importer"
              aria-describedby="url-help-text"
            />
            <motion.button
              type="submit"
              className="url-upload-btn"
              disabled={!urlInput.trim() || isUrlUploading || disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
              aria-label={isUrlUploading ? "Upload en cours..." : "Uploader le fichier depuis l'URL"}
            >
              {isUrlUploading ? (
                <div className="loading-spinner" />
              ) : (
                <ArrowRight size={16} />
              )}
            </motion.button>
          </div>
        </form>
      )}

      {/* Zone de drop */}
      {showDropZone && (
        <motion.div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Zone de dépôt de fichiers"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <motion.div 
            className="drop-zone-icon"
            animate={{ 
              scale: isDragOver ? 1.1 : 1,
              rotate: isDragOver ? 5 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            {isDragOver ? <Plus size={24} /> : <Upload size={24} />}
          </motion.div>
          
          <div className="drop-zone-text">
            <h3 className="drop-zone-title">
              {disabled 
                ? 'Upload désactivé' 
                : isDragOver 
                  ? 'Déposez vos fichiers' 
                  : 'Glissez-déposez vos fichiers'
              }
            </h3>
            <p className="drop-zone-subtitle">
              {disabled 
                ? 'Cette fonctionnalité est temporairement indisponible'
                : isDragOver 
                  ? 'Relâchez pour importer' 
                  : 'ou cliquez pour sélectionner des fichiers'
              }
            </p>
          </div>
        </motion.div>
      )}

      {/* Input file caché */}
      <input
        id="unified-upload-file-input"
        type="file"
        multiple={multiple}
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
};

export default UnifiedUploadZone;
