"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Clock, User, Globe, Lock, Link as LinkIcon, Calendar, Eye } from 'lucide-react';

interface RecentNote {
  id: string;
  source_title: string; // Changé de 'title' à 'source_title' pour l'API v2
  slug: string;
  header_image?: string; // Changé de 'headerImage' à 'header_image' pour l'API v2
  created_at: string; // Changé de 'createdAt' à 'created_at' pour l'API v2
  updated_at: string; // Changé de 'updatedAt' à 'updated_at' pour l'API v2
  share_settings: {
    visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  };
  user_id: string; // Changé de 'username' à 'user_id' pour l'API v2
  url?: string;
}

interface RecentActivityCardProps {
  limit?: number;
  username?: string;
  showHeader?: boolean;
  compact?: boolean;
  onError?: () => void;
}

export default function RecentActivityCard({ 
  limit = 3, 
  username, 
  showHeader = true,
  compact = false,
  onError
}: RecentActivityCardProps) {
  const { getAccessToken } = useAuth();
  const [notes, setNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer le token d'authentification
        const token = await getAccessToken();
        if (!token) {
          console.log('🔧 Dashboard: Token d\'authentification non disponible, utilisation du fallback');
          setError('Token d\'authentification non disponible');
          onError?.(); // Appeler le callback d'erreur pour afficher le fallback
          return;
        }

        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (username) params.append('username', username);
        
        console.log('🔧 Dashboard: Appel API notes récentes avec token');
        const response = await fetch(`/api/v2/notes/recent?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔧 Dashboard: Erreur API', response.status, errorText);
          throw new Error(`Erreur API: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('🔧 Dashboard: Réponse API reçue', data);
        
        if (data.success && data.notes) {
          setNotes(data.notes);
          console.log(`🔧 Dashboard: ${data.notes.length} notes chargées`);
        } else {
          throw new Error(data.error || 'Format de réponse invalide');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('🔧 Dashboard: Erreur lors du chargement des notes récentes:', err);
        setError(errorMessage);
        onError?.(); // Appeler le callback d'erreur pour afficher le fallback
      } finally {
        setLoading(false);
      }
    };

    fetchRecentNotes();
  }, [limit, username, getAccessToken, onError]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return 'À l\'instant';
      if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
      if (diffInHours < 24) return `Il y a ${diffInHours}h`;
      if (diffInDays < 7) return `Il y a ${diffInDays}j`;
      
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return <Lock size={12} />;
      case 'link-public':
        return <Globe size={12} />;
      case 'link-private':
        return <LinkIcon size={12} />;
      default:
        return <Lock size={12} />;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'var(--accent-orange, #f97316)';
      case 'link-public':
        return 'var(--accent-amber, #f59e0b)';
      case 'link-private':
        return 'var(--accent-yellow, #eab308)';
      default:
        return 'var(--accent-orange, #f97316)';
    }
  };

  if (loading) {
    return (
      <div className="activity-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-error">
        <div className="error-content">
          <span>⚠️ Erreur lors du chargement</span>
          <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="activity-empty">
        <div className="empty-content">
          <FileText size={24} />
          <span>Aucune activité récente</span>
          <p>Commencez par créer votre première note !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-container">
      <div className="activity-list">
        {notes.map((note, index) => (
          <div key={note.id} className={`activity-item ${index === notes.length - 1 ? 'last-item' : ''}`}>
            <div className="item-image">
              {note.header_image ? (
                <div className="note-thumbnail">
                  <img src={note.header_image} alt={note.source_title} />
                </div>
              ) : (
                <div className="note-icon-placeholder">
                  <FileText size={20} />
                </div>
              )}
            </div>
            
            <div className="item-content">
              <div className="item-title">
                <Link 
                  href={`/private/note/${note.id}`}
                  className="note-title-link"
                  title={`Ouvrir la note: ${note.source_title}`}
                >
                  {note.source_title}
                </Link>
              </div>
              
              <div className="item-meta">
                <div className="meta-date">
                  <Calendar size={14} />
                  <span>{formatDate(note.updated_at)}</span>
                </div>
                <div className="meta-visibility">
                  <div 
                    className="visibility-badge"
                    style={{ color: getVisibilityColor(note.share_settings.visibility) }}
                  >
                    {getVisibilityIcon(note.share_settings.visibility)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="item-actions">
              <Link 
                href={`/private/note/${note.id}`}
                className="open-note-btn"
                title="Ouvrir la note"
              >
                <Eye size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 