"use client";

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Plus, Link, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';

interface DropZoneProps {
  className?: string;
  children?: React.ReactNode;
  onFilesDropped?: (files: File[]) => void;
  onError?: (error: string) => void;
  overlayMessage?: string;
  showOverlay?: boolean;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  disabled?: boolean;
  accept?: string | string[];
  maxFiles?: number;
  maxFileSize?: number;
}

/**
 * Zone de drop pour l'upload de fichiers
 * Design moderne avec animations et interactions
 */
const DropZone: React.FC<DropZoneProps> = ({
  className = '',
  children,
  onFilesDropped,
  onError,
  overlayMessage,
  showOverlay = false,
  onDragEnter,
  onDragLeave,
  disabled = false,
  accept,
  maxFiles,
  maxFileSize
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
    setIsDragOver(true);
    onDragEnter?.(e);
  }, [onDragEnter]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDragLeave?.(e);
  }, [onDragLeave]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (onFilesDropped) {
      onFilesDropped(files);
      return;
    }

    logger.dev('[DropZone] Fichiers déposés:', files);
    
    // Pour l'instant, rediriger vers la page d'import
    // TODO: Implémenter l'upload direct
    router.push('/private/dossiers?import=true');
  }, [router, onFilesDropped]);

  // Gestion du clic pour ouvrir le sélecteur de fichiers
  const handleClick = useCallback(() => {
    const input = document.getElementById('dropzone-file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }, []);

  // Gestion du changement de fichier
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      logger.dev('[DropZone] Fichiers sélectionnés:', files);
      if (onFilesDropped) {
        onFilesDropped(Array.from(files));
        return;
      }
      // Rediriger vers la page d'import
      router.push('/private/dossiers?import=true');
    }
  }, [router, onFilesDropped]);

  // Gestion de l'upload par URL
  const handleUrlUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsUrlUploading(true);
    try {
      logger.dev('[DropZone] Upload URL:', urlInput);
      // TODO: Implémenter l'upload par URL
      // Pour l'instant, rediriger vers la page d'import avec l'URL
      router.push(`/private/dossiers?import=true&url=${encodeURIComponent(urlInput)}`);
    } catch (error) {
      logger.error('[DropZone] Erreur upload URL:', error);
      onError?.('Erreur lors de l\'upload par URL.');
    } finally {
      setIsUrlUploading(false);
    }
  }, [urlInput, router, onError]);

  return (
    <>
      {/* Barre de saisie URL */}
      <form onSubmit={handleUrlUpload} className="url-upload-form">
        <div className="url-input-container">
          <Link size={16} className="url-input-icon" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Coller l'URL du fichier à importer..."
            className="url-input"
            disabled={isUrlUploading}
            aria-label="URL du fichier à importer"
            aria-describedby="url-help-text"
          />
          <motion.button
            type="submit"
            className="url-upload-btn"
            disabled={!urlInput.trim() || isUrlUploading}
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

      {/* Zone de drop */}
      <motion.div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        role="button"
        tabIndex={0}
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
            {isDragOver ? 'Déposez vos fichiers' : 'Glissez-déposez vos fichiers'}
          </h3>
          <p className="drop-zone-subtitle">
            {isDragOver 
              ? 'Relâchez pour importer' 
              : 'ou cliquez pour sélectionner des fichiers'
            }
          </p>
        </div>
      </motion.div>

      {/* Input file caché */}
      <input
        id="dropzone-file-input"
        type="file"
        multiple
        accept=".md,.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
};

export default DropZone;