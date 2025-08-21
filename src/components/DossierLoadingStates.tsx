"use client";

import React from 'react';
import './DossierLoadingStates.css';

interface LoadingStateProps {
  type: 'initial' | 'refresh' | 'creating' | 'updating' | 'deleting';
  message?: string;
  progress?: number;
}

interface ErrorStateProps {
  message: string;
  retryCount: number;
  canRetry: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  onForceReload: () => void;
}

/**
 * Composant pour afficher les états de chargement avec animations
 */
export const DossierLoadingState: React.FC<LoadingStateProps> = ({ 
  type, 
  message, 
  progress 
}) => {
  const getLoadingContent = () => {
    switch (type) {
      case 'initial':
        return {
          icon: '📚',
          title: 'Chargement des dossiers',
          description: 'Récupération de vos classeurs et dossiers...'
        };
      case 'refresh':
        return {
          icon: '🔄',
          title: 'Actualisation',
          description: 'Mise à jour des données...'
        };
      case 'creating':
        return {
          icon: '✨',
          title: 'Création en cours',
          description: message || 'Création de l\'élément...'
        };
      case 'updating':
        return {
          icon: '✏️',
          title: 'Modification en cours',
          description: message || 'Mise à jour de l\'élément...'
        };
      case 'deleting':
        return {
          icon: '🗑️',
          title: 'Suppression en cours',
          description: message || 'Suppression de l\'élément...'
        };
      default:
        return {
          icon: '⏳',
          title: 'Chargement...',
          description: 'Veuillez patienter...'
        };
    }
  };

  const content = getLoadingContent();

  return (
    <div className="dossier-loading-state">
      <div className="loading-container">
        <div className="loading-icon">{content.icon}</div>
        <h2 className="loading-title">{content.title}</h2>
        <p className="loading-description">{content.description}</p>
        
        {progress !== undefined && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Composant pour afficher les états d'erreur avec options de récupération
 */
export const DossierErrorState: React.FC<ErrorStateProps> = ({
  message,
  retryCount,
  canRetry,
  onRetry,
  onRefresh,
  onForceReload
}) => {
  return (
    <div className="dossier-error-state">
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Erreur de chargement</h2>
        <p className="error-message">{message}</p>
        
        <div className="error-actions">
          {canRetry && (
            <button 
              className="error-btn secondary" 
              onClick={onRetry}
            >
              🔄 Réessayer ({3 - retryCount} tentatives restantes)
            </button>
          )}
          
          <button 
            className="error-btn primary" 
            onClick={onRefresh}
          >
            🔄 Recharger
          </button>
          
          <button 
            className="error-btn warning" 
            onClick={onForceReload}
          >
            💥 Rechargement forcé
          </button>
        </div>
        
        <div className="error-help">
          <p>Si le problème persiste, essayez de :</p>
          <ul>
            <li>Vérifier votre connexion internet</li>
            <li>Rafraîchir la page</li>
            <li>Contacter le support si nécessaire</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Composant pour afficher un état vide (aucun contenu)
 */
export const DossierEmptyState: React.FC<{
  title: string;
  description: string;
  icon: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, icon, actionLabel, onAction }) => {
  return (
    <div className="dossier-empty-state">
      <div className="empty-container">
        <div className="empty-icon">{icon}</div>
        <h2 className="empty-title">{title}</h2>
        <p className="empty-description">{description}</p>
        
        {actionLabel && onAction && (
          <button className="empty-action-btn" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}; 