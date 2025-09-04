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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (user?.email) {
      // Extraire le username de l'email (solution temporaire)
      const emailUsername = user.email.split('@')[0];
      setUsername(emailUsername);
    }
  }, [user]);

  // Fallback en cas d'erreur - Affichage élégant pour le dashboard
  if (hasError) {
    return (
      <div className="dashboard-activity-fallback">
        <div className="fallback-header">
          <h3>Activité Récente</h3>
          <span className="fallback-badge">Mode démo</span>
        </div>
        
        <div className="fallback-content">
          <div className="fallback-item">
            <div className="fallback-icon">
              <div className="icon-placeholder"></div>
            </div>
            <div className="fallback-text">
              <div className="fallback-title">Bienvenue sur Scrivia !</div>
              <div className="fallback-meta">Commencez par créer votre première note</div>
            </div>
          </div>
          
          <div className="fallback-item">
            <div className="fallback-icon">
              <div className="icon-placeholder"></div>
            </div>
            <div className="fallback-text">
              <div className="fallback-title">Organisez vos idées</div>
              <div className="fallback-meta">Créez des classeurs et des notes</div>
            </div>
          </div>
          
          <div className="fallback-item">
            <div className="fallback-icon">
              <div className="icon-placeholder"></div>
            </div>
            <div className="fallback-text">
              <div className="fallback-title">Partagez en équipe</div>
              <div className="fallback-meta">Collaborez avec vos collègues</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-activity-fallback">
        <div className="fallback-header">
          <h3>Activité Récente</h3>
        </div>
        
        <div className="fallback-content">
          <div className="fallback-item">
            <div className="fallback-icon">
              <div className="icon-placeholder"></div>
            </div>
            <div className="fallback-text">
              <div className="fallback-title">Connectez-vous</div>
              <div className="fallback-meta">Pour voir votre activité récente</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RecentActivityCard 
      limit={limit}
      compact={compact}
      showHeader={showHeader}
      username={username}
      onError={() => setHasError(true)}
    />
  );
} 