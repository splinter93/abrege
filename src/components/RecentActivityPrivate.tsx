"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RecentActivityCard from './RecentActivityCard';

interface RecentActivityPrivateProps {
  limit?: number;
  compact?: boolean;
  showHeader?: boolean;
}

export default function RecentActivityPrivate({ 
  limit = 5, 
  compact = true,
  showHeader = false 
}: RecentActivityPrivateProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    if (user?.email) {
      // Extraire le username de l'email pour l'instant
      // TODO: Récupérer le vrai username depuis le profil utilisateur
      const emailUsername = user.email.split('@')[0];
      setUsername(emailUsername);
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ 
        padding: compact ? '12px' : '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        opacity: 0.7
      }}>
        <span style={{ fontSize: compact ? '12px' : '14px' }}>
          Connectez-vous pour voir votre activité récente
        </span>
      </div>
    );
  }

  return (
    <RecentActivityCard 
      limit={limit}
      compact={compact}
      showHeader={showHeader}
      username={username}
    />
  );
} 