/**
 * Composant de gestion des templates d'agents
 * Interface utilisateur pour configurer et personnaliser les agents
 */

'use client';

import React, { useState, useEffect } from 'react';
import { agentTemplateService, AgentTemplateConfig, RenderedTemplate } from '@/services/llm/agentTemplateService';

interface AgentTemplateManagerProps {
  agentConfig: AgentTemplateConfig;
  onConfigChange: (config: AgentTemplateConfig) => void;
  context?: Record<string, any>;
  className?: string;
}

export default function AgentTemplateManager({
  agentConfig,
  onConfigChange,
  context = {},
  className = ''
}: AgentTemplateManagerProps) {
  const [localConfig, setLocalConfig] = useState<AgentTemplateConfig>(agentConfig);
  const [preview, setPreview] = useState<RenderedTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'summary'>('config');

  // Mise à jour de la preview quand la config change
  useEffect(() => {
    const rendered = agentTemplateService.renderAgentTemplate(localConfig, context);
    setPreview(rendered);
  }, [localConfig, context]);

  // Sauvegarde automatique avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onConfigChange(localConfig);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [localConfig, onConfigChange]);

  const handleConfigChange = (field: keyof AgentTemplateConfig, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field: keyof AgentTemplateConfig, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    handleConfigChange(field, arrayValue);
  };

  const resetToDefault = () => {
    setLocalConfig({});
  };

  if (!preview) return <div>Chargement...</div>;

  return (
    <div className={`agent-template-manager ${className}`}>
      {/* Onglets */}
      <div className="tabs-container mb-4">
        <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuration
        </button>
        <button
          className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Aperçu
        </button>
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Résumé
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'config' && (
        <div className="config-tab space-y-4">
          {/* Instructions système */}
          <div className="form-group">
            <label className="form-label">
              🎯 Instructions système
              <span className="text-sm text-gray-500 ml-2">
                (Template principal de l'agent)
              </span>
            </label>
            <textarea
              className="form-textarea"
              value={localConfig.system_instructions || ''}
              onChange={(e) => handleConfigChange('system_instructions', e.target.value)}
              placeholder="Définissez le comportement principal de votre agent..."
              rows={4}
            />
          </div>

          {/* Template contextuel */}
          <div className="form-group">
            <label className="form-label">
              🌍 Template contextuel
              <span className="text-sm text-gray-500 ml-2">
                (Variables: {'{type}'}, {'{name}'}, {'{id}'}, {'{content}'})
              </span>
            </label>
            <textarea
              className="form-textarea"
              value={localConfig.context_template || ''}
              onChange={(e) => handleConfigChange('context_template', e.target.value)}
              placeholder="Template avec variables contextuelles..."
              rows={3}
            />
          </div>

          {/* Personnalité */}
          <div className="form-group">
            <label className="form-label">
              🎭 Personnalité
            </label>
            <textarea
              className="form-textarea"
              value={localConfig.personality || ''}
              onChange={(e) => handleConfigChange('personality', e.target.value)}
              placeholder="Décrivez la personnalité de votre agent..."
              rows={3}
            />
          </div>

          {/* Expertise */}
          <div className="form-group">
            <label className="form-label">
              🧠 Domaines d'expertise
              <span className="text-sm text-gray-500 ml-2">
                (Séparés par des virgules)
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              value={Array.isArray(localConfig.expertise) ? localConfig.expertise.join(', ') : ''}
              onChange={(e) => handleArrayChange('expertise', e.target.value)}
              placeholder="IA, Machine Learning, Développement web..."
            />
          </div>

          {/* Capacités */}
          <div className="form-group">
            <label className="form-label">
              🚀 Capacités spéciales
              <span className="text-sm text-gray-500 ml-2">
                (Séparées par des virgules)
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              value={Array.isArray(localConfig.capabilities) ? localConfig.capabilities.join(', ') : ''}
              onChange={(e) => handleArrayChange('capabilities', e.target.value)}
              placeholder="Analyse de données, Génération de code..."
            />
          </div>

          {/* Capacités API v2 */}
          <div className="form-group">
            <label className="form-label">
              🔧 Capacités API v2
              <span className="text-sm text-gray-500 ml-2">
                (Outils disponibles)
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              value={Array.isArray(localConfig.api_v2_capabilities) ? localConfig.api_v2_capabilities.join(', ') : ''}
              onChange={(e) => handleArrayChange('api_v2_capabilities', e.target.value)}
              placeholder="create_note, list_classeurs, search_notes..."
            />
          </div>

          {/* Paramètres LLM configurables */}
          <div className="llm-params-section border-t pt-4 mt-4">
            <h4 className="text-lg font-medium text-gray-800 mb-3">🤖 Paramètres LLM</h4>
            
            {/* Variante du modèle */}
            <div className="form-group">
              <label className="form-label">
                🎯 Variante du modèle
              </label>
              <select
                className="form-select"
                value={localConfig.model_variant || '120b'}
                onChange={(e) => handleConfigChange('model_variant', e.target.value)}
              >
                <option value="120b">GPT OSS 120B (plus puissant)</option>
                <option value="20b">GPT OSS 20B (plus rapide)</option>
              </select>
            </div>

            {/* Temperature */}
            <div className="form-group">
              <label className="form-label">
                🌡️ Temperature
                <span className="text-sm text-gray-500 ml-2">
                  (0.0 = déterministe, 1.0 = créatif)
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="form-range"
                value={localConfig.temperature || 1.0}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
              />
              <div className="text-sm text-gray-600 text-center">
                {localConfig.temperature || 1.0}
              </div>
            </div>

            {/* Max completion tokens */}
            <div className="form-group">
              <label className="form-label">
                📏 Max tokens de réponse
              </label>
              <input
                type="number"
                min="1"
                max="32768"
                className="form-input"
                value={localConfig.max_completion_tokens || 8192}
                onChange={(e) => handleConfigChange('max_completion_tokens', parseInt(e.target.value))}
                placeholder="8192"
              />
            </div>

            {/* Top P */}
            <div className="form-group">
              <label className="form-label">
                🎲 Top P
                <span className="text-sm text-gray-500 ml-2">
                  (0.0 = focalisé, 1.0 = diversifié)
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                className="form-range"
                value={localConfig.top_p || 1.0}
                onChange={(e) => handleConfigChange('top_p', parseFloat(e.target.value))}
              />
              <div className="text-sm text-gray-600 text-center">
                {localConfig.top_p || 1.0}
              </div>
            </div>

            {/* Stream */}
            <div className="form-group">
              <label className="form-label flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox mr-2"
                  checked={localConfig.stream || false}
                  onChange={(e) => handleConfigChange('stream', e.target.checked)}
                />
                🔄 Streaming des réponses
              </label>
            </div>

            {/* Reasoning effort */}
            <div className="form-group">
              <label className="form-label">
                🧠 Niveau de raisonnement
              </label>
              <select
                className="form-select"
                value={localConfig.reasoning_effort || 'low'}
                onChange={(e) => handleConfigChange('reasoning_effort', e.target.value)}
              >
                <option value="low">Faible (rapide, moins précis)</option>
                <option value="medium">Moyen (équilibré)</option>
                <option value="high">Élevé (lent, plus précis)</option>
              </select>
            </div>

            {/* Stop sequences */}
            <div className="form-group">
              <label className="form-label">
                🛑 Séquences d'arrêt
                <span className="text-sm text-gray-500 ml-2">
                  (Séparées par des virgules)
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                value={Array.isArray(localConfig.stop_sequences) ? localConfig.stop_sequences.join(', ') : ''}
                onChange={(e) => handleArrayChange('stop_sequences', e.target.value)}
                placeholder="END, STOP, [END]..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="actions-container">
            <button
              className="btn btn-secondary"
              onClick={resetToDefault}
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="preview-tab">
          <div className="preview-header mb-4">
            <h3 className="text-lg font-semibold">👁️ Aperçu du template final</h3>
            <p className="text-sm text-gray-600">
              Voici comment votre agent sera configuré
            </p>
          </div>
          
          <div className="template-preview">
            <pre className="preview-content">
              {preview.content}
            </pre>
          </div>

          <div className="preview-stats mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">📊 Statistiques du template</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Caractères:</span>
                <span className="stat-value">{preview.content.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Instructions personnalisées:</span>
                <span className="stat-value">{preview.hasCustomInstructions ? '✅' : '❌'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Template contextuel:</span>
                <span className="stat-value">{preview.hasContextTemplate ? '✅' : '❌'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Personnalité:</span>
                <span className="stat-value">{preview.hasPersonality ? '✅' : '❌'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Expertise:</span>
                <span className="stat-value">{preview.hasExpertise ? '✅' : '❌'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Capacités:</span>
                <span className="stat-value">{preview.hasCapabilities ? '✅' : '❌'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">API v2:</span>
                <span className="stat-value">{preview.hasApiV2Capabilities ? '✅' : '❌'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="summary-tab">
          <div className="summary-header mb-4">
            <h3 className="text-lg font-semibold">📊 Résumé des templates</h3>
            <p className="text-sm text-gray-600">
              Vue d'ensemble de la configuration de votre agent
            </p>
          </div>
          
          <div className="summary-content">
            <pre className="summary-text">
              {agentTemplateService.generateTemplateSummary(localConfig)}
            </pre>
          </div>

          <div className="summary-actions mt-4">
            <button
              className="btn btn-primary"
              onClick={() => {
                navigator.clipboard.writeText(agentTemplateService.generateTemplateSummary(localConfig));
              }}
            >
              📋 Copier le résumé
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 