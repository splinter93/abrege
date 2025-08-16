/**
 * Composant utilitaire pour accéder en toute sécurité à la propriété visibility
 * Évite les erreurs "Cannot read properties of undefined (reading 'visibility')"
 */

import React from 'react';

/**
 * Hook personnalisé pour accéder en toute sécurité à la propriété visibility
 * @param obj - L'objet à vérifier
 * @param defaultValue - Valeur par défaut si l'objet ou visibility est undefined
 * @returns La valeur de visibility ou la valeur par défaut
 */
export function useSafeVisibility<T extends { visibility?: any }>(
  obj: T | undefined | null,
  defaultValue: any = 'private'
): any {
  return React.useMemo(() => {
    if (!obj) return defaultValue;
    if (typeof obj !== 'object') return defaultValue;
    if (!('visibility' in obj)) return defaultValue;
    return obj.visibility ?? defaultValue;
  }, [obj, defaultValue]);
}

/**
 * Fonction utilitaire pour accéder en toute sécurité à la propriété visibility
 * @param obj - L'objet à vérifier
 * @param defaultValue - Valeur par défaut si l'objet ou visibility est undefined
 * @returns La valeur de visibility ou la valeur par défaut
 */
export function getSafeVisibility<T extends { visibility?: any }>(
  obj: T | undefined | null,
  defaultValue: any = 'private'
): any {
  if (!obj) return defaultValue;
  if (typeof obj !== 'object') return defaultValue;
  if (!('visibility' in obj)) return defaultValue;
  return obj.visibility ?? defaultValue;
}

/**
 * Composant de test pour vérifier l'accès sécurisé à visibility
 */
export function SafeVisibilityTest() {
  const testObjects = [
    undefined,
    null,
    {},
    { visibility: 'public' },
    { visibility: 'private' },
    { visibility: null },
    { visibility: undefined }
  ];

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}>
      <h3>🧪 Test d'accès sécurisé à visibility</h3>
      {testObjects.map((obj, index) => (
        <div key={index} style={{ margin: '0.5rem 0' }}>
          <strong>Objet {index}:</strong> {JSON.stringify(obj)} → 
          <strong>Visibility:</strong> {getSafeVisibility(obj, 'DEFAULT')}
        </div>
      ))}
    </div>
  );
}

export default SafeVisibilityTest; 