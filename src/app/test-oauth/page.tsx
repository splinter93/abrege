'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoHeader from '@/components/LogoHeader';

export default function TestOAuthPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const router = useRouter();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testOAuthFlow = () => {
    addResult('🧪 Test du flux OAuth ChatGPT...');
    
    // Simuler les paramètres ChatGPT
    const oauthParams = {
      client_id: 'scrivia-custom-gpt',
      redirect_uri: 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
      scope: 'notes:read dossiers:read',
      state: 'test-state-123',
      response_type: 'code'
    };

    addResult(`📋 Paramètres OAuth: ${JSON.stringify(oauthParams, null, 2)}`);
    
    // Construire l'URL de test
    const testUrl = `/auth?${new URLSearchParams(oauthParams).toString()}`;
    addResult(`🔗 URL de test: ${testUrl}`);
    
    // Rediriger vers la page d'auth
    addResult('🚀 Redirection vers /auth...');
    router.push(testUrl);
  };

  const testCreateCodeAPI = async () => {
    addResult('🧪 Test de l\'API create-code...');
    
    try {
      // Simuler un appel à l'API
      const response = await fetch('/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          clientId: 'scrivia-custom-gpt',
          userId: 'test-user-id',
          redirectUri: 'https://chat.openai.com/test',
          scopes: ['notes:read'],
          state: 'test-state'
        })
      });

      addResult(`📡 Réponse API: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Données reçues: ${JSON.stringify(data)}`);
      } else {
        const error = await response.text();
        addResult(`❌ Erreur: ${error}`);
      }
    } catch (error) {
      addResult(`💥 Exception: ${error}`);
    }
  };



  const testCreateCodeWithRealAuth = async () => {
    addResult('🧪 Test de l\'API create-code avec authentification réelle...');
    
    try {
      // Récupérer la session Supabase actuelle
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        addResult('❌ Pas de session Supabase active');
        addResult('💡 Connectez-vous d\'abord via OAuth');
        return;
      }
      
      addResult(`✅ Session trouvée pour: ${session.user.email}`);
      addResult(`🔑 Token présent: ${session.access_token ? 'OUI' : 'NON'}`);
      
      // Tester l'API avec le vrai token
      const response = await fetch('/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientId: 'scrivia-custom-gpt',
          userId: session.user.id,
          redirectUri: 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
          scopes: ['notes:read', 'dossiers:read'],
          state: 'test-state-real'
        })
      });

      addResult(`📡 Réponse API: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Code OAuth créé: ${data.code ? 'OUI' : 'NON'}`);
        addResult(`🔑 Code: ${data.code || 'AUCUN'}`);
      } else {
        const error = await response.text();
        addResult(`❌ Erreur API: ${error}`);
      }
    } catch (error) {
      addResult(`💥 Exception: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="auth-container">
      <LogoHeader />
      
      <div className="auth-content">
        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">🧪 Test OAuth ChatGPT</h1>
            <p className="auth-subtitle">Page de test pour diagnostiquer le flux OAuth</p>
          </div>

          <div className="auth-actions">
            <button onClick={testOAuthFlow} className="auth-button primary">
              🚀 Tester le flux OAuth complet
            </button>
            
            <button onClick={testCreateCodeAPI} className="auth-button">
              📡 Tester l'API create-code
            </button>
            
            <button onClick={testCreateCodeWithRealAuth} className="auth-button">
              🔑 Tester l'API create-code avec authentification réelle
            </button>
            
            <button onClick={clearResults} className="auth-button">
              🗑️ Effacer les résultats
            </button>
          </div>

          <div className="test-results" style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>📊 Résultats des tests:</h3>
            {testResults.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Aucun test exécuté</p>
            ) : (
              <div className="results-list">
                {testResults.map((result, index) => (
                  <div key={index} className="result-item" style={{
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="auth-info" style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>ℹ️ Informations de debug:</h3>
            <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}><strong>Client OAuth:</strong> scrivia-custom-gpt</p>
            <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}><strong>Redirect URI:</strong> https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback</p>
            <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}><strong>Scopes:</strong> notes:read, dossiers:read</p>
            <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}><strong>URL de test:</strong> /auth?client_id=scrivia-custom-gpt&redirect_uri=...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
