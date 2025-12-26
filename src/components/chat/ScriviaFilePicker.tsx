'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { simpleLogger as logger } from '@/utils/logger';
import { Search, Grid3x3, List } from 'lucide-react';
import '@/styles/ScriviaFilePicker.css';

interface FileSearchResult {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ScriviaFilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImages: (images: Array<{ url: string; fileName?: string }>) => void;
  multiple?: boolean;
}

const ScriviaFilePicker: React.FC<ScriviaFilePickerProps> = ({
  isOpen,
  onClose,
  onSelectImages,
  multiple = true
}) => {
  const { getAccessToken } = useAuth();
  const [files, setFiles] = useState<FileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fermer avec Echap
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Charger les fichiers (images uniquement)
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        logger.warn('[ScriviaFilePicker] Token d\'authentification non disponible');
        return;
      }

      // Récupérer uniquement les images
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('type', 'image');
      params.append('sort_by', 'created_at');
      params.append('sort_order', 'desc');
      
      const response = await fetch(`/api/v2/files/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.files) {
        setFiles(data.files);
        logger.dev('[ScriviaFilePicker] Fichiers chargés:', data.files.length);
      } else {
        setFiles([]);
      }
    } catch (error) {
      logger.error('[ScriviaFilePicker] Erreur chargement fichiers:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Charger les fichiers quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setSelectedFiles(new Set());
      setSearchQuery('');
    }
  }, [isOpen, fetchFiles]);

  // Filtrer les fichiers selon la recherche
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }
    
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file.filename.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  // Toggle sélection d'un fichier
  const handleFileClick = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        if (!multiple) {
          // Mode simple sélection : remplacer la sélection
          newSet.clear();
        }
        newSet.add(fileId);
      }
      return newSet;
    });
  }, [multiple]);

  // Confirmer la sélection
  const handleConfirm = useCallback(() => {
    const selected = filteredFiles.filter(file => selectedFiles.has(file.id));
    
    if (selected.length === 0) {
      return;
    }

    const images = selected.map(file => ({
      url: file.url,
      fileName: file.filename
    }));

    onSelectImages(images);
    onClose();
  }, [filteredFiles, selectedFiles, onSelectImages, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Formatage de la taille
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="scrivia-file-picker-overlay" onClick={handleOverlayClick}>
      <div className="scrivia-file-picker" onClick={(e) => e.stopPropagation()}>
        {/* Header avec navigation et recherche */}
        <div className="scrivia-file-picker-header">
          <div className="scrivia-file-picker-nav">
            <div className="scrivia-file-picker-folder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Mes Files</span>
            </div>
          </div>
          
          <div className="scrivia-file-picker-view-controls">
            <button
              className={`scrivia-file-picker-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Vue grille"
            >
              <Grid3x3 size={16} />
            </button>
            <button
              className={`scrivia-file-picker-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Vue liste"
            >
              <List size={16} />
            </button>
          </div>

          <div className="scrivia-file-picker-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="scrivia-file-picker-search-input"
            />
          </div>
        </div>

        {/* Contenu : grille ou liste de fichiers */}
        <div className="scrivia-file-picker-content">
          {loading ? (
            <div className="scrivia-file-picker-loading">
              <div className="scrivia-file-picker-spinner"></div>
              <span>Chargement...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="scrivia-file-picker-empty">
              <div className="scrivia-file-picker-empty-icon">📁</div>
              <div className="scrivia-file-picker-empty-title">
                {searchQuery ? 'Aucun fichier trouvé' : 'Aucune image'}
              </div>
              <div className="scrivia-file-picker-empty-subtitle">
                {searchQuery 
                  ? 'Essayez une autre recherche' 
                  : 'Vous n\'avez pas encore uploadé d\'images'}
              </div>
            </div>
          ) : (
            <div className={`scrivia-file-picker-grid ${viewMode}`}>
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.has(file.id);
                return (
                  <div
                    key={file.id}
                    className={`scrivia-file-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFileClick(file.id)}
                  >
                    <div className="scrivia-file-picker-item-preview">
                      <img
                        src={file.url}
                        alt={file.filename}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {isSelected && (
                        <div className="scrivia-file-picker-item-check">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="scrivia-file-picker-item-info">
                      <div className="scrivia-file-picker-item-name">{file.filename}</div>
                      <div className="scrivia-file-picker-item-meta">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div className="scrivia-file-picker-footer">
          <button
            className="scrivia-file-picker-btn-secondary"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="scrivia-file-picker-btn-primary"
            onClick={handleConfirm}
            disabled={selectedFiles.size === 0}
          >
            Ouvrir {selectedFiles.size > 0 && `(${selectedFiles.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriviaFilePicker;

