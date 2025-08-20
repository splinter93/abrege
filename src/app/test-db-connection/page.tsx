"use client";

import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export default function TestDbConnection() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testDatabaseConnection = async () => {
    if (!user?.id) {
      addTestResult('❌ Aucun utilisateur connecté');
      return;
    }

    setIsTesting(true);
    setTestResults([]);

    try {
      addTestResult('🧪 Début du test de connexion à la base de données');
      addTestResult(`👤 Utilisateur: ${user.id.substring(0, 8)}...`);

      // Test 1: Vérifier la table classeurs
      addTestResult('🧪 Test 1: Vérification de la table classeurs');
      try {
        const { data: classeurs, error } = await supabase
          .from('classeurs')
          .select('id, name, emoji, position')
          .eq('user_id', user.id)
          .limit(5);

        if (error) {
          addTestResult(`❌ Erreur table classeurs: ${error.message}`);
        } else {
          addTestResult(`✅ Table classeurs: ${classeurs?.length || 0} classeurs trouvés`);
          if (classeurs && classeurs.length > 0) {
            classeurs.forEach(c => {
              addTestResult(`   📚 ${c.emoji || '📚'} ${c.name} (ID: ${c.id.substring(0, 8)}...)`);
            });
          }
        }
      } catch (error) {
        addTestResult(`❌ Erreur lors du test classeurs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 2: Vérifier la table folders
      addTestResult('🧪 Test 2: Vérification de la table folders');
      try {
        const { data: folders, error } = await supabase
          .from('folders')
          .select('id, name, classeur_id, notebook_id')
          .limit(5);

        if (error) {
          addTestResult(`❌ Erreur table folders: ${error.message}`);
        } else {
          addTestResult(`✅ Table folders: ${folders?.length || 0} dossiers trouvés`);
          if (folders && folders.length > 0) {
            folders.forEach(f => {
              addTestResult(`   📁 ${f.name} (classeur_id: ${f.classeur_id ? f.classeur_id.substring(0, 8) + '...' : 'null'}, notebook_id: ${f.notebook_id ? f.notebook_id.substring(0, 8) + '...' : 'null'})`);
            });
          }
        }
      } catch (error) {
        addTestResult(`❌ Erreur lors du test folders: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 3: Vérifier la table articles
      addTestResult('🧪 Test 3: Vérification de la table articles');
      try {
        const { data: articles, error } = await supabase
          .from('articles')
          .select('id, source_title, classeur_id, notebook_id')
          .limit(5);

        if (error) {
          addTestResult(`❌ Erreur table articles: ${error.message}`);
        } else {
          addTestResult(`✅ Table articles: ${articles?.length || 0} articles trouvés`);
          if (articles && articles.length > 0) {
            articles.forEach(a => {
              addTestResult(`   📝 ${a.source_title} (classeur_id: ${a.classeur_id ? a.classeur_id.substring(0, 8) + '...' : 'null'}, notebook_id: ${a.notebook_id ? a.notebook_id.substring(0, 8) + '...' : 'null'})`);
            });
          }
        }
      } catch (error) {
        addTestResult(`❌ Erreur lors du test articles: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 4: Vérifier la structure des colonnes
      addTestResult('🧪 Test 4: Vérification de la structure des colonnes');
      try {
        // Test avec un classeur existant
        const { data: classeurs } = await supabase
          .from('classeurs')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (classeurs && classeurs.length > 0) {
          const classeurId = classeurs[0].id;
          
          // Tester les relations
          const { data: foldersForClasseur } = await supabase
            .from('folders')
            .select('id, name')
            .eq('classeur_id', classeurId);

          const { data: articlesForClasseur } = await supabase
            .from('articles')
            .select('id, source_title')
            .eq('classeur_id', classeurId);

          addTestResult(`✅ Relations testées pour classeur ${classeurId.substring(0, 8)}...`);
          addTestResult(`   📁 Dossiers liés: ${foldersForClasseur?.length || 0}`);
          addTestResult(`   📝 Articles liés: ${articlesForClasseur?.length || 0}`);
        } else {
          addTestResult('⚠️ Aucun classeur trouvé pour tester les relations');
        }
      } catch (error) {
        addTestResult(`❌ Erreur lors du test des relations: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      addTestResult('🎯 Test de connexion terminé');

    } catch (error) {
      addTestResult(`💥 Erreur critique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test de Connexion à la Base de Données</h1>
      
      <div className="mb-6 space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">État actuel:</h2>
          <p>👤 Utilisateur: {user ? `${user.id.substring(0, 8)}...` : 'Non connecté'}</p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={testDatabaseConnection}
            disabled={isTesting || !user}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            {isTesting ? '🧪 Test en cours...' : '🧪 Tester la connexion DB'}
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            🗑️ Effacer les résultats
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
          <h3 className="text-white font-semibold mb-2">Résultats du test:</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="whitespace-pre-wrap">{result}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 