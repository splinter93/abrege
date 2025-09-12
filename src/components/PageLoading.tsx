"use client";

import React from 'react';
import './PageLoading.css';

interface PageLoadingProps {
  message?: string;
  theme?: 'dossiers' | 'files' | 'trash' | 'default';
  className?: string;
}

/**
 * Composant de chargement ultra-simple
 * Juste une roue et "Chargement" centré, sans encadré
 */
const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Chargement',
  theme = 'default',
  className = ''
}) => {
  return (
    <div className={`page-loading page-loading-${theme} ${className}`}>
      <div className="page-loading-content">
        {/* Roue de chargement simple */}
        <div className="page-loading-spinner" />
        
        {/* Message "Chargement" simple */}
        <p className="page-loading-message">
          {message}
        </p>
      </div>
    </div>
  );
};

export default PageLoading; 