"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RecentNote {
  id: string;
  title: string;
  slug: string;
  headerImage?: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
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
        
        const response = await fetch(`/api/v1/notes/recent?${params}`);
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

  if (loading) {
    return (
      <div style={{ 
        padding: compact ? '12px' : '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          opacity: 0.7 
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: compact ? '12px' : '14px' }}>
            Chargement...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: compact ? '12px' : '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        opacity: 0.7
      }}>
        <span style={{ fontSize: compact ? '12px' : '14px' }}>
          Erreur lors du chargement
        </span>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div style={{ 
        padding: compact ? '12px' : '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        opacity: 0.7
      }}>
        <span style={{ fontSize: compact ? '12px' : '14px' }}>
          Aucune activité récente
        </span>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {showHeader && (
        <div style={{
          padding: compact ? '12px 12px 8px 12px' : '16px 16px 12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <h3 style={{ 
            fontSize: compact ? '14px' : '16px', 
            margin: 0,
            fontWeight: '500',
            opacity: 0.9
          }}>
            Activité récente
          </h3>
        </div>
      )}
      
      <div style={{ padding: compact ? '8px' : '12px' }}>
        {notes.map((note, index) => (
          <div key={note.id} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: compact ? '8px' : '12px',
            padding: compact ? '6px' : '8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            ...(index < notes.length - 1 && {
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              marginBottom: compact ? '4px' : '6px'
            })
          }}>
            {note.headerImage && (
              <div style={{
                width: compact ? '32px' : '40px',
                height: compact ? '32px' : '40px',
                borderRadius: '4px',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <img 
                  src={note.headerImage} 
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '2px'
              }}>
                <Link 
                  href={`/private/note/${note.id}`}
                  style={{
                    fontSize: compact ? '12px' : '14px',
                    fontWeight: '500',
                    color: note.isPublished ? 'var(--accent-hover, #5fb2ff)' : 'var(--text-1, #eaeaec)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    transition: 'all 0.2s ease'
                  }}
                  title={`Ouvrir la note: ${note.title}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {note.title}
                </Link>
                {note.isPublished && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 4px',
                    borderRadius: '8px',
                    background: 'rgba(95, 178, 255, 0.1)',
                    color: 'var(--accent-hover, #5fb2ff)',
                    border: '1px solid rgba(95, 178, 255, 0.2)',
                    flexShrink: 0
                  }}>
                    Public
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: compact ? '10px' : '12px',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap'
              }}>
                <span>@{note.username}</span>
                <span>•</span>
                <span>{formatDate(note.updatedAt)}</span>
                {note.url && (
                  <>
                    <span>•</span>
                    <Link 
                      href={note.url}
                      style={{
                        color: 'var(--accent-hover, #5fb2ff)',
                        textDecoration: 'none',
                        fontSize: compact ? '10px' : '12px'
                      }}
                    >
                      Voir
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