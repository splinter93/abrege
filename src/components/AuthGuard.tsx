"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

import { simpleLogger as logger } from '@/utils/logger';
import './PageLoading.css';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Composant de protection d'authentification
 * Redirige vers la page de login si l'utilisateur n'est pas authentifié
 */
export default function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  


  useEffect(() => {
    if (!loading && !user) {
      logger.warn('AuthGuard: Utilisateur non authentifié, redirection vers login');
      setIsRedirecting(true);
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Afficher le fallback pendant le chargement ou la redirection
  if (loading || isRedirecting) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="page-loading">
        <div className="page-loading-content">
          <div className="page-loading-spinner"></div>
          <p className="page-loading-message">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas authentifié, ne rien afficher (redirection en cours)
  if (!user) {
    return null;
  }

  // Utilisateur authentifié, afficher le contenu
  return <>{children}</>;
} 