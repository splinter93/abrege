"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error if needed
    if (process.env.NODE_ENV !== 'production') {
      logger.error('ErrorBoundary caught:', error);
    }
    
    // En production, on peut envoyer l'erreur à un service de monitoring
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implémenter l'envoi vers un service de monitoring
      console.error('Production error caught by ErrorBoundary:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Une erreur est survenue</h2>
            <p>Désolé, quelque chose s'est mal passé. Veuillez rafraîchir la page.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Détails techniques (développement)</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="error-reload-btn"
            >
              🔄 Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary; 