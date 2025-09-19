"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Image, 
  File, 
  Calendar,
  Clock,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { simpleLogger as logger } from '@/utils/logger';

interface RecentFile {
  id: string;
  name: string;
  type: string; // MIME type
  updated_at: string;
  size?: number;
  url?: string;
}

interface RecentFilesListProps {
  limit?: number;
  className?: string;
}

/**
 * Liste des fichiers récents avec design moderne
 * Affiche les 4-5 derniers fichiers modifiés
 */
const RecentFilesList: React.FC<RecentFilesListProps> = ({
  limit = 5,
  className = ''
}) => {
  const { getAccessToken } = useAuth();
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les fichiers récents
  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getAccessToken();
        if (!token) {
          logger.warn('[RecentFilesList] Token d\'authentification non disponible');
          setError('Token d\'authentification non disponible');
          return;
        }

        const params = new URLSearchParams();
        params.append('limit', limit.toString());
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
          // Convertir les fichiers en format RecentFile
          const recentFiles: RecentFile[] = data.files.map((file: {
            slug?: string;
            filename: string;
            type: string;
            created_at: string;
            size?: number;
            url?: string;
          }) => ({
            id: file.slug || file.filename,
            name: file.filename,
            type: file.type, // Garder le MIME type original
            updated_at: file.created_at, // Utiliser created_at car c'est ce qu'on trie
            size: file.size,
            url: file.url
          }));
          
          setFiles(recentFiles);
          logger.dev('[RecentFilesList] Fichiers chargés:', recentFiles.length);
        } else {
          throw new Error(data.error || 'Format de réponse invalide');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        logger.error('[RecentFilesList] Erreur chargement fichiers:', errorMessage);
        setError(`Erreur lors du chargement des fichiers: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    loadRecentFiles();
  }, [limit, getAccessToken]);

  // Formatage des dates - optimisé avec useCallback
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }, []);

  // Formatage de la taille de fichier - optimisé avec useCallback
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Fonction pour obtenir l'icône selon le type MIME - optimisé avec useCallback
  const getFileIcon = useCallback((mimeType: string): string => {
    const type = mimeType || '';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('text/')) return '📄';
    if (type.startsWith('image/')) return '🖼️';
    return '📁';
  }, []);

  // Composant pour l'aperçu d'image (comme dans FilesContent)
  const ImagePreview = ({ file }: { file: RecentFile }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (imageError) {
      return (
        <div className="recent-file-icon">
          {getFileIcon(file.type)}
        </div>
      );
    }

    return (
      <div className="recent-file-image-preview">
        <img
          src={file.url}
          alt={file.name}
          className={`recent-preview-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        {!imageLoaded && !imageError && (
          <div className="recent-preview-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    );
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className={`recent-files-list ${className}`}>
        <div className="recent-file-item">
          <div className="recent-file-icon">
            <Clock size={16} />
          </div>
          <div className="recent-file-content">
            <div className="recent-file-name">Chargement...</div>
            <div className="recent-file-meta">Récupération des fichiers</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`recent-files-list ${className}`}>
        <div className="recent-file-item">
          <div className="recent-file-icon">
            <FileText size={16} />
          </div>
          <div className="recent-file-content">
            <div className="recent-file-name">Erreur de chargement</div>
            <div className="recent-file-meta">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`recent-files-list ${className}`}>
        <div className="recent-file-item">
          <div className="recent-file-icon">
            <FileText size={16} />
          </div>
          <div className="recent-file-content">
            <div className="recent-file-name">Aucun fichier récent</div>
            <div className="recent-file-meta">Créez votre première note</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`recent-files-grid ${className}`}>
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          className="recent-file-grid-item"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {file.url ? (
            <Link href={file.url} className="recent-file-link">
              {file.type.startsWith('image/') ? (
                <ImagePreview file={file} />
              ) : (
                <div className="recent-file-icon">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="recent-file-info">
                <div className="recent-file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="recent-file-meta">
                  {formatDate(file.updated_at)}
                  {file.size && ` • ${formatFileSize(file.size)}`}
                </div>
              </div>
            </Link>
          ) : (
            <div className="recent-file-link">
              {file.type.startsWith('image/') ? (
                <ImagePreview file={file} />
              ) : (
                <div className="recent-file-icon">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="recent-file-info">
                <div className="recent-file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="recent-file-meta">
                  {formatDate(file.updated_at)}
                  {file.size && ` • ${formatFileSize(file.size)}`}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default RecentFilesList;
