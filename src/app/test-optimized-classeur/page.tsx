"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { optimizedClasseurService } from '@/services/optimizedClasseurService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { simpleLogger as logger } from '@/utils/logger';

export default function TestOptimizedClasseur() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  const classeursStore = useFileSystemStore((state) => state.classeurs);
  const foldersStore = useFileSystemStore((state) => state.folders);
  const notesStore = useFileSystemStore((state) => state.notes);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runDiagnosticTest = async () => {
    if (!user?.id) {
      addTestResult('❌ Aucun utilisateur connecté');
      return;
    }

    setIsTesting(true);
    setTestResults([]);

    try {
      addTestResult('🧪 Début du diagnostic du système optimisé des classeurs');
      addTestResult(`👤 Utilisateur: ${user.id.substring(0, 8)}...`);

      // Test 1: Vérification de l'état initial du store
      addTestResult('🧪 Test 1: État initial du store Zustand');
      addTestResult(`📊 Store initial: ${Object.keys(classeursStore).length} classeurs, ${Object.keys(foldersStore).length} dossiers, ${Object.keys(notesStore).length} notes`);

      // Test 2: Appel du service optimisé
      addTestResult('🧪 Test 2: Appel du service optimisé des classeurs');
      const startTime = Date.now();
      
      try {
        const result = await optimizedClasseurService.loadClasseursWithContentOptimized(user.id);
        const duration = Date.now() - startTime;
        
        addTestResult(`✅ Service optimisé: ${result.length} classeurs chargés en ${duration}ms`);
        addTestResult(`📊 Résultat détaillé: ${JSON.stringify(result.map(c => ({ id: c.id, name: c.name, dossiers: c.dossiers.length, notes: c.notes.length })))}`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        addTestResult(`❌ Service optimisé échoué en ${duration}ms: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        if (error instanceof Error && error.stack) {
          addTestResult(`📚 Stack trace: ${error.stack.substring(0, 200)}...`);
        }
      }

      // Test 3: Vérification du store après l'appel
      addTestResult('🧪 Test 3: État du store après appel du service');
      addTestResult(`📊 Store après appel: ${Object.keys(classeursStore).length} classeurs, ${Object.keys(foldersStore).length} dossiers, ${Object.keys(notesStore).length} notes`);
      
      if (Object.keys(classeursStore).length > 0) {
        addTestResult(`🎯 Classeurs dans le store: ${Object.keys(classeursStore).join(', ')}`);
      } else {
        addTestResult('⚠️ PROBLÈME: Le store est vide après l\'appel du service');
      }

      // Test 4: Vérification des données dans le store
      addTestResult('🧪 Test 4: Vérification des données dans le store');
      Object.entries(classeursStore).forEach(([id, classeur]) => {
        addTestResult(`📚 Classeur ${id}: ${classeur.name} (emoji: ${classeur.emoji || 'aucun'})`);
      });

      // Test 5: Test de cache
      addTestResult('🧪 Test 5: Test du cache');
      const cacheStart = Date.now();
      try {
        const cachedResult = await optimizedClasseurService.loadClasseursWithContentOptimized(user.id);
        const cacheDuration = Date.now() - cacheStart;
        addTestResult(`✅ Cache test: ${cachedResult.length} classeurs récupérés en ${cacheDuration}ms (devrait être plus rapide)`);
      } catch (error) {
        addTestResult(`❌ Cache test échoué: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      addTestResult('🎯 Diagnostic terminé');

    } catch (error) {
      addTestResult(`💥 Erreur critique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const invalidateCache = () => {
    if (user?.id) {
      optimizedClasseurService.invalidateCache(user.id);
      addTestResult('🗑️ Cache invalidé');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test du Système Optimisé des Classeurs</h1>
      
      <div className="mb-6 space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">État actuel:</h2>
          <p>👤 Utilisateur: {user ? `${user.id.substring(0, 8)}...` : 'Non connecté'}</p>
          <p>📊 Store: {Object.keys(classeursStore).length} classeurs, {Object.keys(foldersStore).length} dossiers, {Object.keys(notesStore).length} notes</p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={runDiagnosticTest}
            disabled={isTesting || !user}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            {isTesting ? '🧪 Test en cours...' : '🧪 Lancer le diagnostic'}
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            🗑️ Effacer les résultats
          </button>
          
          <button
            onClick={invalidateCache}
            disabled={!user}
            className="px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300"
          >
            🗑️ Invalider le cache
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
          <h3 className="text-white font-semibold mb-2">Résultats du diagnostic:</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="whitespace-pre-wrap">{result}</div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(classeursStore).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">📚 Classeurs dans le store:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(classeursStore).map(([id, classeur]) => (
              <div key={id} className="border p-4 rounded">
                <h3 className="font-semibold">{classeur.emoji || '📚'} {classeur.name}</h3>
                <p className="text-sm text-gray-600">ID: {id}</p>
                <p className="text-sm text-gray-600">Position: {classeur.position || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 