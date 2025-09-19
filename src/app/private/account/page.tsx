"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import UnifiedPageLayout from "@/components/UnifiedPageLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { User } from "lucide-react";
import "@/styles/account.css";

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
      key: "sk-test-9876543210fedcba9876543210fedcba",
      lastUsed: "Il y a 1 semaine",
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
      console.error('Erreur lors de la copie:', err);
    }
  };

  const handleToggleKeyVisibility = (keyId: string) => {
    setApiKeyVisible(apiKeyVisible === keyId ? null : keyId);
  };

  const handleCreateNewKey = () => {
    if (newKeyName.trim()) {
      // Logique pour créer une nouvelle clé
      console.log('Création d\'une nouvelle clé:', newKeyName);
      setNewKeyName("");
      setShowCreateKey(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    // Logique pour supprimer une clé
    console.log('Suppression de la clé:', keyId);
  };

  const handleToggleKeyStatus = (keyId: string) => {
    // Logique pour activer/désactiver une clé
    console.log('Changement de statut de la clé:', keyId);
  };

  return (
    <ErrorBoundary>
      <AuthGuard>
        <UnifiedPageLayout className="page-account">
          {/* Titre de la page avec design uniforme */}
          <UnifiedPageTitle
            icon={User}
            title="Mon Compte"
            subtitle="Gérez votre compte et vos préférences"
          />

          {/* Contenu principal avec blocs glassmorphism espacés */}
          <div className="account-main-container">
            
            {/* Section Profil - Bloc compact */}
            <motion.div 
              className="account-glass-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="account-block-header">
                <div className="account-block-icon">👤</div>
                <div>
                  <h2 className="account-block-title">Profil</h2>
                  <p className="account-block-subtitle">Informations personnelles</p>
                </div>
              </div>
              <div className="account-block-content">
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
              </div>
            </motion.div>

            {/* Section Clés API - Menu dédié */}
            <motion.div 
              className="account-glass-block account-api-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="account-block-header">
                <div className="account-block-icon">🔑</div>
                <div>
                  <h2 className="account-block-title">Clés API</h2>
                  <p className="account-block-subtitle">Gérez vos clés d'accès programmatique</p>
                </div>
                <button 
                  className="account-create-button"
                  onClick={() => setShowCreateKey(!showCreateKey)}
                >
                  ➕ Nouvelle clé
                </button>
              </div>

              {/* Formulaire de création de nouvelle clé */}
              {showCreateKey && (
                <div className="account-create-key-form">
                  <div className="account-field">
                    <label className="account-field-label">Nom de la clé</label>
                    <div className="account-create-input-group">
                      <input 
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Ex: Clé de production, Clé de test..."
                        className="account-field-input"
                      />
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
                  </div>
                </div>
              )}

              {/* Liste des clés API */}
              <div className="account-api-keys-list">
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
                        <h3 className="account-api-key-name">{apiKey.name}</h3>
                        <div className="account-api-key-meta">
                          <span className="account-api-key-date">Créée le {apiKey.createdAt}</span>
                          <span className="account-api-key-last">Dernière utilisation: {apiKey.lastUsed}</span>
                        </div>
                      </div>
                      <div className="account-api-key-status">
                        <div className={`account-status-badge ${apiKey.isActive ? 'active' : 'inactive'}`}>
                          {apiKey.isActive ? '🟢 Actif' : '🔴 Inactif'}
                        </div>
                      </div>
                    </div>

                    <div className="account-api-key-content">
                      <div className="account-api-key-display">
                        <input 
                          type={apiKeyVisible === apiKey.id ? "text" : "password"}
                          value={apiKey.key}
                          className="account-api-key-input"
                          readOnly
                        />
                        <button 
                          type="button"
                          className="account-api-key-toggle"
                          onClick={() => handleToggleKeyVisibility(apiKey.id)}
                        >
                          {apiKeyVisible === apiKey.id ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>

                      <div className="account-api-key-actions">
                        <button 
                          className="account-button-secondary"
                          onClick={() => handleCopyApiKey(apiKey.key, apiKey.id)}
                        >
                          {copied === apiKey.id ? "✅ Copié" : "📋 Copier"}
                        </button>
                        <button 
                          className="account-button-secondary"
                          onClick={() => handleToggleKeyStatus(apiKey.id)}
                        >
                          {apiKey.isActive ? "⏸️ Désactiver" : "▶️ Activer"}
                        </button>
                        <button 
                          className="account-button-danger"
                          onClick={() => handleDeleteKey(apiKey.id)}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Section Préférences - Bloc compact */}
            <motion.div 
              className="account-glass-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="account-block-header">
                <div className="account-block-icon">🎨</div>
                <div>
                  <h2 className="account-block-title">Préférences</h2>
                  <p className="account-block-subtitle">Personnalisez votre expérience</p>
                </div>
              </div>
              <div className="account-block-content">
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
            </motion.div>

            {/* Section Sécurité - Bloc compact */}
            <motion.div 
              className="account-glass-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="account-block-header">
                <div className="account-block-icon">🛡️</div>
                <div>
                  <h2 className="account-block-title">Sécurité</h2>
                  <p className="account-block-subtitle">Gérez la sécurité de votre compte</p>
                </div>
              </div>
              <div className="account-block-content">
                <div className="account-security-actions">
                  <button className="account-button-secondary">
                    🔒 Changer le mot de passe
                  </button>
                  <button className="account-button-secondary">
                    📱 Authentification à deux facteurs
                  </button>
                  <button className="account-button-danger">
                    🗑️ Supprimer le compte
                  </button>
                </div>
              </div>
            </motion.div>

            </div>
        </UnifiedPageLayout>
      </AuthGuard>
    </ErrorBoundary>
  );
} 