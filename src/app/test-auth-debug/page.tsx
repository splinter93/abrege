'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';

export default function TestAuthDebug() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // Vérifier la session actuelle
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erreur session:', sessionError);
        setTestResult(`❌ Erreur session: ${sessionError.message}`);
        return;
      }

      setSession(currentSession);
      
      if (currentSession) {
        // Vérifier l'utilisateur
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Erreur utilisateur:', userError);
          setTestResult(`❌ Erreur utilisateur: ${userError.message}`);
          return;
        }

        setUser(currentUser);
        setTestResult(`✅ Authentifié: ${currentUser?.email} (${currentUser?.id})`);
      } else {
        setTestResult('❌ Aucune session active');
      }
    } catch (error) {
      console.error('❌ Erreur générale:', error);
      setTestResult(`❌ Erreur générale: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testCreateNote = async () => {
    try {
      setTestResult('🔄 Test création note...');
      
      // Récupérer la session actuelle
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Test avec l'endpoint de test (sans authentification)
      const response = await fetch('/api/v2/note/test-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_title: 'Test Note Auth Debug',
          notebook_id: 'scrivia',
          markdown_content: 'Test content from auth debug'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(`✅ Note créée avec succès: ${result.note.id}`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ Erreur création note: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Erreur test création:', error);
      setTestResult(`❌ Erreur test création: ${error}`);
    }
  };

  const testCreateNoteWithAuth = async () => {
    try {
      setTestResult('🔄 Test création note avec authentification...');
      
      // Récupérer la session actuelle
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        setTestResult('❌ Pas de token d\'accès');
        return;
      }

      // Test avec l'endpoint principal (avec authentification)
      const response = await fetch('/api/v2/note/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          source_title: 'Test Note Auth Debug 2',
          notebook_id: 'scrivia',
          markdown_content: 'Test content from auth debug 2'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(`✅ Note créée avec succès (avec auth): ${result.note.id}`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ Erreur création note (avec auth): ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Erreur test création avec auth:', error);
      setTestResult(`❌ Erreur test création avec auth: ${error}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setTestResult('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      setTestResult(`❌ Erreur déconnexion: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔐 Test Authentification - Chargement...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔐 Test Authentification et Création de Note
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            État de l'authentification
          </h2>
          
          <div className="space-y-4">
            <div>
              <strong>Session active:</strong> {session ? '✅ Oui' : '❌ Non'}
            </div>
            
            {session && (
              <>
                <div>
                  <strong>Token d'accès:</strong> {session.access_token ? '✅ Présent' : '❌ Absent'}
                </div>
                <div>
                  <strong>Expire le:</strong> {session.expires_at ? new Date(session.expires_at).toLocaleString() : '❌ Inconnu'}
                </div>
              </>
            )}
            
            {user && (
              <>
                <div>
                  <strong>Utilisateur:</strong> {user.email} ({user.id})
                </div>
                <div>
                  <strong>Dernière connexion:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '❌ Inconnu'}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tests de création de note
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={testCreateNote}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              🧪 Test création note (sans auth)
            </button>
            
            <button
              onClick={testCreateNoteWithAuth}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg ml-4"
            >
              🔐 Test création note (avec auth)
            </button>
            
            <button
              onClick={signOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg ml-4"
            >
              🚪 Déconnexion
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
        </div>
      </div>
    </div>
  );
} 