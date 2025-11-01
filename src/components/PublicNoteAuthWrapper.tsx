'use client';

import React from 'react';
import { supabase } from '@/supabaseClient';
import Editor from '@/components/editor/Editor';
import ErrorPage from '@/components/ErrorPage';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';
import { logger, LogCategory } from '@/utils/logger';

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

  // ✅ HOOKS RULES : Appeler tous les hooks AVANT les returns conditionnels
  const { isAccessAllowed, isOwner, accessLevel } = useSecurityValidation(
    { 
      share_settings: note.share_settings, 
      user_id: note.user_id 
    },
    currentUser?.id
  );

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
        // Logger structuré avec contexte complet
        logger.error(LogCategory.EDITOR, '[PublicNoteAuthWrapper] Erreur chargement note publique', {
          error: {
            message: errorMessage,
            stack: err instanceof Error ? err.stack : undefined
          },
          context: {
            noteId: note.id,
            slug,
            username,
            timestamp: Date.now()
          }
        });
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
    // Déterminer le message selon le type d'erreur
    const errorMessage = error.includes('non trouvée') 
      ? 'Note non trouvée'
      : error.includes('réseau') || error.includes('fetch')
      ? 'Erreur de connexion'
      : 'Impossible de charger la note';
    
    const errorDetails = error.includes('non trouvée')
      ? 'La note demandée n\'existe pas ou a été supprimée.'
      : error.includes('réseau') || error.includes('fetch')
      ? 'Vérifiez votre connexion internet et réessayez.'
      : 'Une erreur inattendue s\'est produite.';
    
    return (
      <ErrorPage
        icon={error.includes('réseau') ? 'network' : 'warning'}
        title={errorMessage}
        description={errorDetails}
        subtitle={`Détails techniques : ${error}`}
        showActions={true}
      />
    );
  }

  // Si l'accès n'est pas autorisé
  if (!isAccessAllowed) {
    return (
      <ErrorPage
        icon="lock"
        title="Note privée"
        description="Cette note est privée et n'est pas accessible publiquement."
        subtitle="Seul l'auteur peut consulter cette note."
        showActions={true}
      />
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
