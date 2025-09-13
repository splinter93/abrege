import React from 'react';

/**
 * Composant de test pour vérifier le fonctionnement du renommage
 * À supprimer après les tests
 */
const FileRenameTest: React.FC = () => {
  const testErrorHandling = () => {
    // Test 1: Erreur simple
    const simpleError = new Error('Test error message');
    console.log('Test 1 - Erreur simple:', simpleError instanceof Error ? simpleError.message : String(simpleError));
    
    // Test 2: Objet d'erreur complexe
    const complexError = { message: 'Complex error', code: 500, details: { field: 'test' } };
    console.log('Test 2 - Erreur complexe:', complexError instanceof Error ? complexError.message : String(complexError));
    
    // Test 3: String d'erreur
    const stringError = 'String error';
    console.log('Test 3 - String erreur:', stringError instanceof Error ? stringError.message : String(stringError));
    
    // Test 4: null/undefined
    const nullError = null;
    console.log('Test 4 - null:', nullError instanceof Error ? nullError.message : String(nullError));
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>🧪 Test du système de renommage</h3>
      <p>Ce composant teste la gestion d'erreurs du système de renommage.</p>
      <button onClick={testErrorHandling} style={{ padding: '10px', margin: '10px 0' }}>
        Tester la gestion d'erreurs
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        Ouvrez la console pour voir les résultats des tests.
      </div>
    </div>
  );
};

export default FileRenameTest;
