'use client';

import React from 'react';

export default function TestVisibilityError() {
  React.useEffect(() => {
    // Test d'accès à visibility sur différents objets
    console.log('🔍 Test des accès à visibility...');
    
    try {
      // Test 1: Objet undefined
      const obj1: any = undefined;
      console.log('Test 1 - Objet undefined:', obj1?.visibility);
    } catch (error) {
      console.error('❌ Erreur Test 1:', error);
    }
    
    try {
      // Test 2: Objet null
      const obj2: any = null;
      console.log('Test 2 - Objet null:', obj2?.visibility);
    } catch (error) {
      console.error('❌ Erreur Test 2:', error);
    }
    
    try {
      // Test 3: Objet vide
      const obj3: any = {};
      console.log('Test 3 - Objet vide:', obj3?.visibility);
    } catch (error) {
      console.error('❌ Erreur Test 3:', error);
    }
    
    try {
      // Test 4: Objet avec visibility
      const obj4: any = { visibility: 'private' };
      console.log('Test 4 - Objet avec visibility:', obj4?.visibility);
    } catch (error) {
      console.error('❌ Erreur Test 4:', error);
    }
    
    console.log('✅ Tests terminés');
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Test des erreurs de visibility</h1>
      <p>Ouvrez la console pour voir les tests...</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>🔍 Tests effectués :</h2>
        <ul>
          <li>Test 1: Accès à visibility sur objet undefined</li>
          <li>Test 2: Accès à visibility sur objet null</li>
          <li>Test 3: Accès à visibility sur objet vide</li>
          <li>Test 4: Accès à visibility sur objet valide</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>📋 Instructions :</h2>
        <ol>
          <li>Ouvrez la console du navigateur (F12)</li>
          <li>Regardez les logs des tests</li>
          <li>Identifiez quel test cause l'erreur</li>
        </ol>
      </div>
    </div>
  );
} 