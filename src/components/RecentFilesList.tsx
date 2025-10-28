"use client";

import React, { useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
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
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';
import SimpleContextMenu from './SimpleContextMenu';
import { supabase } from '@/supabaseClient';

interface RecentFile {
  id: string; // UUID réel
  slug: string; // Slug du fichier
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
const RecentFilesList = forwardRef<HTMLDivElement, RecentFilesListProps>(({
  limit = 5,
  className = ''
}, ref) => {
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; file: RecentFile | null }>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    file: null 
  });

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
            id?: string;
            slug?: string;
            filename: string;
            type: string;
            created_at: string;
            size?: number;
            url?: string;
          }) => ({
            id: file.id || '', // UUID réel nécessaire pour la suppression
            slug: file.slug || file.filename,
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
    try {
      const date = new Date(dateString);
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        logger.error('[RecentFilesList] Date invalide:', dateString);
        return 'Date invalide';
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'À l\'instant';
      if (diffInHours < 24) return `Il y a ${diffInHours}h`;
      if (diffInHours < 48) return 'Hier';
      
      // Formater manuellement pour éviter les problèmes
      const day = date.getDate();
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      // Si c'est cette année, afficher juste le jour et le mois
      if (year === now.getFullYear()) {
        return `${day} ${month}`;
      }
      
      // Sinon, afficher la date complète avec l'année
      return `${day} ${month} ${year}`;
    } catch (err) {
      logger.error('[RecentFilesList] Erreur formatage date:', err);
      return 'Date invalide';
    }
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

  // Gestion du menu contextuel
  const handleContextMenu = useCallback((e: React.MouseEvent, file: RecentFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, file: null });
  }, []);

  const handleOpenFile = useCallback(() => {
    if (contextMenu.file?.url) {
      router.push(contextMenu.file.url);
    }
    closeContextMenu();
  }, [contextMenu.file, router, closeContextMenu]);

  const handleRenameFile = useCallback(async () => {
    if (!contextMenu.file) return;
    
    const newName = prompt("Nouveau nom du fichier :", contextMenu.file.name);
    if (!newName || newName.trim() === "") {
      closeContextMenu();
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({ 
          filename: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contextMenu.file.id);

      if (error) {
        logger.error('[RecentFilesList] Erreur Supabase renommage:', error);
        throw new Error('Erreur lors du renommage du fichier');
      }

      // Mettre à jour la liste locale
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === contextMenu.file?.id 
            ? { ...f, name: newName.trim() } 
            : f
        )
      );

      logger.dev('[RecentFilesList] Fichier renommé avec succès');
    } catch (err) {
      logger.error('[RecentFilesList] Erreur lors du renommage:', err);
      alert('Erreur lors du renommage du fichier');
    }

    closeContextMenu();
  }, [contextMenu.file, closeContextMenu]);

  const handleDeleteFile = useCallback(async () => {
    if (!contextMenu.file) return;
    
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le fichier "${contextMenu.file.name}" ?`
    );
    
    if (!confirmDelete) {
      closeContextMenu();
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        logger.error('[RecentFilesList] Token non disponible pour supprimer le fichier');
        closeContextMenu();
        return;
      }

      const response = await fetch(`/api/v2/delete/file/${contextMenu.file.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Type': 'recent_files_list'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression du fichier');
      }

      // Retirer le fichier de la liste
      setFiles(prevFiles => prevFiles.filter(f => f.id !== contextMenu.file?.id));

      logger.dev('[RecentFilesList] Fichier supprimé avec succès');
    } catch (err) {
      logger.error('[RecentFilesList] Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression du fichier');
    }

    closeContextMenu();
  }, [contextMenu.file, getAccessToken, closeContextMenu]);

  const handleCopyId = useCallback(async () => {
    if (!contextMenu.file) return;
    
    try {
      await navigator.clipboard.writeText(contextMenu.file.id);
      logger.dev('[RecentFilesList] ✅ ID copié:', contextMenu.file.id);
    } catch (err) {
      logger.error('[RecentFilesList] ❌ Erreur lors de la copie de l\'ID:', err);
    }
    closeContextMenu();
  }, [contextMenu.file, closeContextMenu]);

  // Gestion du clic sur une image - DOIT ÊTRE AVANT LES RETURNS
  const handleImageClick = useCallback((e: React.MouseEvent, file: RecentFile) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (file.type.startsWith('image/') && file.url) {
      // Import dynamique de la modale d'image
      import('@/components/chat/ImageModal').then(({ openImageModal }) => {
        openImageModal({
          src: file.url!,
          alt: file.name,
          fileName: file.name
        });
      });
    }
  }, []);

  // Fermer le menu contextuel avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenu.visible, closeContextMenu]);

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
      <>
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
        <SimpleContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          options={[]}
          onClose={closeContextMenu}
        />
      </>
    );
  }

  if (error) {
    return (
      <>
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
        <SimpleContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          options={[]}
          onClose={closeContextMenu}
        />
      </>
    );
  }

  if (files.length === 0) {
    return (
      <>
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
        <SimpleContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          options={[]}
          onClose={closeContextMenu}
        />
      </>
    );
  }

  return (
    <>
      <div ref={ref} className={`recent-files-grid ${className}`}>
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            className="recent-file-grid-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onContextMenu={(e) => handleContextMenu(e, file)}
          >
            {file.url ? (
              file.type.startsWith('image/') ? (
                // ✅ Pour les images : div cliquable qui ouvre la modale
                <div 
                  className="recent-file-link" 
                  onClick={(e) => handleImageClick(e, file)}
                  style={{ cursor: 'pointer' }}
                >
                  <ImagePreview file={file} />
                  <div className="recent-file-info">
                    <div className="recent-file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="recent-file-meta">
                      {formatDate(file.updated_at)}
                    </div>
                  </div>
                </div>
              ) : (
                // Pour les autres fichiers : Link normal
                <Link href={file.url} className="recent-file-link">
                  <div className="recent-file-icon">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="recent-file-info">
                    <div className="recent-file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="recent-file-meta">
                      {formatDate(file.updated_at)}
                    </div>
                  </div>
                </Link>
              )
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
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Menu contextuel */}
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: 'Ouvrir', onClick: handleOpenFile },
          { label: 'Renommer', onClick: handleRenameFile },
          { label: 'Copier l\'ID', onClick: handleCopyId },
          { label: 'Supprimer', onClick: handleDeleteFile }
        ]}
        onClose={closeContextMenu}
      />
    </>
  );
});

RecentFilesList.displayName = 'RecentFilesList';

export default RecentFilesList;
