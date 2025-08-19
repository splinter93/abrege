"use client";

import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import AuthGuard from './AuthGuard';
import { useSecureErrorHandler } from './SecureErrorHandler';
import { useAuth } from '@/hooks/useAuth';
import './SecurityTestSuite.css';

/**
 * Suite de tests pour valider les composants de sécurité
 * Utilisé uniquement en développement pour vérifier le bon fonctionnement
 */
export default function SecurityTestSuite() {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const { user } = useAuth();
  const { handleError, handleAsyncError } = useSecureErrorHandler({
    context: 'SecurityTestSuite',
    operation: 'test_securite',
    userId: user?.id
  });

  // Test 1: ErrorBoundary
  const TestErrorComponent = () => {
    const [shouldThrow, setShouldThrow] = useState(false);
    
    if (shouldThrow) {
      throw new Error('Test d\'erreur pour ErrorBoundary');
    }
    
    return (
      <div className="test-component">
        <h3>Test ErrorBoundary</h3>
        <p>Ce composant peut générer une erreur pour tester l'ErrorBoundary</p>
        <button 
          onClick={() => setShouldThrow(true)}
          className="test-button danger"
        >
          Générer une erreur
        </button>
      </div>
    );
  };

  // Test 2: SecureErrorHandler
  const TestErrorHandler = () => {
    const testSyncError = () => {
      handleError(new Error('Erreur synchrone de test'), 'test_synchrone');
    };

    const testAsyncError = async () => {
      const result = await handleAsyncError(
        async () => {
          throw new Error('Erreur asynchrone de test');
        },
        'test_asynchrone'
      );
      console.log('Résultat après erreur:', result); // Devrait être null
    };

    return (
      <div className="test-component">
        <h3>Test SecureErrorHandler</h3>
        <p>Test des fonctions de gestion d'erreur sécurisées</p>
        <div className="test-buttons">
          <button onClick={testSyncError} className="test-button">
            Test erreur synchrone
          </button>
          <button onClick={testAsyncError} className="test-button">
            Test erreur asynchrone
          </button>
        </div>
      </div>
    );
  };

  // Test 3: AuthGuard
  const TestAuthGuard = () => {
    return (
      <div className="test-component">
        <h3>Test AuthGuard</h3>
        <p>Utilisateur actuel: {user ? user.email : 'Non connecté'}</p>
        <p>ID utilisateur: {user?.id || 'N/A'}</p>
      </div>
    );
  };

  const runTest = (testName: string) => {
    setActiveTest(testName);
  };

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="security-test-suite production">
        <h2>🔒 Suite de tests de sécurité</h2>
        <p>Les tests de sécurité ne sont disponibles qu'en développement.</p>
      </div>
    );
  }

  return (
    <div className="security-test-suite">
      <h2>🧪 Suite de tests de sécurité</h2>
      <p>Tests pour valider le bon fonctionnement des composants de sécurité</p>
      
      <div className="test-navigation">
        <button 
          onClick={() => runTest('error-boundary')}
          className={`test-nav-button ${activeTest === 'error-boundary' ? 'active' : ''}`}
        >
          🚨 ErrorBoundary
        </button>
        <button 
          onClick={() => runTest('error-handler')}
          className={`test-nav-button ${activeTest === 'error-handler' ? 'active' : ''}`}
        >
          🛡️ SecureErrorHandler
        </button>
        <button 
          onClick={() => runTest('auth-guard')}
          className={`test-nav-button ${activeTest === 'auth-guard' ? 'active' : ''}`}
        >
          🔐 AuthGuard
        </button>
      </div>

      <div className="test-content">
        {activeTest === 'error-boundary' && (
          <ErrorBoundary>
            <TestErrorComponent />
          </ErrorBoundary>
        )}
        
        {activeTest === 'error-handler' && <TestErrorHandler />}
        
        {activeTest === 'auth-guard' && (
          <AuthGuard>
            <TestAuthGuard />
          </AuthGuard>
        )}
        
        {!activeTest && (
          <div className="test-placeholder">
            <p>👆 Sélectionnez un test ci-dessus pour commencer</p>
          </div>
        )}
      </div>

      <div className="test-info">
        <h4>📋 Informations sur les tests</h4>
        <ul>
          <li><strong>ErrorBoundary :</strong> Capture et affiche les erreurs React</li>
          <li><strong>SecureErrorHandler :</strong> Gère les erreurs de manière sécurisée</li>
          <li><strong>AuthGuard :</strong> Protège les routes authentifiées</li>
        </ul>
        <p><em>Ces tests ne sont disponibles qu'en mode développement.</em></p>
      </div>
    </div>
  );
} 