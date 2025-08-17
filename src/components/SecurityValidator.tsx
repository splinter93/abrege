import React from 'react';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';

interface SecurityValidatorProps {
  note: {
    share_settings: {
      visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
      invited_users?: string[];
    };
    user_id: string;
  };
  currentUserId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Composant de validation de sécurité pour les notes
 * Utilise le hook useSecurityValidation pour une logique centralisée
 */
export default function SecurityValidator({ 
  note, 
  currentUserId, 
  children, 
  fallback 
}: SecurityValidatorProps) {
  // ✅ SÉCURITÉ : Utilisation du hook centralisé
  const { isAccessAllowed, accessLevel } = useSecurityValidation(note, currentUserId);

  // Log de sécurité pour monitoring
  React.useEffect(() => {
    if (!isAccessAllowed) {
      console.warn(`🔒 [SecurityValidator] Accès refusé à la note avec visibilité: ${note.share_settings.visibility}, niveau: ${accessLevel}`);
    }
  }, [isAccessAllowed, note.share_settings.visibility, accessLevel]);

  if (!isAccessAllowed) {
    return fallback || (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#141414', color: '#F5F5DC' }}>
        <h1>Accès non autorisé</h1>
        <p>Cette note n'est pas accessible avec votre niveau d'autorisation actuel.</p>
        <p>Niveau d'accès requis: {accessLevel === 'owner' ? 'Propriétaire' : 
          accessLevel === 'invited' ? 'Utilisateur invité' :
          accessLevel === 'scrivia' ? 'Utilisateur Scrivia connecté' :
          accessLevel === 'public' ? 'Accès public' : 'Aucun'}</p>
      </div>
    );
  }

  return <>{children}</>;
} 