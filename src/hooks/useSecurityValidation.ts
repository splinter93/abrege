import { useMemo } from 'react';

interface ShareSettings {
  visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  invited_users?: string[];
}

interface Note {
  share_settings: ShareSettings;
  user_id: string;
}

/**
 * Hook personnalisé pour la validation de sécurité des notes
 * Centralise toute la logique de vérification des permissions
 */
export function useSecurityValidation(note: Note, currentUserId?: string) {
  const isAccessAllowed = useMemo(() => {
    // Si la note est privée, seul le propriétaire peut y accéder
    if (note.share_settings.visibility === 'private') {
      return currentUserId === note.user_id;
    }
    
    // Pour les notes avec accès limité, vérifier les invitations
    if (note.share_settings.visibility === 'limited') {
      return note.share_settings.invited_users?.includes(currentUserId || '') || false;
    }
    
    // Pour les notes Scrivia, l'utilisateur doit être connecté
    if (note.share_settings.visibility === 'scrivia') {
      return !!currentUserId;
    }
    
    // Pour les liens publics/privés, l'accès est autorisé
    if (note.share_settings.visibility === 'link-public' || note.share_settings.visibility === 'link-private') {
      return true;
    }
    
    // Par défaut, refuser l'accès
    return false;
  }, [note.share_settings.visibility, note.share_settings.invited_users, currentUserId, note.user_id]);

  const accessLevel = useMemo(() => {
    if (currentUserId === note.user_id) return 'owner';
    if (note.share_settings.visibility === 'private') return 'none';
    if (note.share_settings.visibility === 'limited' && note.share_settings.invited_users?.includes(currentUserId || '')) return 'invited';
    if (note.share_settings.visibility === 'scrivia' && currentUserId) return 'scrivia';
    if (note.share_settings.visibility === 'link-public' || note.share_settings.visibility === 'link-private') return 'public';
    return 'none';
  }, [note.share_settings.visibility, note.share_settings.invited_users, currentUserId, note.user_id]);

  return {
    isAccessAllowed,
    accessLevel,
    isOwner: currentUserId === note.user_id,
    isPublic: note.share_settings.visibility === 'link-public' || note.share_settings.visibility === 'link-private',
    isPrivate: note.share_settings.visibility === 'private',
    isLimited: note.share_settings.visibility === 'limited',
    isScrivia: note.share_settings.visibility === 'scrivia'
  };
} 