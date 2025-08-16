'use client';

import React from 'react';

export default function TestVisibilityDebug() {
  React.useEffect(() => {
    // Test simple pour identifier la source de l'erreur
    console.log('🔍 [DEBUG] TestVisibilityDebug monté');
    
    // Vérifier s'il y a des erreurs dans la console
    const originalError = console.error;
    console.error = (...args) => {
      console.log('🚨 [DEBUG] Erreur interceptée:', args);
      originalError.apply(console, args);
    };
    
    return () => {
      console.log('🔍 [DEBUG] TestVisibilityDebug démonté');
      console.error = originalError;
    };
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Debug Visibility</h1>
      <p>Cette page teste les erreurs de visibility</p>
      <p>Regardez la console pour les erreurs</p>
    </div>
  );
} 