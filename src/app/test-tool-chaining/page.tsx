import React from 'react';
import TestToolChaining from '@/components/test/TestToolChaining';

export default function TestToolChainingPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🧪 Test d'Enchaînement d'Actions</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-blue-800">🎯 Objectif du Test</h2>
        <p className="text-blue-700">
          Ce test vérifie que le système anti-boucle permet maintenant l'enchaînement d'actions logiques 
          sans être trop restrictif. Le LLM doit pouvoir enchaîner plusieurs actions dans le même contexte.
        </p>
      </div>
      
      <TestToolChaining />
      
      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold mb-2 text-green-800">✅ Corrections Apportées</h3>
        <ul className="text-green-700 space-y-1">
          <li>• TTL anti-boucle augmenté de 5s à 30s</li>
          <li>• Signatures plus intelligentes (ignore les champs volatiles)</li>
          <li>• Système de contexte de session (2 minutes, max 10 tools)</li>
          <li>• Logique anti-boucle intelligente avec vérification de contexte</li>
        </ul>
      </div>
    </div>
  );
} 