'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';

const AuthTest: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<string>('Chargement...');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setAuthStatus('Vérification de l\'authentification...');
      
      // Test 1: Vérifier les variables d'environnement
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('🔧 Variables d\'environnement:');
      console.log('URL:', url ? 'SET' : 'NOT SET');
      console.log('KEY:', key ? 'SET' : 'NOT SET');

      // Test 2: Vérifier la session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthStatus(`Erreur: ${error.message}`);
        console.error('❌ Erreur Supabase:', error);
        setDebugInfo({ error: error.message, code: error.status });
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setAuthStatus('✅ Utilisateur connecté');
        console.log('✅ Session trouvée:', session.user);
        setDebugInfo({ 
          userId: session.user.id, 
          email: session.user.email,
          sessionExpiry: session.expires_at 
        });
      } else {
        setAuthStatus('⚠️ Aucun utilisateur connecté');
        console.log('⚠️ Aucune session');
        setDebugInfo({ message: 'Aucune session active' });
      }

    } catch (error) {
      setAuthStatus(`Erreur fatale: ${error instanceof Error ? error.message : String(error)}`);
      console.error('💥 Erreur fatale:', error);
      setDebugInfo({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const signInTest = async () => {
    try {
      setLoading(true);
      setAuthStatus('Tentative de connexion...');
      
      // Test avec des identifiants factices pour voir l'erreur
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'test123'
      });

      if (error) {
        setAuthStatus(`Erreur connexion: ${error.message}`);
        console.log('❌ Erreur connexion (attendue):', error.message);
        setDebugInfo({ 
          authError: error.message, 
          code: error.status,
          expected: true 
        });
      } else {
        setAuthStatus('✅ Connexion réussie (inattendu!)');
        setUser(data.user);
        setDebugInfo({ 
          userId: data.user?.id, 
          unexpected: true 
        });
      }
    } catch (error) {
      setAuthStatus(`Erreur fatale: ${error instanceof Error ? error.message : String(error)}`);
      setDebugInfo({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const signOutTest = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthStatus(`Erreur déconnexion: ${error.message}`);
        setDebugInfo({ signOutError: error.message });
      } else {
        setAuthStatus('✅ Déconnexion réussie');
        setUser(null);
        setDebugInfo({ message: 'Déconnexion réussie' });
      }
    } catch (error) {
      setAuthStatus(`Erreur fatale: ${error instanceof Error ? error.message : String(error)}`);
      setDebugInfo({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  const testSupabaseConnection = async () => {
    try {
      setLoading(true);
      setAuthStatus('Test de connexion Supabase...');
      
      // Test de base de la connexion
      const { data, error } = await supabase.from('chat_sessions').select('count').limit(1);
      
      if (error) {
        setAuthStatus(`Erreur DB: ${error.message}`);
        setDebugInfo({ 
          dbError: error.message, 
          code: error.code,
          details: error.details 
        });
      } else {
        setAuthStatus('✅ Connexion DB réussie');
        setDebugInfo({ 
          dbSuccess: true, 
          data: data 
        });
      }
    } catch (error) {
      setAuthStatus(`Erreur fatale DB: ${error instanceof Error ? error.message : String(error)}`);
      setDebugInfo({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Test d'Authentification Supabase</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">État de l'authentification:</h2>
        <p className="text-sm">{authStatus}</p>
        {loading && <p className="text-blue-600">⏳ Chargement...</p>}
      </div>

      {user && (
        <div className="bg-green-100 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Utilisateur connecté:</h3>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <button
          onClick={checkAuth}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          🔄 Vérifier l'authentification
        </button>
        
        <button
          onClick={signInTest}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          🔑 Test de connexion
        </button>
        
        <button
          onClick={testSupabaseConnection}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 ml-2"
        >
          🗄️ Test DB
        </button>
        
        {user && (
          <button
            onClick={signOutTest}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 ml-2"
          >
            🚪 Déconnexion
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold mb-2">🔧 Variables d'environnement:</h3>
          <p className="text-sm">
            <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET'}
          </p>
          <p className="text-sm">
            <strong>KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET'}
          </p>
          <p className="text-sm">
            <strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'NOT SET'}
          </p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold mb-2">📊 Informations de debug:</h3>
          <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-6 bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">🔍 Instructions de diagnostic:</h3>
        <ol className="text-sm list-decimal list-inside space-y-1">
          <li>Ouvrez la console du navigateur (F12)</li>
          <li>Cliquez sur "Vérifier l'authentification"</li>
          <li>Regardez les logs dans la console</li>
          <li>Vérifiez les erreurs réseau dans l'onglet Network</li>
          <li>Testez la connexion DB pour vérifier l'accès</li>
        </ol>
      </div>
    </div>
  );
};

export default AuthTest; 