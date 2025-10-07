"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Calendar, 
  Eye, 
  Clock, 
  Globe, 
  Lock, 
  Link as LinkIcon,
  MoreHorizontal,
  Star,
  Bookmark
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';
import SimpleContextMenu from './SimpleContextMenu';
import './NotesCarouselNotion.css';

interface Note {
  id: string;
  source_title: string;
  header_image?: string;
  updated_at: string;
  share_settings: {
    visibility: 'public' | 'private' | 'unlisted';
  };
  read_time?: number;
  content_preview?: string;
  markdown_content?: string;
  tags?: string[];
  is_favorite?: boolean;
}

interface NotesCarouselNotionProps {
  limit?: number;
  showNavigation?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
  title?: string;
  showViewAll?: boolean;
}

export interface NotesCarouselRef {
  goToPrevious: () => void;
  goToNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

/**
 * Carrousel de notes avec design moderne style Notion
 * Cartes élégantes avec animations fluides et interactions tactiles
 */
const NotesCarouselNotion = forwardRef<NotesCarouselRef, NotesCarouselNotionProps>(({
  limit = 8,
  showNavigation = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  className = '',
  title = "Notes Récentes",
  showViewAll = true
}, ref) => {
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; note: Note | null }>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    note: null 
  });

  // Configuration du carrousel - Responsive
  const [cardsPerView, setCardsPerView] = useState(3);

  // Détecter la taille d'écran pour ajuster le nombre de cartes
  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth >= 1400) {
        setCardsPerView(4); // Desktop Large
      } else if (window.innerWidth >= 1024) {
        setCardsPerView(3); // Desktop Standard
      } else if (window.innerWidth >= 768) {
        setCardsPerView(2); // Tablet
      } else {
        setCardsPerView(1); // Mobile
      }
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Charger les notes récentes
  useEffect(() => {
    const loadRecentNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getAccessToken();
        if (!token) {
          logger.warn('[NotesCarouselNotion] Token d\'authentification non disponible');
          setError('Token d\'authentification non disponible');
          return;
        }

        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        
        const response = await fetch(`/api/v2/note/recent?${params}`, {
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
        
        if (data.success && data.notes) {
          setNotes(data.notes);
          logger.dev('[NotesCarouselNotion] Notes chargées:', data.notes.length);
        } else {
          throw new Error(data.error || 'Format de réponse invalide');
        }
      } catch (err) {
        logger.error('[NotesCarouselNotion] Erreur chargement notes:', err);
        setError('Erreur lors du chargement des notes');
      } finally {
        setLoading(false);
      }
    };

    loadRecentNotes();
  }, [limit, getAccessToken]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || isHovered || notes.length <= cardsPerView || isDragging) return;

    const interval = setInterval(() => {
      const maxIndex = Math.max(0, notes.length - cardsPerView);
      setCurrentIndex((prev) => prev >= maxIndex ? 0 : prev + cardsPerView);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, notes.length, isDragging, cardsPerView]);

  // Fermer le menu contextuel avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenu.visible]);
  
  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - cardsPerView));
  };

  const goToNext = () => {
    const maxIndex = Math.max(0, notes.length - cardsPerView);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + cardsPerView));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Exposer les fonctions de navigation via la ref
  useImperativeHandle(ref, () => ({
    goToPrevious,
    goToNext,
    canGoPrevious: currentIndex > 0,
    canGoNext: currentIndex < Math.max(0, notes.length - cardsPerView)
  }), [currentIndex, notes.length, cardsPerView]);

  // Gestion du drag
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStart;
    setDragOffset(delta);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Gestion du scroll avec trackpad
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Détecter le scroll horizontal (trackpad)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 0) {
        // Scroll vers la droite = page suivante
        goToNext();
      } else {
        // Scroll vers la gauche = page précédente
        goToPrevious();
      }
    }
  };

  // Gestion du menu contextuel
  const handleContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, note });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, note: null });
  };

  const handleOpenNote = () => {
    if (contextMenu.note) {
      router.push(`/private/note/${contextMenu.note.id}`);
    }
    closeContextMenu();
  };

  const handleRenameNote = async () => {
    if (!contextMenu.note) return;
    
    const newName = prompt("Nouveau titre de la note :", contextMenu.note.source_title);
    if (!newName || newName.trim() === "") {
      closeContextMenu();
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        logger.error('[NotesCarouselNotion] Token non disponible pour renommer la note');
        closeContextMenu();
        return;
      }

      const response = await fetch(`/api/v2/note/${contextMenu.note.id}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Type': 'notes_carousel'
        },
        body: JSON.stringify({ source_title: newName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du renommage de la note');
      }

      // Recharger les notes
      setNotes(prevNotes => 
        prevNotes.map(n => 
          n.id === contextMenu.note?.id 
            ? { ...n, source_title: newName.trim() } 
            : n
        )
      );

      logger.dev('[NotesCarouselNotion] Note renommée avec succès');
    } catch (err) {
      logger.error('[NotesCarouselNotion] Erreur lors du renommage:', err);
      alert('Erreur lors du renommage de la note');
    }

    closeContextMenu();
  };

  const handleDeleteNote = async () => {
    if (!contextMenu.note) return;
    
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la note "${contextMenu.note.source_title}" ?`
    );
    
    if (!confirmDelete) {
      closeContextMenu();
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        logger.error('[NotesCarouselNotion] Token non disponible pour supprimer la note');
        closeContextMenu();
        return;
      }

      const response = await fetch(`/api/v2/delete/note/${contextMenu.note.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Type': 'notes_carousel'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression de la note');
      }

      // Retirer la note de la liste
      setNotes(prevNotes => prevNotes.filter(n => n.id !== contextMenu.note?.id));

      logger.dev('[NotesCarouselNotion] Note supprimée avec succès');
    } catch (err) {
      logger.error('[NotesCarouselNotion] Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de la note');
    }

    closeContextMenu();
  };

  // Formatage des dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Icône de visibilité
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe size={14} />;
      case 'unlisted': return <LinkIcon size={14} />;
      case 'private': return <Lock size={14} />;
      default: return <Lock size={14} />;
    }
  };

  // Couleur de visibilité
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return '#10b981';
      case 'unlisted': return '#f59e0b';
      case 'private': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Générer un aperçu du contenu
  const generateContentPreview = (markdownContent?: string): string => {
    if (!markdownContent) return '';
    
    const cleanText = markdownContent
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    return cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className={`notes-carousel-notion ${className}`}>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <span>Chargement des notes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`notes-carousel-notion ${className}`}>
        <div className="carousel-error">
          <span>❌ {error}</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className={`notes-carousel-notion ${className}`}>
        <div className="carousel-empty">
          <div className="empty-icon">
            <FileText size={48} />
          </div>
          <h3>Aucune note récente</h3>
          <p>Créez votre première note pour la voir apparaître ici</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`notes-carousel-notion ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* Container du carrousel avec drag */}
      <div 
        className="carousel-container"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onWheel={handleWheel}
      >
        <motion.div 
          className="carousel-track"
          animate={{ 
            x: -currentIndex * (100 / cardsPerView) + '%',
            ...(isDragging && { x: -currentIndex * (100 / cardsPerView) + '%' + dragOffset * 0.1 })
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            ...(isDragging && { duration: 0 })
          }}
        >
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              className="carousel-slide"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Link href={`/private/note/${note.id}`} className="note-card-link">
                <motion.div 
                  className="note-card"
                  whileHover={{ 
                    y: -8,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  onContextMenu={(e) => handleContextMenu(e, note)}
                >
                  {/* Image de la note */}
                  <div className="note-image-container">
                    {note.header_image ? (
                      <img 
                        src={note.header_image} 
                        alt={note.source_title}
                        className="note-image"
                      />
                    ) : (
                      <div className="note-image-placeholder">
                        <FileText size={32} />
                      </div>
                    )}
                    
                    {/* Overlay avec actions */}
                    <div className="note-overlay">
                      <div className="note-actions">
                        <button className="action-btn" aria-label="Ouvrir la note">
                          <Eye size={16} />
                        </button>
                        {note.is_favorite && (
                          <button className="action-btn favorite" aria-label="Note favorite">
                            <Star size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Badge de visibilité */}
                    <div 
                      className="visibility-badge"
                      style={{ color: getVisibilityColor(note.share_settings.visibility) }}
                    >
                      {getVisibilityIcon(note.share_settings.visibility)}
                    </div>
                  </div>

                  {/* Contenu de la note */}
                  <div className="note-content">
                    <div className="note-header">
                      <h3 className="note-title">{note.source_title}</h3>
                      <button className="more-btn" aria-label="Plus d'options">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    
                    {/* Description, tags et métadonnées supprimés pour un design plus compact */}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Menu contextuel */}
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: 'Ouvrir', onClick: handleOpenNote },
          { label: 'Renommer', onClick: handleRenameNote },
          { label: 'Supprimer', onClick: handleDeleteNote }
        ]}
        onClose={closeContextMenu}
      />
    </div>
  );
});

NotesCarouselNotion.displayName = 'NotesCarouselNotion';

export default NotesCarouselNotion;
