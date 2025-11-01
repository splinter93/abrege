/**
 * ErrorPage - Composant réutilisable pour les pages d'erreur
 * Design cohérent, centré, accessible
 */

import React from 'react';
import LogoHeader from './LogoHeader';
import ErrorPageActions from './ErrorPageActions';

interface ErrorPageProps {
  title: string;
  description: string;
  subtitle?: string;
  icon?: 'document' | 'lock' | 'warning' | 'network';
  showActions?: boolean;
  showBackButton?: boolean; // Afficher le bouton "Page précédente"
}

const ErrorPage: React.FC<ErrorPageProps> = ({ 
  title, 
  description, 
  subtitle, 
  icon = 'document',
  showActions = true,
  showBackButton = false
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'lock':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Panneau octogonal stop */}
            <path 
              d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* Barre horizontale */}
            <line 
              x1="8" 
              y1="12" 
              x2="16" 
              y2="12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        );
      
      case 'warning':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      
      case 'network':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      
      case 'document':
      default:
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M14 2V8H20" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M16 13H8" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M16 17H8" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M10 9H8" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-logo">
          <LogoHeader size="medium" position="center" />
        </div>
        
        <div className="not-found-icon">
          {getIcon()}
        </div>
        
        <h1 className="not-found-title">{title}</h1>
        <p className="not-found-description">{description}</p>
        {subtitle && <p className="not-found-subtitle">{subtitle}</p>}
        
        {showActions && <ErrorPageActions showBackButton={showBackButton} />}
      </div>
    </div>
  );
};

export default ErrorPage;

