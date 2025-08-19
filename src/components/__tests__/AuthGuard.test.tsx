import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../AuthGuard';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock du hook useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock du logger
jest.mock('@/utils/logger', () => ({
  simpleLogger: {
    warn: jest.fn()
  }
}));

const mockUseAuth = require('@/hooks/useAuth').useAuth;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('AuthGuard', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    mockPush.mockClear();
  });

  it('devrait afficher les enfants quand l\'utilisateur est authentifié', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false
    });

    render(
      <AuthGuard>
        <div>Contenu protégé</div>
      </AuthGuard>
    );

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  it('devrait rediriger vers login quand l\'utilisateur n\'est pas authentifié', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <AuthGuard>
        <div>Contenu protégé</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('devrait afficher le fallback personnalisé', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <AuthGuard fallback={<div>Fallback personnalisé</div>}>
        <div>Contenu protégé</div>
      </AuthGuard>
    );

    expect(screen.getByText('Fallback personnalisé')).toBeInTheDocument();
  });

  it('devrait rediriger vers une route personnalisée', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <AuthGuard redirectTo="/auth">
        <div>Contenu protégé</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth');
    });
  });

  it('devrait afficher le loading pendant la vérification', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <AuthGuard>
        <div>Contenu protégé</div>
      </AuthGuard>
    );

    expect(screen.getByText('Vérification de l\'authentification...')).toBeInTheDocument();
  });
}); 