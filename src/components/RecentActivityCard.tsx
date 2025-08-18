"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, User, Globe, Lock, Link as LinkIcon, Calendar, Eye } from 'lucide-react';

interface RecentNote {
  id: string;
  title: string;
  slug: string;
  headerImage?: string;
  createdAt: string;
  updatedAt: string;
  share_settings: {
    visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  };
  username: string;
  url?: string;
}

interface RecentActivityCardProps {
  limit?: number;
  username?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export default function RecentActivityCard({ 
  limit = 3, 
  username, 
  showHeader = true,
  compact = false 
}: RecentActivityCardProps) {
  const [notes, setNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (username) params.append('username', username);
        
        const response = await fetch(`/api/v2/notes/recent?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recent notes');
        }
        
        const data = await response.json();
        if (data.success) {
          setNotes(data.notes);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentNotes();
  }, [limit, username]);

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
      <div className="activity-header">
        <div className="header-content">
          <Clock size={16} />
          <h3>Activité Récente</h3>
        </div>
        <div className="header-actions">
          <Link href="/private/notes" className="view-all-link">
            <Eye size={14} />
            <span>Voir tout</span>
          </Link>
        </div>
      </div>
      
      <div className="activity-list">
        {notes.map((note, index) => (
          <div key={note.id} className={`activity-item ${index === notes.length - 1 ? 'last-item' : ''}`}>
            <div className="item-icon">
              {note.headerImage ? (
                <div className="note-thumbnail">
                  <img src={note.headerImage} alt="" />
                </div>
              ) : (
                <div className="note-icon">
                  <FileText size={16} />
                </div>
              )}
            </div>
            
            <div className="item-content">
              <div className="item-header">
                <Link 
                  href={`/private/note/${note.id}`}
                  className="note-title"
                  title={`Ouvrir la note: ${note.title}`}
                >
                  {note.title}
                </Link>
                <div 
                  className="visibility-badge"
                  style={{ color: getVisibilityColor(note.share_settings.visibility) }}
                >
                  {getVisibilityIcon(note.share_settings.visibility)}
                </div>
              </div>
              
              <div className="item-meta">
                <div className="meta-item">
                  <User size={12} />
                  <span>@{note.username}</span>
                </div>
                <div className="meta-separator">•</div>
                <div className="meta-item">
                  <Calendar size={12} />
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
                {note.url && (
                  <>
                    <div className="meta-separator">•</div>
                    <Link 
                      href={note.url}
                      className="meta-link"
                    >
                      <LinkIcon size={12} />
                      <span>Source</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 