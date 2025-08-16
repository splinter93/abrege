/**
 * Types pour le système de partage inspiré de Google Drive
 */

export type VisibilityLevel = 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';

export interface ShareSettings {
  /** Niveau de visibilité de la note */
  visibility: VisibilityLevel;
  
  /** Liste des utilisateurs invités (pour 'limited') */
  invited_users: string[];
  
  /** Permissions d'édition pour les utilisateurs invités */
  allow_edit: boolean;
  
  /** Date d'expiration du lien (optionnel) */
  link_expires?: string;
  
  /** Permissions de commentaire (optionnel) */
  allow_comments?: boolean;
}

export interface ShareSettingsUpdate {
  visibility?: VisibilityLevel;
  invited_users?: string[];
  allow_edit?: boolean;
  link_expires?: string;
  allow_comments?: boolean;
}

export interface ShareInvitation {
  id: string;
  article_id: string;
  invited_user_id: string;
  invited_by: string;
  permissions: {
    view: boolean;
    edit: boolean;
    comment: boolean;
  };
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at?: string;
}

export interface SharePermissions {
  /** L'utilisateur peut voir la note */
  can_view: boolean;
  
  /** L'utilisateur peut éditer la note */
  can_edit: boolean;
  
  /** L'utilisateur peut commenter */
  can_comment: boolean;
  
  /** L'utilisateur peut partager */
  can_share: boolean;
  
  /** L'utilisateur peut supprimer */
  can_delete: boolean;
  
  /** L'utilisateur est le propriétaire */
  is_owner: boolean;
}

export interface ShareStats {
  /** Nombre total de vues */
  view_count: number;
  
  /** Nombre d'utilisateurs ayant accès */
  access_count: number;
  
  /** Nombre de commentaires */
  comment_count: number;
  
  /** Dernière activité */
  last_activity: string;
}

// Constantes pour l'interface utilisateur
export const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  private: 'Privé',
  'link-private': 'Lien privé',
  'link-public': 'Lien public',
  limited: 'Accès limité',
  scrivia: 'Scrivia Users'
};

export const VISIBILITY_DESCRIPTIONS: Record<VisibilityLevel, string> = {
  private: 'Seul vous pouvez voir cette note',
  'link-private': 'Accessible via le lien, non indexé sur le web',
  'link-public': 'Accessible via le lien et indexé sur le web',
  limited: 'Utilisateurs choisis peuvent voir',
  scrivia: 'Tous les utilisateurs connectés peuvent voir'
};

export const VISIBILITY_ICONS: Record<VisibilityLevel, string> = {
  private: '🔒',
  'link-private': '🔗',
  'link-public': '🌐',
  limited: '👥',
  scrivia: '👤'
};

export const VISIBILITY_OPTIONS = [
  {
    value: 'private' as const,
    label: 'Privé',
    description: 'Seul vous pouvez voir cette note',
    icon: '🔒',
    color: 'text-gray-500'
  },
  {
    value: 'link-private' as const,
    label: 'Lien privé',
    description: 'Accessible via le lien, non indexé sur le web',
    icon: '🔗',
    color: 'text-blue-500'
  },
  {
    value: 'link-public' as const,
    label: 'Lien public',
    description: 'Accessible via le lien et indexé sur le web',
    icon: '🌐',
    color: 'text-green-500'
  },
  {
    value: 'limited' as const,
    label: 'Limité',
    description: 'Seuls les utilisateurs invités peuvent accéder',
    icon: '👥',
    color: 'text-purple-500'
  },
  {
    value: 'scrivia' as const,
    label: 'Scrivia',
    description: 'Visible par tous les utilisateurs Scrivia',
    icon: '⭐',
    color: 'text-yellow-500'
  }
];

// Fonctions utilitaires
export function getDefaultShareSettings(): ShareSettings {
  return {
    visibility: 'private',
    invited_users: [],
    allow_edit: false,
    allow_comments: false
  };
}

export function canAccessNote(
  note: { share_settings: ShareSettings; user_id: string },
  currentUserId?: string
): boolean {
  if (!note) return false;
  
  // Propriétaire peut toujours accéder
  if (currentUserId === note.user_id) return true;
  
  switch (note.share_settings.visibility) {
    case 'private':
      return false;
      
    case 'link-private':
    case 'link-public':
      return true; // Accès public via lien
      
    case 'limited':
      return note.share_settings.invited_users.includes(currentUserId || '');
      
    case 'scrivia':
      return !!currentUserId; // Utilisateur connecté
      
    default:
      return false;
  }
}

export function getSharePermissions(
  note: { share_settings: ShareSettings; user_id: string },
  currentUserId?: string
): SharePermissions {
  const isOwner = currentUserId === note.user_id;
  const canView = canAccessNote(note, currentUserId);
  
  return {
    can_view: canView,
    can_edit: isOwner || (canView && (note.share_settings.allow_edit || false)),
    can_comment: isOwner || (canView && (note.share_settings.allow_comments || false)),
    can_share: isOwner,
    can_delete: isOwner,
    is_owner: isOwner
  };
} 