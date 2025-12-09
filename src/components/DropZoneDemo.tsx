"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileItem } from '@/types/files';
import DropZone from './DropZone';
import FileUploader from './FileUploader';
import './DropZoneDemo.css';
import { AnimatePresence } from 'framer-motion';

/**
 * Composant de démonstration pour montrer l'utilisation de DropZone et FileUploader
 * 
 * Ce composant illustre :
 * - L'utilisation de DropZone comme wrapper autour d'une grille
 * - L'utilisation de FileUploader comme composant autonome
 * - La gestion des callbacks d'upload et d'erreur
 * - Les différents modes d'affichage
 */
const DropZoneDemo: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // ========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ========================================

  const handleFilesDropped = (files: FileItem[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    
    // Afficher une notification de succès
    if (files.length === 1) {
      console.log(`✅ Fichier "${files[0].filename}" uploadé avec succès`);
    } else {
      console.log(`✅ ${files.length} fichiers uploadés avec succès`);
    }
  };

  const handleUploadError = (error: string) => {
    setErrors(prev => [...prev, error]);
    console.error(`❌ Erreur d'upload: ${error}`);
    
    // Nettoyer l'erreur après 5 secondes
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e !== error));
    }, 5000);
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  // ========================================
  // RENDU
  // ========================================

  return (
    <div className="drop-zone-demo">
      <motion.div
        className="demo-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>🎯 Démonstration DropZone & FileUploader</h1>
        <p>Découvrez la nouvelle architecture de drag & drop unifiée</p>
      </motion.div>

      <div className="demo-content">
        {/* Section 1: DropZone sur une grille (comme dans FilesContent) */}
        <motion.section
          className="demo-section"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2>📁 Grille avec DropZone intégré</h2>
          <p>Cette grille simule l'utilisation dans FilesContent</p>
          
          <DropZone
            onFilesDropped={(files) => handleFilesDropped(files as unknown as FileItem[])}
            onError={handleUploadError}
            className="demo-grid-drop-zone"
            overlayMessage="Déposez vos fichiers ici pour les ajouter à la grille"
            showOverlay={true}
          >
            <div className="demo-grid">
              {uploadedFiles.length === 0 ? (
                <div className="demo-empty-state">
                  <div className="demo-empty-icon">📁</div>
                  <div className="demo-empty-text">Aucun fichier</div>
                  <div className="demo-empty-hint">Glissez et déposez des fichiers ici</div>
                </div>
              ) : (
                uploadedFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    className="demo-file-item"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="demo-file-icon">
                      {file.mime_type?.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
                    <div className="demo-file-name">
                      {file.filename || 'Fichier sans nom'}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </DropZone>
        </motion.section>

        {/* Section 2: FileUploader autonome */}
        <motion.section
          className="demo-section"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2>📤 FileUploader autonome</h2>
          <p>Composant d'upload avec options étendues</p>
          
          <FileUploader
            onFilesDropped={(files) => handleFilesDropped(files as unknown as FileItem[])}
            onError={handleUploadError}
            className="demo-file-uploader"
            accept={['image/*', 'application/pdf', 'text/*']}
            maxFiles={5}
            maxFileSize={25 * 1024 * 1024} // 25MB
            overlayMessage="Déposez vos fichiers ici pour les uploader"
          />
        </motion.section>

        {/* Section 3: Statistiques et contrôles */}
        <motion.section
          className="demo-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2>📊 Statistiques et contrôles</h2>
          
          <div className="demo-stats">
            <div className="demo-stat">
              <div className="demo-stat-number">{uploadedFiles.length}</div>
              <div className="demo-stat-label">Fichiers uploadés</div>
            </div>
            
            <div className="demo-stat">
              <div className="demo-stat-number">{errors.length}</div>
              <div className="demo-stat-label">Erreurs</div>
            </div>
          </div>

          <div className="demo-controls">
            <button
              className="demo-btn demo-btn-primary"
              onClick={clearFiles}
              disabled={uploadedFiles.length === 0}
            >
              🗑️ Vider la liste
            </button>
            
            <button
              className="demo-btn demo-btn-secondary"
              onClick={clearErrors}
              disabled={errors.length === 0}
            >
              ✨ Effacer les erreurs
            </button>
          </div>
        </motion.section>

        {/* Section 4: Logs d'erreur */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.section
              className="demo-section demo-errors"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2>⚠️ Erreurs récentes</h2>
              
              <div className="demo-error-list">
                {errors.map((error, index) => (
                  <motion.div
                    key={index}
                    className="demo-error-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    <span className="demo-error-icon">❌</span>
                    <span className="demo-error-text">{error}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DropZoneDemo;
