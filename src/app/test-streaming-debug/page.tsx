'use client';

import React, { useState } from 'react';
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';
import StreamingLineByLine from '@/components/chat/StreamingLineByLine';

export default function TestStreamingDebugPage() {
  const { preferences, toggleStreaming, setLineDelay, toggleAutoAdjust } = useStreamingPreferences();
  const [testContent] = useState(`# Test du Streaming Ligne par Ligne

Ceci est un test pour vérifier que le streaming fonctionne correctement.

## Première section

- Point 1 : Test du streaming
- Point 2 : Vérification des délais
- Point 3 : Animation des lignes

## Deuxième section

Le streaming devrait afficher chaque ligne avec un délai configurable.

### Sous-section

**Texte en gras** et *texte en italique* pour tester le markdown.

---

*Fin du test*`);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🐛 Debug du Streaming
          </h1>
          <p className="text-lg text-gray-600">
            Test et debug du composant StreamingLineByLine
          </p>
        </div>

        {/* Contrôles de streaming */}
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ⚙️ Contrôles de Streaming
          </h2>
          
          <div className="space-y-4">
            {/* Toggle Streaming */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Mode streaming :</span>
              <button
                onClick={toggleStreaming}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  preferences.enabled 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {preferences.enabled ? '⚡ Activé' : '⏸️ Désactivé'}
              </button>
            </div>

            {/* Vitesse */}
            {preferences.enabled && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Vitesse d'affichage : {preferences.lineDelay}ms
                </label>
                <input
                  type="range"
                  min="200"
                  max="1500"
                  step="100"
                  value={preferences.lineDelay}
                  onChange={(e) => setLineDelay(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Rapide (200ms)</span>
                  <span>Lent (1500ms)</span>
                </div>
              </div>
            )}

            {/* Ajustement automatique */}
            {preferences.enabled && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Ajustement automatique :</span>
                <button
                  onClick={toggleAutoAdjust}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    preferences.autoAdjust 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {preferences.autoAdjust ? '🎯 Activé' : '🎯 Désactivé'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Test du streaming */}
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🧪 Test du Streaming
          </h2>
          
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>État actuel :</strong> {preferences.enabled ? 'Streaming activé' : 'Streaming désactivé'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Délai configuré :</strong> {preferences.lineDelay}ms
            </p>
            <p className="text-sm text-gray-600">
              <strong>Ajustement automatique :</strong> {preferences.autoAdjust ? 'Activé' : 'Désactivé'}
            </p>
          </div>

          {preferences.enabled ? (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-medium text-blue-900 mb-2">✅ Streaming Activé</h3>
              <p className="text-sm text-blue-700">
                Le contenu ci-dessous devrait apparaître ligne par ligne avec un délai de {preferences.lineDelay}ms
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-2">⏸️ Streaming Désactivé</h3>
              <p className="text-sm text-gray-700">
                Activez le streaming pour voir l'effet ligne par ligne
              </p>
            </div>
          )}
        </div>

        {/* Affichage du contenu */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📝 Contenu en Streaming
          </h2>
          
          {preferences.enabled ? (
            <StreamingLineByLine
              content={testContent}
              lineDelay={preferences.lineDelay}
              onComplete={() => console.log('Streaming terminé !')}
              className="prose max-w-none"
            />
          ) : (
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: testContent.replace(/\n/g, '<br>') }} />
            </div>
          )}
        </div>

        {/* Debug info */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔍 Informations de Debug
          </h2>
          
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Hook chargé :</strong> ✅ useStreamingPreferences</p>
            <p><strong>Composant StreamingLineByLine :</strong> ✅ Importé</p>
            <p><strong>Préférences :</strong> {JSON.stringify(preferences, null, 2)}</p>
            <p><strong>Contenu de test :</strong> {testContent.length} caractères, {testContent.split('\n').length} lignes</p>
          </div>
        </div>
      </div>
    </div>
  );
} 