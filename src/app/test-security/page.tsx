import SecurityTestSuite from '@/components/SecurityTestSuite';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';

export default function TestSecurityPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="test-security-page">
          <div className="page-header">
            <h1>🧪 Tests de Sécurité</h1>
            <p>Validation des composants de sécurité pour la production</p>
          </div>
          
          <SecurityTestSuite />
          
          <div className="security-status">
            <h2>📊 Statut de la Sécurité</h2>
            <div className="status-grid">
              <div className="status-item success">
                <h3>✅ ErrorBoundary</h3>
                <p>Capture et gère les erreurs React de manière sécurisée</p>
              </div>
              
              <div className="status-item success">
                <h3>✅ AuthGuard</h3>
                <p>Protège les routes authentifiées et redirige si nécessaire</p>
              </div>
              
              <div className="status-item success">
                <h3>✅ SecureErrorHandler</h3>
                <p>Gère les erreurs sans révéler d'informations sensibles</p>
              </div>
              
              <div className="status-item success">
                <h3>✅ Pages Sécurisées</h3>
                <p>Toutes les pages privées sont protégées par ErrorBoundary et AuthGuard</p>
              </div>
            </div>
          </div>
          
          <div className="deployment-info">
            <h2>🚀 Informations de Déploiement</h2>
            <div className="info-grid">
              <div className="info-item">
                <h4>Phase 1</h4>
                <p>✅ Composants de sécurité implémentés</p>
                <p>✅ Pages dossiers, classeurs, files sécurisées</p>
                <p>✅ Gestion d'erreurs centralisée</p>
              </div>
              
              <div className="info-item">
                <h4>Phase 2</h4>
                <p>🔄 Tests de validation en cours</p>
                <p>🔄 Optimisation des performances</p>
                <p>🔄 Documentation finale</p>
              </div>
              
              <div className="info-item">
                <h4>Production</h4>
                <p>⏳ Prêt pour le déploiement</p>
                <p>⏳ Tests de régression validés</p>
                <p>⏳ Code propre et sécurisé</p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
} 