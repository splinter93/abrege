"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary spécifique pour la page des dossiers
 * Gère les erreurs de manière professionnelle avec logging et fallback
 */
export class DossierErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Mettre à jour l'état pour afficher le fallback
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log de l'erreur avec simpleLogger
    logger.error('[DossierErrorBoundary] ❌ Erreur capturée', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Mettre à jour l'état avec les informations d'erreur
    this.setState({
      error,
      errorInfo
    });

    // Appeler le callback personnalisé si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    logger.dev('[DossierErrorBoundary] 🔄 Tentative de récupération');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (error) {
      // Ici on pourrait envoyer l&apos;erreur à un service de monitoring
      logger.error('[DossierErrorBoundary] 📊 Rapport d&apos;erreur envoyé:', {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        componentStack: errorInfo?.componentStack?.substring(0, 500)
      });
      
      // Simuler l&apos;envoi du rapport
      alert('Rapport d&apos;erreur envoyé. Merci de votre patience.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback personnalisé ou fallback par défaut
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback par défaut professionnel
      return (
        <div className="dossier-error-boundary">
          <div className="error-container">
            <div className="error-icon" aria-hidden>—</div>
            <h1 className="error-title">Erreur inattendue</h1>
            <p className="error-message">
              Une erreur s&apos;est produite lors du chargement de la page des dossiers.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Détails techniques (développement)</summary>
                <div className="error-stack">
                  <strong>Message:</strong> {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      <br />
                      <strong>Stack:</strong>
                      <pre>{this.state.error.stack}</pre>
                    </>
                  )}
                  {this.state.errorInfo && (
                    <>
                      <br />
                      <strong>Component Stack:</strong>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
            
            <div className="error-actions">
              <button
                type="button"
                className="error-btn primary"
                onClick={this.handleRetry}
              >
                Réessayer
              </button>
              <button
                type="button"
                className="error-btn secondary"
                onClick={this.handleReportError}
              >
                Signaler l&apos;erreur
              </button>
              <button
                type="button"
                className="error-btn warning"
                onClick={() => window.location.reload()}
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DossierErrorBoundary; 