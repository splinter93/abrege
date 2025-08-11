/**
 * Page de gestion des agents et templates
 * Interface principale pour configurer et personnaliser les agents
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAgents } from '@/hooks/useAgents';
import AgentTemplateManager from '@/components/agents/AgentTemplateManager';
import { AgentTemplateConfig } from '@/services/llm/agentTemplateService';
import type { Agent } from '@/types/chat';
import './agents.css';

export default function AgentsPage() {
  const { agents, loading, error, updateAgent } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [localConfig, setLocalConfig] = useState<AgentTemplateConfig>({});

  // Mettre à jour la configuration locale quand un agent est sélectionné
  useEffect(() => {
    if (selectedAgent) {
      setLocalConfig({
        system_instructions: selectedAgent.system_instructions,
        context_template: selectedAgent.context_template,
        personality: selectedAgent.personality,
        expertise: selectedAgent.expertise,
        capabilities: selectedAgent.capabilities,
        api_v2_capabilities: selectedAgent.api_v2_capabilities,
        model_variant: selectedAgent.model_variant,
        temperature: selectedAgent.temperature,
        max_completion_tokens: selectedAgent.max_completion_tokens,
        top_p: selectedAgent.top_p,
        stream: selectedAgent.stream,
        reasoning_effort: selectedAgent.reasoning_effort,
        stop_sequences: selectedAgent.stop_sequences
      });
    }
  }, [selectedAgent]);

  // Sauvegarder les changements de configuration
  const handleConfigChange = async (newConfig: AgentTemplateConfig) => {
    if (!selectedAgent) return;

    try {
      // Filtrer seulement les champs qui existent dans la base de données
      const updateData: Partial<Agent> = {
        system_instructions: newConfig.system_instructions,
        context_template: newConfig.context_template,
        personality: newConfig.personality,
        expertise: newConfig.expertise,
        capabilities: newConfig.capabilities,
        api_v2_capabilities: newConfig.api_v2_capabilities,
        temperature: newConfig.temperature,
        top_p: newConfig.top_p
      };

      // Ajouter les champs avancés LLM
      if (newConfig.model_variant) updateData.model_variant = newConfig.model_variant;
      if (newConfig.max_completion_tokens) updateData.max_completion_tokens = newConfig.max_completion_tokens;
      if (newConfig.stream !== undefined) updateData.stream = newConfig.stream;
      if (newConfig.reasoning_effort) updateData.reasoning_effort = newConfig.reasoning_effort;
      if (newConfig.stop_sequences) updateData.stop_sequences = newConfig.stop_sequences;



      console.log('🚀 Appel de updateAgent avec:', { agentId: selectedAgent.id, updateData });
      const updatedAgent = await updateAgent(selectedAgent.id, updateData);
      console.log('🚀 Résultat de updateAgent:', updatedAgent);

      if (updatedAgent) {
        setSelectedAgent(updatedAgent);
        setLocalConfig(newConfig);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'agent:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur de chargement</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agents-page">
      <div className="agents-container">
        {/* En-tête */}
        <div className="agents-header">
          <h1 className="agents-title">
            🤖 Gestion des Agents
          </h1>
          <p className="agents-subtitle">
            Configurez et personnalisez vos agents IA avec des templates avancés
          </p>
        </div>

        <div className="agents-grid">
          {/* Liste des agents */}
          <div className="agents-sidebar">
            <div className="agents-card">
              <h2 className="agents-card-title">
                📋 Agents Disponibles
              </h2>
              
              {agents.length === 0 ? (
                <div className="agent-empty">
                  <div className="agent-empty-icon">🤖</div>
                  <p className="agent-empty-text">Aucun agent configuré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`agent-item ${
                        selectedAgent?.id === agent.id ? 'active' : ''
                      }`}
                    >
                      <div className="agent-item-content">
                        <div className="agent-icon">
                          {agent.profile_picture || '🤖'}
                        </div>
                        <div className="agent-info">
                          <h3 className="agent-name">
                            {agent.name}
                          </h3>
                          <p className="agent-details">
                            {agent.provider} • {agent.model}
                          </p>
                        </div>
                        {agent.is_active && (
                          <div className="agent-status"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Configuration des templates */}
          <div className="agents-main">
            {selectedAgent ? (
              <div className="agent-config">
                <div className="agent-config-header">
                  <h2 className="agent-config-title">
                    ⚙️ Configuration de {selectedAgent.name}
                  </h2>
                  <p className="agent-config-subtitle">
                    Personnalisez le comportement et les paramètres de votre agent
                  </p>
                </div>

                <AgentTemplateManager
                  agentConfig={localConfig}
                  onConfigChange={handleConfigChange}
                  context={{
                    type: 'agent',
                    name: selectedAgent.name,
                    id: selectedAgent.id,
                    content: 'Configuration personnalisée'
                  }}
                />
              </div>
            ) : (
              <div className="agent-config">
                <div className="agent-select-prompt">
                  <div className="agent-select-icon">🎯</div>
                  <h3 className="agent-select-title">
                    Sélectionnez un agent
                  </h3>
                  <p className="agent-select-text">
                    Choisissez un agent dans la liste pour commencer la configuration
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 