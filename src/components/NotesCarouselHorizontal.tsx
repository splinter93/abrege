"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { simpleLogger as logger } from '@/utils/logger';
import ContentCard from './ContentCard';
import './NotesCarouselHorizontal.css';

interface Note {
  id: string;
  source_title: string;
  header_image?: string;
  updated_at: string;
  share_settings: {
    visibility: 'public' | 'private' | 'unlisted';
  };
  read_time?: number;
  markdown_content?: string;
}

interface NotesCarouselHorizontalProps {
  limit?: number;
  showNavigation?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

/**
 * Carrousel horizontal de notes récentes utilisant les ContentCard existantes
 * Design Notion-like avec défilement latéral
 */
const NotesCarouselHorizontal: React.FC<NotesCarouselHorizontalProps> = ({
  limit = 8,
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Charger les notes récentes
  useEffect(() => {
    const loadRecentNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getAccessToken();
        if (!token) {
          logger.warn('[NotesCarouselHorizontal] Token d\'authentification non disponible');
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
          logger.dev('[NotesCarouselHorizontal] Notes chargées:', data.notes.length);
        } else {
          throw new Error(data.error || 'Format de réponse invalide');
        }
      } catch (err) {
        logger.error('[NotesCarouselHorizontal] Erreur chargement notes:', err);
        setError('Erreur lors du chargement des notes');
      } finally {
        setLoading(false);
      }
    };

    loadRecentNotes();
  }, [limit, getAccessToken]);

  // Vérifier si on peut faire défiler
  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [notes]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || isHovered || notes.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        const cardWidth = 320; // Largeur approximative d'une carte
        const nextScroll = scrollLeft + cardWidth;
        
        if (nextScroll >= scrollWidth - clientWidth) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollTo({ left: nextScroll, behavior: 'smooth' });
        }
      }
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, notes.length]);

  // Navigation
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 320;
      scrollContainerRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 320;
      scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  };

  // Convertir les notes en format ContentCard
  const convertNoteToContentCard = (note: Note) => {
    // Générer un aperçu du contenu
    const generatePreview = (markdownContent?: string): string => {
      if (!markdownContent) return 'Note sans contenu';
      
      const cleanText = markdownContent
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      return cleanText.length > 80 ? cleanText.substring(0, 80) + '...' : cleanText;
    };

    // Calculer le temps de lecture
    const calculateReadTime = (markdownContent?: string): string => {
      if (!markdownContent) return '1 min';
      const wordCount = markdownContent.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));
      return `${readTime} min`;
    };

    // Déterminer la catégorie basée sur la visibilité
    const getCategory = (visibility: string): string => {
      switch (visibility) {
        case 'public': return 'Public';
        case 'unlisted': return 'Partagé';
        case 'private': return 'Privé';
        default: return 'Note';
      }
    };

    return {
      id: note.id,
      imageUrl: note.header_image || '/placeholder-note.svg',
      category: getCategory(note.share_settings.visibility),
      title: note.source_title || 'Sans titre',
      source: generatePreview(note.markdown_content),
      duration: calculateReadTime(note.markdown_content),
      readTime: calculateReadTime(note.markdown_content)
    };
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className={`notes-carousel-horizontal ${className}`}>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <span>Chargement des notes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`notes-carousel-horizontal ${className}`}>
        <div className="carousel-error">
          <span>❌ {error}</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className={`notes-carousel-horizontal ${className}`}>
        <div className="carousel-empty">
          <span>📝 Aucune note récente</span>
          <p>Créez votre première note pour la voir apparaître ici</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`notes-carousel-horizontal ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header avec titre et navigation */}
      <div className="carousel-header">
        <div className="carousel-title">
          <h3>Notes Récentes</h3>
          <span className="carousel-count">{notes.length} note{notes.length > 1 ? 's' : ''}</span>
        </div>
        
        {showNavigation && (
          <div className="carousel-nav">
            <button 
              className="nav-btn prev-btn"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className="nav-btn next-btn"
              onClick={scrollRight}
              disabled={!canScrollRight}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Container du carrousel avec scroll horizontal */}
      <div className="carousel-container">
        <div 
          ref={scrollContainerRef}
          className="carousel-scroll"
          onScroll={() => {
            if (scrollContainerRef.current) {
              const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
              setCanScrollLeft(scrollLeft > 0);
              setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
            }
          }}
        >
          <div className="carousel-track">
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                className="carousel-item"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <ContentCard 
                  data={convertNoteToContentCard(note)}
                  onClick={() => {
                    // Navigation vers la note
                    window.location.href = `/private/note/${note.id}`;
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesCarouselHorizontal;
