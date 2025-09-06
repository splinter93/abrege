'use client';

import React from 'react';

interface ErrorPageActionsProps {
  showBackButton?: boolean;
}

export default function ErrorPageActions({ showBackButton = true }: ErrorPageActionsProps) {
  const handleBackClick = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="not-found-actions">
      <a href="/" className="not-found-button primary">
        Retour à l'accueil
      </a>
      {showBackButton && (
        <button 
          onClick={handleBackClick} 
          className="not-found-button secondary"
        >
          Page précédente
        </button>
      )}
    </div>
  );
}
