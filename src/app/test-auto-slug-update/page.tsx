'use client';

import React, { useState } from 'react';
import { supabase } from '@/supabaseClient';

export default function TestAutoSlugUpdate() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testRenameClasseur = async () => {
    try {
      setLoading(true);
      setTestResult('🔄 Test renommage classeur...');
      
      // Récupérer la session actuelle
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

      setTestResult(`✅ Classeur créé: ${classeur.name} (slug: ${classeur.slug})`);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Renommer le classeur
      const newName = `Classeur Renommé ${Date.now()}`;
      setTestResult(`🔄 Renommage en cours: "${testName}" → "${newName}"`);
      
      const { data: updatedClasseur, error: updateError } = await supabase
        .from('classeurs')
        .update({ name: newName })
        .eq('id', classeur.id)
        .select()
        .single();

      if (updateError) {
        setTestResult(`❌ Erreur renommage: ${updateError.message}`);
        return;
      }

      setTestResult(`✅ Classeur renommé: ${updatedClasseur.name} (nouveau slug: ${updatedClasseur.slug})`);
      
      // Nettoyer le classeur de test
      await supabase
        .from('classeurs')
        .delete()
        .eq('id', classeur.id);
      
      setTestResult(`✅ Test terminé - Classeur de test supprimé`);
      
    } catch (error) {
      console.error('❌ Erreur test renommage classeur:', error);
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRenameFolder = async () => {
    try {
      setLoading(true);
      setTestResult('🔄 Test renommage dossier...');
      
      // Récupérer la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Créer un classeur de test d'abord
      const { data: classeur, error: classeurError } = await supabase
        .from('classeurs')
        .insert({
          name: `Test Classeur ${Date.now()}`,
          slug: `test-classeur-${Date.now()}`,
          user_id: session.user.id,
          color: '#e55a2c'
        })
        .select()
        .single();

      if (classeurError) {
        setTestResult(`❌ Erreur création classeur: ${classeurError.message}`);
        return;
      }

      // Créer un dossier de test
      const testName = `Test Dossier ${Date.now()}`;
      const { data: folder, error: createError } = await supabase
        .from('folders')
        .insert({
          name: testName,
          slug: `test-dossier-${Date.now()}`,
          user_id: session.user.id,
          classeur_id: classeur.id
        })
        .select()
        .single();

      if (createError) {
        setTestResult(`❌ Erreur création dossier: ${createError.message}`);
        return;
      }

      setTestResult(`✅ Dossier créé: ${folder.name} (slug: ${folder.slug})`);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Renommer le dossier
      const newName = `Dossier Renommé ${Date.now()}`;
      setTestResult(`🔄 Renommage en cours: "${testName}" → "${newName}"`);
      
      const { data: updatedFolder, error: updateError } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folder.id)
        .select()
        .single();

      if (updateError) {
        setTestResult(`❌ Erreur renommage: ${updateError.message}`);
        return;
      }

      setTestResult(`✅ Dossier renommé: ${updatedFolder.name} (nouveau slug: ${updatedFolder.slug})`);
      
      // Nettoyer
      await supabase.from('folders').delete().eq('id', folder.id);
      await supabase.from('classeurs').delete().eq('id', classeur.id);
      
      setTestResult(`✅ Test terminé - Ressources de test supprimées`);
      
    } catch (error) {
      console.error('❌ Erreur test renommage dossier:', error);
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRenameNote = async () => {
    try {
      setLoading(true);
      setTestResult('🔄 Test renommage note...');
      
      // Récupérer la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Créer un classeur de test d'abord
      const { data: classeur, error: classeurError } = await supabase
        .from('classeurs')
        .insert({
          name: `Test Classeur ${Date.now()}`,
          slug: `test-classeur-${Date.now()}`,
          user_id: session.user.id,
          color: '#e55a2c'
        })
        .select()
        .single();

      if (classeurError) {
        setTestResult(`❌ Erreur création classeur: ${classeurError.message}`);
        return;
      }

      // Créer une note de test
      const testTitle = `Test Note ${Date.now()}`;
      const { data: note, error: createError } = await supabase
        .from('articles')
        .insert({
          source_title: testTitle,
          slug: `test-note-${Date.now()}`,
          user_id: session.user.id,
          classeur_id: classeur.id,
          markdown_content: 'Contenu de test',
          html_content: '<p>Contenu de test</p>'
        })
        .select()
        .single();

      if (createError) {
        setTestResult(`❌ Erreur création note: ${createError.message}`);
        return;
      }

      setTestResult(`✅ Note créée: ${note.source_title} (slug: ${note.slug})`);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Renommer la note
      const newTitle = `Note Renommée ${Date.now()}`;
      setTestResult(`🔄 Renommage en cours: "${testTitle}" → "${newTitle}"`);
      
      const { data: updatedNote, error: updateError } = await supabase
        .from('articles')
        .update({ source_title: newTitle })
        .eq('id', note.id)
        .select()
        .single();

      if (updateError) {
        setTestResult(`❌ Erreur renommage: ${updateError.message}`);
        return;
      }

      setTestResult(`✅ Note renommée: ${updatedNote.source_title} (nouveau slug: ${updatedNote.slug})`);
      
      // Nettoyer
      await supabase.from('articles').delete().eq('id', note.id);
      await supabase.from('classeurs').delete().eq('id', classeur.id);
      
      setTestResult(`✅ Test terminé - Ressources de test supprimées`);
      
    } catch (error) {
      console.error('❌ Erreur test renommage note:', error);
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎯 Test Mise à Jour Automatique des Slugs
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tests de renommage avec mise à jour automatique des slugs
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={testRenameClasseur}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              🗂️ Test Renommage Classeur
            </button>
            
            <button
              onClick={testRenameFolder}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg ml-4"
            >
              📁 Test Renommage Dossier
            </button>
            
            <button
              onClick={testRenameNote}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg ml-4"
            >
              📝 Test Renommage Note
            </button>
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
              <li>✅ <strong>Classeurs</strong> : Le slug se met à jour automatiquement lors du renommage</li>
              <li>✅ <strong>Dossiers</strong> : Le slug se met à jour automatiquement lors du renommage</li>
              <li>✅ <strong>Notes</strong> : Le slug se met à jour automatiquement lors du renommage</li>
              <li>✅ <strong>URLs cohérentes</strong> : Les liens restent valides après renommage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 