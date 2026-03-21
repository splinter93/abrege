"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import PageWithSidebarLayout from "@/components/PageWithSidebarLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { User, Edit, Trash2 } from "lucide-react";
import { simpleLogger } from "@/utils/logger";
import "@/styles/main.css";
import "@/app/(public)/dashboard.css";
import "./account.css";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed: string;
  isActive: boolean;
  createdAt: string;
}

export default function AccountPage() {
  const [apiKeyVisible, setApiKeyVisible] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  // Données simulées - à remplacer par de vraies données
  const userData = {
    name: "Utilisateur Scrivia",
    email: "user@scrivia.com",
    plan: "Premium",
    joinDate: "15 janvier 2024"
  };

  const apiKeys: ApiKey[] = [
    {
      id: "1",
      name: "Clé principale",
      key: "sk-1234567890abcdef1234567890abcdef",
      lastUsed: "Il y a 2 heures",
      isActive: true,
      createdAt: "15 janvier 2024"
    },
    {
      id: "2", 
      name: "Clé de développement",
      key: "sk-dev-abcdef1234567890abcdef1234567890",
      lastUsed: "Il y a 1 jour",
      isActive: true,
      createdAt: "10 janvier 2024"
    },
    {
      id: "3",
      name: "Clé de test",
      key: "sk-test-1234567890abcdef1234567890abcdef",
      lastUsed: "Il y a 3 jours",
      isActive: false,
      createdAt: "5 janvier 2024"
    }
  ];

  const handleCopyApiKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(keyId);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      simpleLogger.error('Erreur lors de la copie', err);
    }
  };

  const handleToggleKeyVisibility = (keyId: string) => {
    setApiKeyVisible(apiKeyVisible === keyId ? null : keyId);
  };

  const handleCreateNewKey = () => {
    if (newKeyName.trim()) {
      // Logique pour créer une nouvelle clé
      simpleLogger.dev('Création d\'une nouvelle clé: ' + newKeyName);
      setNewKeyName("");
      setShowCreateKey(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    // Logique pour supprimer une clé
    simpleLogger.dev('Suppression de la clé: ' + keyId);
  };

  return (
    <ErrorBoundary>
      <AuthGuard>
        <PageWithSidebarLayout>
          {/* Titre de la page avec design uniforme */}
          <UnifiedPageTitle
              icon={User}
              title="Mon Compte"
              subtitle="Gérez votre compte et vos préférences"
            />

            {/* Dashboard principal avec design moderne */}
            <div className="main-dashboard">
              
              {/* Section Profil */}
              <motion.section 
                className="dashboard-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="section-header">
                  <div className="section-title-row">
                    <h2 className="section-title">Profil</h2>
                  </div>
                  <div className="section-separator"></div>
                </div>
                
                <div className="account-profile-grid">
                  <div className="account-profile-item">
                    <span className="account-profile-label">Nom</span>
                    <span className="account-profile-value">{userData.name}</span>
                  </div>
                  <div className="account-profile-item">
                    <span className="account-profile-label">Email</span>
                    <span className="account-profile-value">{userData.email}</span>
                  </div>
                  <div className="account-profile-item">
                    <span className="account-profile-label">Plan</span>
                    <div className="account-plan-badge">
                      <span className="account-plan-icon">⭐</span>
                      <span>{userData.plan}</span>
                    </div>
                  </div>
                  <div className="account-profile-item">
                    <span className="account-profile-label">Membre depuis</span>
                    <span className="account-profile-value">{userData.joinDate}</span>
                  </div>
                </div>
              </motion.section>

              {/* Section Clés API */}
              <motion.section 
                className="dashboard-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="section-header">
                  <div className="section-title-row">
                    <h2 className="section-title">Clés API</h2>
                  </div>
                  <div className="section-separator"></div>
                </div>

                {/* Formulaire de création de nouvelle clé */}
                <AnimatePresence>
                  {showCreateKey && (
                    <motion.div
                      className="account-create-key-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="account-field">
                        <label className="account-field-label">Nom de la clé</label>
                        <input 
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Ex: Clé de production, Clé de test..."
                          className="account-field-input"
                        />
                      </div>
                      <div className="account-create-input-group">
                        <button 
                          className="account-button-primary"
                          onClick={handleCreateNewKey}
                          disabled={!newKeyName.trim()}
                        >
                          Créer
                        </button>
                        <button 
                          className="account-button-secondary"
                          onClick={() => setShowCreateKey(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Liste des clés API */}
                {apiKeys.map((apiKey, index) => (
                  <motion.div 
                    key={apiKey.id}
                    className={`account-api-key-item ${!apiKey.isActive ? 'inactive' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  >
                    <div className="account-api-key-header">
                      <div className="account-api-key-info">
                        <div className="account-api-key-name-row">
                          <h3 className="account-api-key-name">{apiKey.name}</h3>
                          <div className={`account-status-badge ${apiKey.isActive ? 'active' : 'inactive'}`}>
                            {apiKey.isActive ? 'Actif' : 'Inactif'}
                          </div>
                        </div>
                      </div>
                      <div className="account-api-key-actions-header">
                        <button 
                          className="account-action-button edit"
                          onClick={() => {/* TODO: Implémenter la modification */}}
                          title="Modifier la clé"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="account-action-button delete"
                          onClick={() => handleDeleteKey(apiKey.id)}
                          title="Supprimer la clé"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="account-api-key-content">
                      <div className="account-api-key-scopes-row">
                        <div className="account-api-key-scopes">
                          <strong>Clé:</strong>
                          <div className="account-scopes-tags">
                            <span className="account-scope-tag">
                              {apiKeyVisible === apiKey.id ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                            </span>
                          </div>
                        </div>
                        <div className="account-api-key-creation-date">
                          Créée le {apiKey.createdAt}
                        </div>
                      </div>
                      <div className="account-api-key-actions">
                        <button 
                          className="account-button-secondary"
                          onClick={() => handleToggleKeyVisibility(apiKey.id)}
                        >
                          {apiKeyVisible === apiKey.id ? '👁️ Masquer' : '👁️ Afficher'}
                        </button>
                        <button 
                          className="account-button-primary"
                          onClick={() => handleCopyApiKey(apiKey.key, apiKey.id)}
                        >
                          {copied === apiKey.id ? '✅ Copié' : '📋 Copier'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.section>

            </div>
        </PageWithSidebarLayout>
      </AuthGuard>
    </ErrorBoundary>
  );
}