"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileText, Calendar, Eye, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { simpleLogger as logger } from '@/utils/logger';
import './NotesCarousel.css';

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
}

interface NotesCarouselProps {
  limit?: number;
  showNavigation?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

/**
 * Carrousel de notes récentes avec navigation et autoplay
 * Design moderne et compact pour le dashboard
 */
const NotesCarousel: React.FC<NotesCarouselProps> = ({
  limit = 6,
  showNavigation = true,
  autoPlay = true,
  autoPlayInterval = 5000,
  className = ''
}) => {
  const { getAccessToken } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Charger les notes récentes
  useEffect(() => {
    const loadRecentNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer le token d'authentification
        const token = await getAccessToken();
        if (!token) {
          logger.warn('[NotesCarousel] Token d\'authentification non disponible');
          setError('Token d\'authentification non disponible');
          return;
        }

        // Appel à l'API v2
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
          logger.dev('[NotesCarousel] Notes chargées:', data.notes.length);
        } else {
          throw new Error(data.error || 'Format de réponse invalide');
        }
      } catch (err) {
        logger.error('[NotesCarousel] Erreur chargement notes:', err);
        setError('Erreur lors du chargement des notes');
      } finally {
        setLoading(false);
      }
    };

    loadRecentNotes();
  }, [limit, getAccessToken]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || isHovered || notes.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notes.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, notes.length]);

  // Navigation
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + notes.length) % notes.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % notes.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
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

  // Couleur de visibilité
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return '#10b981';
      case 'unlisted': return '#f59e0b';
      case 'private': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Icône de visibilité
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return '🌐';
      case 'unlisted': return '🔗';
      case 'private': return '🔒';
      default: return '🔒';
    }
  };

  // Générer un aperçu du contenu markdown
  const generateContentPreview = (markdownContent?: string): string => {
    if (!markdownContent) return '';
    
    // Nettoyer le markdown et extraire le texte
    const cleanText = markdownContent
      .replace(/#{1,6}\s+/g, '') // Supprimer les titres
      .replace(/\*\*(.*?)\*\*/g, '$1') // Supprimer le gras
      .replace(/\*(.*?)\*/g, '$1') // Supprimer l'italique
      .replace(/`(.*?)`/g, '$1') // Supprimer le code inline
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Supprimer les liens
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Supprimer les images
      .replace(/\n+/g, ' ') // Remplacer les retours à la ligne par des espaces
      .trim();
    
    // Limiter à 100 caractères
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className={`notes-carousel ${className}`}>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <span>Chargement des notes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`notes-carousel ${className}`}>
        <div className="carousel-error">
          <span>❌ {error}</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className={`notes-carousel ${className}`}>
        <div className="carousel-empty">
          <FileText size={32} />
          <span>Aucune note récente</span>
          <p>Créez votre première note pour la voir apparaître ici</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`notes-carousel ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header avec titre et navigation */}
      <div className="carousel-header">
        <div className="carousel-title">
          <h3>Notes Récentes</h3>
          <span className="carousel-count">{notes.length} note{notes.length > 1 ? 's' : ''}</span>
        </div>
        
        {showNavigation && notes.length > 1 && (
          <div className="carousel-nav">
            <button 
              className="nav-btn prev-btn"
              onClick={goToPrevious}
              disabled={notes.length <= 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="nav-btn next-btn"
              onClick={goToNext}
              disabled={notes.length <= 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Container du carrousel */}
      <div className="carousel-container">
        <motion.div 
          className="carousel-track"
          animate={{ x: -currentIndex * 100 + '%' }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              className="carousel-slide"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link href={`/private/note/${note.id}`} className="note-card-link">
                <div className="note-card">
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
                        <FileText size={24} />
                      </div>
                    )}
                    <div className="note-category-tag">
                      {getVisibilityIcon(note.share_settings.visibility)}
                    </div>
                  </div>

                  {/* Contenu de la note */}
                  <div className="note-content">
                    <h4 className="note-title">{note.source_title}</h4>
                    
                    {generateContentPreview(note.markdown_content) && (
                      <p className="note-preview">{generateContentPreview(note.markdown_content)}</p>
                    )}

                    <div className="note-meta">
                      <div className="note-date">
                        <Calendar size={12} />
                        <span>{formatDate(note.updated_at)}</span>
                      </div>
                      
                      {note.read_time && (
                        <div className="note-read-time">
                          <Clock size={12} />
                          <span>{note.read_time} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overlay au hover */}
                  <div className="note-overlay">
                    <Eye size={20} />
                    <span>Ouvrir</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Indicateurs de pagination */}
      {notes.length > 1 && (
        <div className="carousel-indicators">
          {notes.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesCarousel;
