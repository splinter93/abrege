"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { logApi } from "@/utils/logger";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import "@/styles/main.css";
import "./SettingsPage.css";

interface ApiKey {
  id: string;
  api_key_name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

interface CreateApiKeyResponse {
  success: boolean;
  api_key: string;
  info: {
    api_key_name: string;
    scopes: string[];
    expires_at?: string;
  };
}

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="page-wrapper">
          <header className="settings-header-fixed">
            <LogoHeader size="medium" position="left" />
          </header>

          <aside className="page-sidebar-fixed">
            <Sidebar />
          </aside>

          <main className="page-content-area">
            <SettingsPageContent />
          </main>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return (
      <div className="loading-state">
        <p>Chargement...</p>
      </div>
    );
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedSettingsContent user={user} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedSettingsContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'notes:read', 'classeurs:read', 'dossiers:read'
  ]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string>("");
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'SettingsPage',
    operation: 'gestion_api_keys',
    userId: user.id
  });

  // 🔧 FIX: Définir les fonctions avant de les utiliser dans useEffect
  const getAuthToken = useCallback(async (): Promise<string> => {
    // Récupérer le token depuis Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, []);

  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ui/api-keys', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.api_keys || []);
      } else {
        logApi.error('Erreur chargement API Keys:', response.status);
      }
    } catch (error) {
      handleError(error, 'chargement API Keys');
    } finally {
      setLoading(false);
    }
  }, [handleError, getAuthToken]);

  // Charger les API Keys existantes
  useEffect(() => {
    if (user?.id) {
      loadApiKeys();
    }
  }, [user?.id, loadApiKeys]);

  const handleCreateApiKey = useCallback(async () => {
    if (!newApiKeyName.trim() || !user?.id) return;

    try {
      const response = await fetch('/api/ui/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          api_key_name: newApiKeyName.trim(),
          scopes: selectedScopes,
          expires_at: null // Pas d'expiration pour l'instant
        })
      });

      if (response.ok) {
        const data: CreateApiKeyResponse = await response.json();
        setNewlyCreatedKey(data.api_key);
        setShowNewKeyModal(true);
        setShowCreateForm(false);
        setNewApiKeyName("");
        setSelectedScopes(['notes:read', 'classeurs:read', 'dossiers:read']);
        loadApiKeys(); // Recharger la liste
      } else {
        throw new Error('Erreur création API Key');
      }
    } catch (error) {
      handleError(error, 'création API Key');
    }
  }, [newApiKeyName, user?.id, selectedScopes, getAuthToken, loadApiKeys, handleError]);

  const handleDeleteApiKey = useCallback(async (apiKeyName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'API Key "${apiKeyName}" ?`)) return;

    try {
      // Note: L'endpoint DELETE n'existe pas encore, on utilise la désactivation
      // TODO: Implémenter l'endpoint DELETE dans une version future
      logApi.info('Suppression API Key:', apiKeyName);
      loadApiKeys(); // Recharger la liste
    } catch (error) {
      handleError(error, 'suppression API Key');
    }
  }, [loadApiKeys, handleError]);

  const toggleScope = useCallback((scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  }, []);

  // 🔧 OPTIMISATION: Mémoiser les scopes disponibles pour éviter les re-renders
  const availableScopes = useMemo(() => [
    { key: 'notes:read', label: 'Lecture des notes', description: 'Consulter vos notes et articles' },
    { key: 'notes:write', label: 'Écriture des notes', description: 'Créer et modifier vos notes' },
    { key: 'classeurs:read', label: 'Lecture des classeurs', description: 'Consulter vos classeurs' },
    { key: 'classeurs:write', label: 'Écriture des classeurs', description: 'Créer et modifier vos classeurs' },
    { key: 'dossiers:read', label: 'Lecture des dossiers', description: 'Consulter vos dossiers' },
    { key: 'dossiers:write', label: 'Écriture des dossiers', description: 'Créer et modifier vos dossiers' }
  ], []);

  // 🔧 FIX: Plus besoin de vérifier authLoading car c'est déjà fait dans le composant parent
  // if (authLoading) {
  //   return (
  //     <div className="settings-loading">
  //       <div className="loading-spinner"></div>
  //       <p>Chargement des réglages...</p>
  //     </div>
  //   );
  // }

  return (
    <>
      {/* Titre de la page avec design glassmorphism uniforme */}
      <motion.div 
        key="settings-title"
        className="page-title-container-glass"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="page-title-content">
          <div className="page-title-left-section">
            <motion.div 
              className="page-title-icon-container"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="page-title-icon">⚙️</span>
            </motion.div>
            <div className="page-title-section">
              <h1 className="page-title">Réglages</h1>
              <p className="page-subtitle">Gérez vos préférences et clés API</p>
            </div>
          </div>
          <div className="page-title-stats">
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{apiKeys.length}</span>
              <span className="page-title-stats-label">clé{apiKeys.length > 1 ? 's' : ''} API</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{user?.email ? '✅' : '❌'}</span>
              <span className="page-title-stats-label">authentifié</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section des réglages avec navigation glassmorphism */}
      <motion.section 
        key="settings-content"
        className="content-section-glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      >
        <div className="content-main-container-glass">
          
          {/* Section API Keys */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2 className="settings-section-title">🔑 Clés API</h2>
              <p className="settings-section-description">
                Gérez vos clés API pour l'intégration avec ChatGPT et autres services
              </p>
            </div>

            {/* Bouton créer nouvelle clé */}
            <div className="settings-actions">
              <motion.button
                className="settings-create-button"
                onClick={() => setShowCreateForm(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="button-icon">➕</span>
                Créer une nouvelle clé
              </motion.button>
            </div>

            {/* Formulaire de création */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  className="settings-create-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group">
                    <label htmlFor="apiKeyName">Nom de la clé API</label>
                    <input
                      id="apiKeyName"
                      type="text"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      placeholder="Ex: ChatGPT Integration"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Permissions (scopes)</label>
                    <div className="scopes-grid">
                      {availableScopes.map((scope) => (
                        <label key={scope.key} className="scope-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope.key)}
                            onChange={() => toggleScope(scope.key)}
                          />
                          <div className="scope-content">
                            <span className="scope-label">{scope.label}</span>
                            <span className="scope-description">{scope.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="form-button form-button-secondary"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="form-button form-button-primary"
                      onClick={handleCreateApiKey}
                      disabled={!newApiKeyName.trim()}
                    >
                      Créer la clé
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Liste des clés existantes */}
            <div className="api-keys-list">
              {loading ? (
                <div className="settings-loading">
                  <div className="loading-spinner"></div>
                  <p>Chargement des clés API...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🔑</span>
                  <h3>Aucune clé API</h3>
                  <p>Créez votre première clé API pour commencer à utiliser Scrivia avec ChatGPT</p>
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <motion.div
                    key={apiKey.id}
                    className="api-key-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="api-key-info">
                      <div className="api-key-header">
                        <h4 className="api-key-name">{apiKey.api_key_name}</h4>
                        <span className={`api-key-status ${apiKey.is_active ? 'active' : 'inactive'}`}>
                          {apiKey.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                      <div className="api-key-details">
                        <div className="api-key-scopes">
                          <strong>Permissions:</strong>
                          <div className="scopes-tags">
                            {apiKey.scopes.map((scope) => (
                              <span key={scope} className="scope-tag">
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="api-key-meta">
                          <span>Créée le: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                          {apiKey.last_used_at && (
                            <span>Dernière utilisation: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="api-key-actions">
                      <button
                        className="api-key-button api-key-button-danger"
                        onClick={() => handleDeleteApiKey(apiKey.api_key_name)}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Section autres réglages */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2 className="settings-section-title">🔧 Autres réglages</h2>
              <p className="settings-section-description">
                Configuration générale de votre compte
              </p>
            </div>
            
            <div className="settings-options">
              <div className="setting-option">
                <div className="setting-option-info">
                  <h4>Notifications</h4>
                  <p>Gérer les notifications par email</p>
                </div>
                <div className="setting-option-control">
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-option">
                <div className="setting-option-info">
                  <h4>Mode sombre</h4>
                  <p>Activer le thème sombre</p>
                </div>
                <div className="setting-option-control">
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Modal pour afficher la nouvelle clé */}
      <AnimatePresence key="settings-modal">
        {showNewKeyModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewKeyModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>🔑 Nouvelle clé API créée !</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowNewKeyModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="warning-box">
                  <p><strong>⚠️ Important :</strong> Cette clé ne sera affichée qu'une seule fois.</p>
                  <p>Copiez-la et stockez-la en lieu sûr. Vous ne pourrez plus la voir après avoir fermé cette fenêtre.</p>
                </div>
                <div className="api-key-display">
                  <code className="api-key-code">{newlyCreatedKey}</code>
                  <button
                    className="copy-button"
                    onClick={() => navigator.clipboard.writeText(newlyCreatedKey)}
                  >
                    📋 Copier
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="modal-button"
                  onClick={() => setShowNewKeyModal(false)}
                >
                  J'ai copié ma clé
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 