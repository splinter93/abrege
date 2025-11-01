'use client';

import React from 'react';
import { supabase } from '@/supabaseClient';
import Editor from '@/components/editor/Editor';
import ErrorPageActions from '@/components/ErrorPageActions';
import LogoHeader from '@/components/LogoHeader';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import { useFileSystemStore } from '@/store/useFileSystemStore';

interface PublicNoteAuthWrapperProps {
  note: {
    id: string;
    user_id: string;
    share_settings: {
      visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
    };
  };
  slug: string;
  ownerId: string;
  username: string;
}

export default function PublicNoteAuthWrapper({ note, slug, ownerId, username }: PublicNoteAuthWrapperProps) {
  const [currentUser, setCurrentUser] = React.useState<{ id: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const addNote = useFileSystemStore(s => s.addNote);
  const storeNote = useFileSystemStore(s => s.notes[note.id]);

  React.useEffect(() => {
    const loadPublicNote = async () => {
      try {
        // 1. Vérifier l'auth (optionnel pour les notes publiques)
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // 2. Charger la note via l'API publique (pas besoin d'auth)
        const response = await fetch(`/api/ui/public/note/${encodeURIComponent(username)}/${slug}`);
        if (!response.ok) {
          throw new Error('Note non trouvée');
        }
        
        const { note: publicNote } = await response.json();
        
        // 3. Injecter dans le store pour que l'Editor puisse l'utiliser
        addNote({
          id: note.id,
          source_title: publicNote.source_title || 'Sans titre',
          markdown_content: publicNote.markdown_content || '',
          content: publicNote.markdown_content || '',
          html_content: publicNote.html_content || '',
          header_image: publicNote.header_image || null,
          header_image_offset: publicNote.header_image_offset ?? 50,
          header_image_blur: publicNote.header_image_blur ?? 0,
          header_image_overlay: publicNote.header_image_overlay ?? 0,
          header_title_in_image: publicNote.header_title_in_image ?? false,
          wide_mode: publicNote.wide_mode || false,
          font_family: publicNote.font_family || null,
          a4_mode: publicNote.a4_mode || false,
          slash_lang: (publicNote.slash_lang as 'fr' | 'en') || 'en',
          updated_at: publicNote.updated_at,
          created_at: publicNote.created_at,
          slug: slug,
          public_url: `/@${username}/${slug}`,
          visibility: publicNote.share_settings?.visibility || 'link-public',
          folder_id: null,
          share_settings: publicNote.share_settings
        });
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        // Logger structuré au lieu de console.error
        if (typeof window !== 'undefined') {
          console.error('[PublicNoteAuthWrapper] Erreur chargement note publique:', {
            error: errorMessage,
            noteId: note.id,
            slug,
            username
          });
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPublicNote();
  }, [note.id, slug, username, addNote]);

  // Pendant le chargement
  if (loading && !storeNote) {
    return <SimpleLoadingState message="Chargement de la note…" />;
  }
  
  if (error && !storeNote) {
    return <SimpleLoadingState message="Impossible de charger la note" />;
  }

  // Vérifier si l'utilisateur est le propriétaire
  const isOwner = currentUser?.id === ownerId;

  // Si la note est privée/link-private et que l'utilisateur n'est pas le propriétaire
  if ((note.share_settings?.visibility === 'private' || note.share_settings?.visibility === 'link-private') && !isOwner) {
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

  // Afficher la note en mode lecture seule avec l'éditeur
  // Layout identique à la page privée
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <Editor 
        noteId={note.id} 
        readonly={true} 
        userId={note.user_id}
        canEdit={isOwner} // Seul le propriétaire peut éditer
      />
    </div>
  );
}
