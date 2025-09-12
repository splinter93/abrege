"use client";

import React, { useState } from 'react';
import NotesCarousel from './NotesCarousel';

/**
 * Composant de test pour le carrousel de notes
 */
const CarouselTest: React.FC = () => {
  const [showCarousel, setShowCarousel] = useState(false);

  const handleShowCarousel = () => {
    setShowCarousel(true);
    // Simuler un chargement de 5 secondes
    setTimeout(() => setShowCarousel(false), 5000);
  };

  if (showCarousel) {
    return (
      <div style={{ 
        padding: '2rem', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        minHeight: '100vh',
        color: 'white'
      }}>
        <h1>Test du Carrousel de Notes</h1>
        <p>Voici le carrousel de notes récentes avec navigation et autoplay</p>
        
        <NotesCarousel 
          limit={6}
          showNavigation={true}
          autoPlay={true}
          autoPlayInterval={3000}
        />
        
        <button 
          onClick={() => setShowCarousel(false)}
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
          Fermer le Test
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>Test du Carrousel de Notes</h1>
      <p>Cliquez sur le bouton pour voir le carrousel de notes récentes</p>
      <button 
        onClick={handleShowCarousel}
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
        Afficher le Carrousel
      </button>
    </div>
  );
};

export default CarouselTest;
