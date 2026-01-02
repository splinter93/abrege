/**
 * EditorErrorBoundary - Error boundary dédié pour l'éditeur
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Error boundaries React dédiés
 * 
 * Responsabilités:
 * - Catch erreurs React (componentDidCatch)
 * - Fallback UI gracieux (message utilisateur)
 * - Logger structuré avec stack trace
 * - Recovery automatique (bouton "Réessayer")
 */

import React, { Component, type ReactNode } from 'react';
import { logger, LogCategory } from '@/utils/logger';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  /** Callback appelé quand une erreur est capturée */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Message personnalisé à afficher */
  fallbackMessage?: string;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary dédié pour l'éditeur
 * Capture les erreurs React et affiche un fallback gracieux
 */
export class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Catch erreurs React (componentDidCatch)
   * Conforme GUIDE-EXCELLENCE-CODE.md: Logger structuré avec stack trace
   */
  static getDerivedStateFromError(error: Error): Partial<EditorErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Logger l'erreur avec contexte structuré
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Logger structuré avec stack trace
    logger.error(LogCategory.EDITOR, '[EditorErrorBoundary] Error caught', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: {
        timestamp: Date.now(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      },
    });

    // Appeler le callback si fourni
    this.props.onError?.(error, errorInfo);

    // Mettre à jour l'état avec les détails de l'erreur
    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * Recovery automatique (réinitialiser l'état)
   */
  handleReset = (): void => {
    logger.info(LogCategory.EDITOR, '[EditorErrorBoundary] Recovery attempted');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Fallback UI gracieux
   */
  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackMessage } = this.props;
      const { error } = this.state;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '2rem',
            textAlign: 'center',
            color: '#666',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              padding: '2rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
            }}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#333',
              }}
            >
              {fallbackMessage || "Une erreur s'est produite dans l'éditeur"}
            </h2>
            
            <p
              style={{
                fontSize: '1rem',
                marginBottom: '1.5rem',
                color: '#666',
              }}
            >
              L'éditeur a rencontré une erreur inattendue. Vous pouvez réessayer ou recharger la page.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                  textAlign: 'left',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                  }}
                >
                  Détails de l'erreur (dev uniquement)
                </summary>
                <pre
                  style={{
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#fff',
                  backgroundColor: '#0070f3',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0051cc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0070f3';
                }}
              >
                Réessayer
              </button>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#333',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #d0d0d0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
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

/**
 * Hook pour wrapper un composant avec EditorErrorBoundary
 */
export function withEditorErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage?: string
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <EditorErrorBoundary fallbackMessage={fallbackMessage}>
        <Component {...props} />
      </EditorErrorBoundary>
    );
  };
}



