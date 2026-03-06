"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import { logApi } from "@/utils/logger";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";
import "@/components/DossierLoadingStates.css";
import { Settings, Edit, Trash2, Plus } from "lucide-react";
import "@/styles/main.css";
import "@/styles/account.css";
import "@/app/(public)/dashboard.css";
import "./settings.css";

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
        <SettingsPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
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

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-settings min-h-full flex flex-col bg-[var(--color-bg-primary)] w-full max-w-none mx-0">
        {/* Header sticky Linear (même bloc titre que Fichiers) */}
        <header className="sticky top-0 z-20 bg-[var(--color-bg-primary)]/90 backdrop-blur-xl border-b border-zinc-800/60 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                <Settings className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-100">Réglages</h1>
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400">
                  {apiKeys.length} clé{apiKeys.length !== 1 ? 's' : ''} API
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="max-w-screen-2xl mx-auto w-full flex flex-col gap-8">

            {/* Section Clés API */}
            <motion.section
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-zinc-800/60">
                <h2 className="text-lg font-semibold text-zinc-100 m-0">Clés API</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle clé
                </button>
              </div>
              <div className="p-6 pt-0">
                <AnimatePresence>
                  {showCreateForm && (
                    <motion.div
                      className="account-create-key-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="account-field">
                        <label className="account-field-label">Nom de la clé API</label>
                        <input
                          type="text"
                          value={newApiKeyName}
                          onChange={(e) => setNewApiKeyName(e.target.value)}
                          placeholder="Ex: ChatGPT Integration, Clé de production..."
                          className="account-field-input"
                        />
                      </div>
                      <div className="account-field">
                        <label className="account-field-label">Permissions (scopes)</label>
                        <div className="account-scopes-grid">
                          {availableScopes.map((scope) => (
                            <label key={scope.key} className="account-scope-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedScopes.includes(scope.key)}
                                onChange={() => toggleScope(scope.key)}
                              />
                              <div className="account-scope-content">
                                <span className="account-scope-label">{scope.label}</span>
                                <span className="account-scope-description">{scope.description}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="account-create-input-group">
                        <button
                          className="account-button-primary"
                          onClick={handleCreateApiKey}
                          disabled={!newApiKeyName.trim()}
                        >
                          Créer la clé
                        </button>
                        <button
                          className="account-button-secondary"
                          onClick={() => setShowCreateForm(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {loading ? (
                  <div className="py-12 flex justify-center">
                    <SimpleLoadingState message="Chargement" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="account-empty-state">
                    <span className="account-empty-icon">🔑</span>
                    <h3>Aucune clé API</h3>
                    <p>Créez votre première clé API pour commencer à utiliser Scrivia avec ChatGPT</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {apiKeys.map((apiKey, index) => (
                      <motion.div
                        key={apiKey.id}
                        className={`account-api-key-item ${!apiKey.is_active ? 'inactive' : ''}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="account-api-key-header">
                          <div className="account-api-key-info">
                            <div className="account-api-key-name-row">
                              <h3 className="account-api-key-name">{apiKey.api_key_name}</h3>
                              <div className={`account-status-badge ${apiKey.is_active ? 'active' : 'inactive'}`}>
                                {apiKey.is_active ? 'Actif' : 'Inactif'}
                              </div>
                            </div>
                            <div className="account-api-key-meta">
                              <span className="account-api-key-date">Créée le {new Date(apiKey.created_at).toLocaleDateString()}</span>
                              {apiKey.last_used_at && (
                                <span className="account-api-key-last">Dernière utilisation: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="account-api-key-actions-header">
                            <button
                              type="button"
                              className="account-action-button edit"
                              onClick={() => {/* TODO: Implémenter la modification */}}
                              title="Modifier la clé"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              className="account-action-button delete"
                              onClick={() => handleDeleteApiKey(apiKey.api_key_name)}
                              title="Supprimer la clé"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="account-api-key-content">
                          <div className="account-api-key-scopes-row">
                            <div className="account-api-key-scopes">
                              <strong>Permissions:</strong>
                              <div className="account-scopes-tags">
                                {apiKey.scopes.map((scope) => (
                                  <span key={scope} className="account-scope-tag">
                                    {scope}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="account-api-key-creation-date">
                              Créée le {new Date(apiKey.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>

            {/* Section Préférences */}
            <motion.section
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="p-6 border-b border-zinc-800/60">
                <h2 className="text-lg font-semibold text-zinc-100 m-0">Préférences</h2>
              </div>
              <div className="p-6">
                <div className="account-glass-block">
                  <div className="account-preferences-grid">
                    <div className="account-field">
                      <label className="account-field-label">Langue</label>
                      <select className="account-field-select">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="account-field">
                      <label className="account-field-label">Thème</label>
                      <select className="account-field-select">
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="auto">Automatique</option>
                      </select>
                    </div>
                    <div className="account-field">
                      <label className="account-field-label">Notifications</label>
                      <div className="account-checkbox-group">
                        <label className="account-checkbox">
                          <input type="checkbox" defaultChecked />
                          <span className="account-checkbox-text">Email</span>
                        </label>
                        <label className="account-checkbox">
                          <input type="checkbox" />
                          <span className="account-checkbox-text">Push</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Section Sécurité */}
            <motion.section
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="p-6 border-b border-zinc-800/60">
                <h2 className="text-lg font-semibold text-zinc-100 m-0">Sécurité</h2>
              </div>
              <div className="p-6">
                <div className="account-glass-block">
                  <div className="account-security-actions">
                    <button type="button" className="account-button-secondary">
                      🔒 Changer le mot de passe
                    </button>
                    <button type="button" className="account-button-secondary">
                      📱 Authentification à deux facteurs
                    </button>
                    <button type="button" className="account-button-danger">
                      🗑️ Supprimer le compte
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>

          </div>
        </main>
      </div>

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
                  <p><strong>⚠️ Important :</strong> Cette clé ne sera affichée qu&apos;une seule fois.</p>
                  <p>Copiez-la et stockez-la en lieu sûr. Vous ne pourrez plus la voir après avoir fermé cette fenêtre.</p>
                </div>
                <div className="api-key-display">
                  <code className="api-key-code">{newlyCreatedKey}</code>
                  <button
                    className="settings-copy-button"
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
                  J&apos;ai copié ma clé
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWithSidebarLayout>
  );
} 