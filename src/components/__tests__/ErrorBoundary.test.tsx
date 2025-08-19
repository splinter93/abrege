import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import TestErrorComponent from '../TestErrorComponent';

// Mock du logger
jest.mock('@/utils/logger', () => ({
  simpleLogger: {
    error: jest.fn()
  }
}));

// Mock de process.env
const mockProcessEnv = (env: string) => {
  const originalEnv = process.env.NODE_ENV;
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true
  });
  return () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  };
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Supprimer les erreurs de console pour les tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devrait afficher les enfants normalement quand il n\'y a pas d\'erreur', () => {
    render(
      <ErrorBoundary>
        <div>Contenu normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Contenu normal')).toBeInTheDocument();
  });

  it('devrait afficher l\'interface d\'erreur quand une erreur est lancée', () => {
    render(
      <ErrorBoundary>
        <TestErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByText('Désolé, quelque chose s\'est mal passé. Veuillez rafraîchir la page.')).toBeInTheDocument();
    expect(screen.getByText('🔄 Rafraîchir la page')).toBeInTheDocument();
  });

  it('devrait afficher les détails techniques en développement', () => {
    const restoreEnv = mockProcessEnv('development');

    render(
      <ErrorBoundary>
        <TestErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Détails techniques (développement)')).toBeInTheDocument();

    restoreEnv();
  });

  it('ne devrait pas afficher les détails techniques en production', () => {
    const restoreEnv = mockProcessEnv('production');

    render(
      <ErrorBoundary>
        <TestErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Détails techniques (développement)')).not.toBeInTheDocument();

    restoreEnv();
  });
}); 