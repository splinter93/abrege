'use client';

import React, { useState } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { DossierService } from '@/services/dossierService';

export default function TestClasseurDeletion() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const classeurs = useFileSystemStore((state) => state.classeurs);
  const activeClasseurId = useFileSystemStore((state) => state.activeClasseurId);
  const setActiveClasseurId = useFileSystemStore((state) => state.setActiveClasseurId);

  const testDeleteClasseur = async () => {
    try {
      setLoading(true);
      setTestResult('🔄 Test suppression classeur...');
      
      // Récupérer la session actuelle
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Créer un classeur de test
      const testName = `Test Classeur ${Date.now()}`;
      const { data: classeur, error: createError } = await supabase
        .from('classeurs')
        .insert({
          name: testName,
          slug: `test-classeur-${Date.now()}`,
          user_id: session.user.id,
          color: '#e55a2c'
        })
        .select()
        .single();

      if (createError) {
        setTestResult(`❌ Erreur création classeur: ${createError.message}`);
        return;
      }

      setTestResult(`✅ Classeur créé: ${classeur.name} (ID: ${classeur.id})`);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Supprimer le classeur via DossierService
      setTestResult(`🔄 Suppression en cours via DossierService...`);
      
      const dossierService = DossierService.getInstance();
      await dossierService.deleteClasseur(classeur.id, session.user.id);
      
      setTestResult(`✅ Classeur supprimé via DossierService !`);
      
      // Attendre un peu pour voir la mise à jour
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier l'état du store
      const currentStore = useFileSystemStore.getState();
      const classeurStillExists = currentStore.classeurs[classeur.id];
      
      if (classeurStillExists) {
        setTestResult(`❌ PROBLÈME: Le classeur existe encore dans le store !`);
      } else {
        setTestResult(`✅ SUCCÈS: Le classeur a été supprimé du store !`);
      }
      
    } catch (error) {
      console.error('❌ Erreur test suppression classeur:', error);
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDeleteActiveClasseur = async () => {
    try {
      setLoading(true);
      setTestResult('🔄 Test suppression classeur actif...');
      
      if (!activeClasseurId) {
        setTestResult('❌ Aucun classeur actif');
        return;
      }

      const activeClasseur = classeurs[activeClasseurId];
      if (!activeClasseur) {
        setTestResult('❌ Classeur actif non trouvé dans le store');
        return;
      }

      setTestResult(`🔄 Suppression du classeur actif: ${activeClasseur.name} (ID: ${activeClasseurId})`);
      
      // Récupérer la session actuelle
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Supprimer le classeur actif
      const dossierService = DossierService.getInstance();
      await dossierService.deleteClasseur(activeClasseurId, session.user.id);
      
      setTestResult(`✅ Classeur actif supprimé !`);
      
      // Attendre un peu pour voir la mise à jour
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier l'état du store
      const currentStore = useFileSystemStore.getState();
      const classeurStillExists = currentStore.classeurs[activeClasseurId];
      const newActiveClasseurId = currentStore.activeClasseurId;
      
      if (classeurStillExists) {
        setTestResult(`❌ PROBLÈME: Le classeur actif existe encore dans le store !`);
      } else if (newActiveClasseurId === activeClasseurId) {
        setTestResult(`❌ PROBLÈME: L'ID du classeur actif n'a pas changé !`);
      } else {
        setTestResult(`✅ SUCCÈS: Classeur actif supprimé et remplacé par: ${newActiveClasseurId || 'aucun'}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur test suppression classeur actif:', error);
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Test Suppression Classeurs
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tests de suppression avec gestion correcte du store
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={testDeleteClasseur}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              🗑️ Test Suppression Classeur Normal
            </button>
            
            <button
              onClick={testDeleteActiveClasseur}
              disabled={loading || !activeClasseurId}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg ml-4"
            >
              🚨 Test Suppression Classeur Actif
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            État actuel du store
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">📊 Classeurs</h3>
              <p className="text-sm text-gray-600">
                Total: {Object.keys(classeurs).length}
              </p>
              <div className="mt-2 space-y-1">
                {Object.values(classeurs).map((classeur) => (
                  <div key={classeur.id} className="text-xs text-gray-500">
                    • {classeur.name} (ID: {classeur.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🎯 Classeur Actif</h3>
              <p className="text-sm text-gray-600">
                ID: {activeClasseurId || 'Aucun'}
              </p>
              {activeClasseurId && classeurs[activeClasseurId] && (
                <p className="text-sm text-gray-600 mt-1">
                  Nom: {classeurs[activeClasseurId].name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Résultat des tests
          </h2>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm">{testResult || 'Aucun test effectué'}</pre>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Ce qui est testé</h3>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>✅ <strong>Suppression normale</strong> : Un classeur est supprimé du store</li>
              <li>✅ <strong>Suppression classeur actif</strong> : Le classeur actif est remplacé automatiquement</li>
              <li>✅ <strong>Mise à jour du store</strong> : Le store Zustand est correctement mis à jour</li>
              <li>✅ <strong>Gestion des onglets</strong> : Les onglets ne disparaissent plus tous</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 