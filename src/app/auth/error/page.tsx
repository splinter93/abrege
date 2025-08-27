'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function AuthErrorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorDetails, setErrorDetails] = useState<any>(null);

  useEffect(() => {
    if (!searchParams) return;

    const reason = searchParams.get('reason');
    const details = searchParams.get('details');
    
    // Récupérer les détails de sessionStorage pour le diagnostic
    let sessionStorageInfo = {};
    try {
      sessionStorageInfo = {
        chatgpt_oauth_flow: sessionStorage.getItem('chatgpt_oauth_flow'),
        chatgpt_oauth_params: sessionStorage.getItem('chatgpt_oauth_params'),
        oauth_external_params: sessionStorage.getItem('oauth_external_params'),
      };
    } catch (e) {
      sessionStorageInfo = { error: 'SessionStorage inaccessible' };
    }

    setErrorDetails({
      reason,
      details,
      sessionStorageInfo,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, [searchParams]);

  const getErrorMessage = (reason: string | null) => {
    switch (reason) {
      case 'invalid_init_params':
        return 'Paramètres OAuth initiaux manquants ou invalides';
      case 'session_storage_unavailable':
        return 'SessionStorage non disponible (mode navigation privée ?)';
      case 'sign_in_failed':
        return 'Échec de la connexion avec Google';
      case 'no_search_params':
        return 'Paramètres de recherche non disponibles';
      case 'callback_failed':
        return 'Échec du callback d\'authentification';
      case 'code_generation_failed':
        return 'Échec de la génération du code OAuth';
      default:
        return 'Erreur d\'authentification inconnue';
    }
  };

  const getErrorSolution = (reason: string | null) => {
    switch (reason) {
      case 'invalid_init_params':
        return 'Vérifiez que l\'URL contient tous les paramètres OAuth requis (client_id, redirect_uri, response_type=code)';
      case 'session_storage_unavailable':
        return 'Désactivez le mode navigation privée ou vérifiez que les cookies sont activés';
      case 'sign_in_failed':
        return 'Vérifiez votre connexion internet et réessayez. Assurez-vous que les popups ne sont pas bloqués.';
      case 'no_search_params':
        return 'Accédez à cette page via le flux OAuth complet, pas directement';
      case 'callback_failed':
        return 'Vérifiez la configuration Supabase et les URLs de redirection';
      case 'code_generation_failed':
        return 'Vérifiez la configuration de l\'API OAuth et les permissions utilisateur';
      default:
        return 'Vérifiez la console du navigateur pour plus de détails et contactez le support';
    }
  };

  const retryAuth = () => {
    // Nettoyer le sessionStorage et rediriger vers la page d'accueil
    try {
      sessionStorage.removeItem('chatgpt_oauth_flow');
      sessionStorage.removeItem('chatgpt_oauth_params');
      sessionStorage.removeItem('oauth_external_params');
    } catch (e) {
      console.warn('Impossible de nettoyer le sessionStorage:', e);
    }
    
    router.push('/');
  };

  const copyErrorDetails = () => {
    if (errorDetails) {
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('Détails d\'erreur copiés dans le presse-papiers');
    }
  };

  if (!errorDetails) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>Chargement...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      maxWidth: 800, 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        backgroundColor: '#fee', 
        border: '1px solid #fcc', 
        borderRadius: 8, 
        padding: 20, 
        marginBottom: 24 
      }}>
        <h1 style={{ color: '#c33', margin: '0 0 16px 0' }}>
          ❌ Erreur d'authentification
        </h1>
        <p style={{ fontSize: '18px', margin: '0 0 16px 0' }}>
          <strong>Problème :</strong> {getErrorMessage(errorDetails.reason)}
        </p>
        <p style={{ fontSize: '16px', margin: '0 0 20px 0' }}>
          <strong>Solution :</strong> {getErrorSolution(errorDetails.reason)}
        </p>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={retryAuth}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔄 Réessayer l'authentification
          </button>
          
          <button
            onClick={() => router.push('/')}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>

      {/* Section diagnostic */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: 8, 
        padding: 20 
      }}>
        <h3 style={{ margin: '0 0 16px 0' }}>🔍 Diagnostic technique</h3>
        
        <div style={{ marginBottom: 16 }}>
          <strong>Raison de l'erreur :</strong> {errorDetails.reason || 'Non spécifiée'}
        </div>
        
        {errorDetails.details && (
          <div style={{ marginBottom: 16 }}>
            <strong>Détails :</strong> {errorDetails.details}
          </div>
        )}
        
        <div style={{ marginBottom: 16 }}>
          <strong>URL :</strong> {errorDetails.url}
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <strong>Timestamp :</strong> {errorDetails.timestamp}
        </div>

        {/* SessionStorage info */}
        <div style={{ marginBottom: 16 }}>
          <strong>État du SessionStorage :</strong>
          <pre style={{ 
            backgroundColor: '#fff', 
            padding: 12, 
            borderRadius: 4, 
            fontSize: '12px',
            overflow: 'auto',
            marginTop: 8
          }}>
            {JSON.stringify(errorDetails.sessionStorageInfo, null, 2)}
          </pre>
        </div>

        <button
          onClick={copyErrorDetails}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📋 Copier les détails d'erreur
        </button>
      </div>

      {/* Instructions de résolution */}
      <div style={{ 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: 8, 
        padding: 20, 
        marginTop: 24 
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0056b3' }}>
          🛠️ Vérifications à effectuer
        </h3>
        
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Vérifiez que vous accédez à cette page via le flux OAuth complet</li>
          <li>Assurez-vous que les cookies sont activés dans votre navigateur</li>
          <li>Vérifiez que les popups ne sont pas bloqués</li>
          <li>Assurez-vous d'être sur le bon domaine (www.scrivia.app)</li>
          <li>Vérifiez votre connexion internet</li>
          <li>Essayez de vider le cache et les cookies du navigateur</li>
        </ul>
      </div>
    </div>
  );
}

// Composant principal avec Suspense pour Next.js 15
export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        padding: 24, 
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2>Chargement...</h2>
        <p>Initialisation de la page d'erreur...</p>
      </div>
    }>
      <AuthErrorPageContent />
    </Suspense>
  );
}
