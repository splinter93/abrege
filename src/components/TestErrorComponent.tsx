"use client";

import { useState } from 'react';

interface TestErrorComponentProps {
  shouldThrow?: boolean;
}

/**
 * Composant de test pour vérifier l'ErrorBoundary
 * Utilisé uniquement en développement pour tester la gestion d'erreur
 */
export default function TestErrorComponent({ shouldThrow = false }: TestErrorComponentProps) {
  const [count, setCount] = useState(0);

  if (shouldThrow) {
    throw new Error('Erreur de test pour vérifier l\'ErrorBoundary');
  }

  return (
    <div className="test-error-component">
      <h3>Composant de test ErrorBoundary</h3>
      <p>Compteur: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrémenter
      </button>
      <button onClick={() => setCount(count - 1)}>
        Décrémenter
      </button>
    </div>
  );
} 