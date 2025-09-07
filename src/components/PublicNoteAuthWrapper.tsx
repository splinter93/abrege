'use client';

import React from 'react';
import { supabase } from '@/supabaseClient';
import PublicNoteContent from '@/app/[username]/[slug]/PublicNoteContent';
import ErrorPageActions from '@/components/ErrorPageActions';
import LogoHeader from '@/components/LogoHeader';

interface PublicNoteAuthWrapperProps {
  note: {
    id: string;
    source_title: string;
    html_content: string;
    markdown_content: string;
    header_image: string | null;
    header_image_offset: number | null;
    header_image_blur: number | null;
    header_image_overlay: number | null;
    header_title_in_image: boolean | null;
    wide_mode: boolean | null;
    font_family: string | null;
    share_settings: {
      visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
    };
    user_id: string;
  };
  slug: string;
  ownerId: string;
}

export default function PublicNoteAuthWrapper({ note, slug, ownerId }: PublicNoteAuthWrapperProps) {
  const [currentUser, setCurrentUser] = React.useState<{ id: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Pendant le chargement
  if (loading) {
    return (
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-logo">
            <LogoHeader size="medium" position="center" />
          </div>
          <h1 className="not-found-title">Chargement...</h1>
        </div>
      </div>
    );
  }

  // Vérifier si l'utilisateur est le propriétaire
  const isOwner = currentUser?.id === ownerId;

  // Si la note est privée et que l'utilisateur n'est pas le propriétaire
  if (note.share_settings?.visibility === 'private' && !isOwner) {
    return (
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-logo">
            <LogoHeader size="medium" position="center" />
          </div>
          
          <div className="not-found-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M9 12L11 14L15 10" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <h1 className="not-found-title">Note privée</h1>
          <p className="not-found-description">
            Cette note est privée et n'est pas accessible publiquement.
          </p>
          <p className="not-found-subtitle">
            Seul l'auteur peut consulter cette note.
          </p>
          
          <ErrorPageActions />
        </div>
      </div>
    );
  }

  // Afficher la note (publique ou privée si l'utilisateur est le propriétaire)
  return <PublicNoteContent note={note} slug={slug} />;
}
