"use client";

import React, { useState } from 'react';
import PageLoading from './PageLoading';

/**
 * Composant de test pour la page de chargement ultra-simple
 */
const LoadingTest: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);

  const handleShowLoading = () => {
    setShowLoading(true);
    // Simuler un chargement de 3 secondes
    setTimeout(() => setShowLoading(false), 3000);
  };

  if (showLoading) {
    return <PageLoading message="Chargement" theme="default" />;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>Test de la Page de Chargement</h1>
      <p>Cliquez sur le bouton pour voir la page de chargement ultra-simple</p>
      <button 
        onClick={handleShowLoading}
        style={{
          background: '#e55a2c',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          marginTop: '20px'
        }}
      >
        Afficher le Chargement
      </button>
    </div>
  );
};

export default LoadingTest;
