/**
 * Composant de démonstration du système de templates d'agents
 * Permet de tester et valider le fonctionnement des templates
 */

'use client';

import React, { useState } from 'react';
import AgentTemplateManager from './AgentTemplateManager';
import { agentTemplateService, AgentTemplateConfig } from '@/services/llm/agentTemplateService';

export default function AgentTemplateDemo() {
  const [agentConfig, setAgentConfig] = useState<AgentTemplateConfig>({
    system_instructions: 'Tu es un assistant spécialisé dans la gestion de notes et d\'organisation personnelle.',
    context_template: 'Contexte: {type} - {name} (ID: {id})\nContenu: {content}',
    personality: 'Tu es organisé, méthodique et toujours prêt à aider avec des conseils pratiques.',
    expertise: ['Organisation personnelle', 'Gestion de notes', 'Productivité'],
    capabilities: ['Création de notes', 'Organisation de classeurs', 'Recherche intelligente'],
    api_v2_capabilities: ['create_note', 'list_classeurs', 'search_notes'],
    // Nouveaux paramètres LLM configurables
    model_variant: '120b',
    temperature: 1.0,
    max_completion_tokens: 8192,
    top_p: 1.0,
    stream: false,
    reasoning_effort: 'low',
    stop_sequences: []
  });

  const [testContext, setTestContext] = useState({
    type: 'note',
    name: 'Note de travail',
    id: '12345',
    content: 'Contenu de la note de démonstration'
  });

  const [renderedTemplate, setRenderedTemplate] = useState<string>('');

  const handleConfigChange = (newConfig: AgentTemplateConfig) => {
    setAgentConfig(newConfig);
    // Mettre à jour le template rendu
    const rendered = agentTemplateService.renderAgentTemplate(newConfig, testContext);
    setRenderedTemplate(rendered.content);
  };

  const handleContextChange = (field: string, value: string) => {
    setTestContext(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testTemplate = () => {
    const rendered = agentTemplateService.renderAgentTemplate(agentConfig, testContext);
    setRenderedTemplate(rendered.content);
  };

  return (
    <div className="agent-template-demo p-6 max-w-6xl mx-auto">
      <div className="demo-header mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎯 Démonstration du Système de Templates d'Agents
        </h1>
        <p className="text-lg text-gray-600">
          Testez et configurez vos agents avec des templates personnalisés
        </p>
      </div>

      <div className="demo-grid grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration des templates */}
        <div className="config-section">
          <div className="section-header mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              ⚙️ Configuration des Templates
            </h2>
            <p className="text-sm text-gray-600">
              Personnalisez le comportement de votre agent
            </p>
          </div>
          
          <AgentTemplateManager
            agentConfig={agentConfig}
            onConfigChange={handleConfigChange}
            context={testContext}
            className="border rounded-lg p-4 bg-white shadow-sm"
          />
        </div>

        {/* Test et preview */}
        <div className="test-section space-y-6">
          {/* Contexte de test */}
          <div className="context-tester border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              🧪 Contexte de Test
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={testContext.type}
                  onChange={(e) => handleContextChange('type', e.target.value)}
                  placeholder="note, classeur, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={testContext.name}
                  onChange={(e) => handleContextChange('name', e.target.value)}
                  placeholder="Nom de l'élément"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={testContext.id}
                  onChange={(e) => handleContextChange('id', e.target.value)}
                  placeholder="Identifiant unique"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenu
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={testContext.content}
                  onChange={(e) => handleContextChange('content', e.target.value)}
                  placeholder="Contenu de l'élément"
                  rows={3}
                />
              </div>
              
              <button
                onClick={testTemplate}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                🚀 Tester le Template
              </button>
            </div>
          </div>

          {/* Résultat du template */}
          <div className="template-result border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              📋 Résultat du Template
            </h3>
            
            {renderedTemplate ? (
              <div className="result-content">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64 text-sm font-mono whitespace-pre-wrap">
                  {renderedTemplate}
                </pre>
                
                <div className="result-stats mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Caractères:</span> {renderedTemplate.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Lignes:</span> {renderedTemplate.split('\n').length}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Cliquez sur "Tester le Template" pour voir le résultat
              </div>
            )}
          </div>

          {/* Résumé des capacités */}
          <div className="capabilities-summary border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              🔧 Résumé des Capacités
            </h3>
            
            <div className="capabilities-list space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-sm text-gray-700">
                  Instructions système: {agentConfig.system_instructions ? 'Configuré' : 'Par défaut'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.context_template ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.context_template ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Template contextuel: {agentConfig.context_template ? 'Configuré' : 'Non configuré'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.personality ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.personality ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Personnalité: {agentConfig.personality ? 'Configurée' : 'Non configurée'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.expertise?.length ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.expertise?.length ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Expertise: {agentConfig.expertise?.length || 0} domaines
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.api_v2_capabilities?.length ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.api_v2_capabilities?.length ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  API v2: {agentConfig.api_v2_capabilities?.length || 0} outils
                </span>
              </div>
              
              {/* Nouveaux paramètres LLM */}
              <div className="flex items-center space-x-2">
                <span className={agentConfig.model_variant ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.model_variant ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Modèle: {agentConfig.model_variant || 'Non configuré'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.temperature !== undefined ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.temperature !== undefined ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Temperature: {agentConfig.temperature || 'Non configurée'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={agentConfig.reasoning_effort ? 'text-green-500' : 'text-gray-400'}>
                  {agentConfig.reasoning_effort ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">
                  Raisonnement: {agentConfig.reasoning_effort || 'Non configuré'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions d'utilisation */}
      <div className="usage-instructions mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800 mb-3">
          📚 Comment utiliser ce système
        </h3>
        
        <div className="instructions-list space-y-2 text-sm text-blue-700">
          <div>1. <strong>Configurez les templates</strong> dans l'onglet Configuration</div>
          <div>2. <strong>Testez le contexte</strong> en modifiant les variables de test</div>
          <div>3. <strong>Vérifiez le résultat</strong> dans l'aperçu du template</div>
          <div>4. <strong>Personnalisez</strong> selon vos besoins spécifiques</div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Astuce:</strong> Les templates contextuels utilisent des variables comme 
            <code className="bg-blue-200 px-1 rounded">{'{type}'}</code>, 
            <code className="bg-blue-200 px-1 rounded">{'{name}'}</code>, 
            <code className="bg-blue-200 px-1 rounded">{'{id}'}</code> et 
            <code className="bg-blue-200 px-1 rounded">{'{content}'}</code>
          </p>
        </div>
      </div>
    </div>
  );
} 