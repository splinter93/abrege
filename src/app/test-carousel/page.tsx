"use client";

import React from 'react';
import NotesCarousel from '@/components/NotesCarousel';

/**
 * Page de test pour le carrousel de notes
 */
export default function TestCarouselPage() {
  return (
    <div style={{ 
      padding: '2rem', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>
        Test du Carrousel de Notes
      </h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <NotesCarousel 
          limit={6}
          showNavigation={true}
          autoPlay={true}
          autoPlayInterval={4000}
        />
      </div>
    </div>
  );
}
