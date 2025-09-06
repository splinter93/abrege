/**
 * Composant de test optimisé pour les agents spécialisés
 * Version refactorisée avec composants plus petits et types stricts
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import { SpecializedAgentConfig, CreateSpecializedAgentRequest } from '@/types/specializedAgents';

// Types pour les props et états
interface AgentTestFormData {
  slug: string;
  display_name: string;
  description: string;
  model: string;
  system_instructions: string;
  input_schema: string;
  output_schema: string;
  temperature: number;
  max_tokens: number;
}

interface AgentExecutionState {
  loading: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}

// Composant principal optimisé
export const SpecializedAgentsTestOptimized: React.FC = () => {
  const { agents, loading, error, executeAgent, createAgent } = useSpecializedAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [testInput, setTestInput] = useState<string>('{"query": "Test message"}');
  const [executionState, setExecutionState] = useState<AgentExecutionState>({
    loading: false,
    result: null,
    error: null
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Gestionnaire d'exécution d'agent
  const handleExecuteAgent = useCallback(async () => {
    if (!selectedAgent || !testInput) return;

    setExecutionState({ loading: true, result: null, error: null });

    try {
      const input = JSON.parse(testInput);
      const result = await executeAgent(selectedAgent, input);
      
      setExecutionState({
        loading: false,
        result: result.result || null,
        error: result.error || null
      });
    } catch (err) {
      setExecutionState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      });
    }
  }, [selectedAgent, testInput, executeAgent]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test des Agents Spécialisés</h1>
      
      {/* Liste des agents */}
      <AgentList 
        agents={agents}
        loading={loading}
        error={error}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {/* Interface de test */}
      {selectedAgent && (
        <AgentTestInterface
          agentId={selectedAgent}
          testInput={testInput}
          onInputChange={setTestInput}
          executionState={executionState}
          onExecute={handleExecuteAgent}
        />
      )}

      {/* Formulaire de création */}
      <CreateAgentForm
        show={showCreateForm}
        onToggle={() => setShowCreateForm(!showCreateForm)}
        onCreateAgent={createAgent}
      />
    </div>
  );
};

// Composant de liste des agents
interface AgentListProps {
  agents: SpecializedAgentConfig[];
  loading: boolean;
  error: string | null;
  selectedAgent: string;
  onSelectAgent: (agentId: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ 
  agents, 
  loading, 
  error, 
  selectedAgent, 
  onSelectAgent 
}) => {
  if (loading) return <div className="text-center py-4">Chargement des agents...</div>;
  if (error) return <div className="text-red-500 py-4">Erreur: {error}</div>;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Agents Disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent === agent.id}
            onSelect={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Composant de carte d'agent
interface AgentCardProps {
  agent: SpecializedAgentConfig;
  isSelected: boolean;
  onSelect: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onSelect }) => {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <h3 className="font-medium text-lg">{agent.display_name || agent.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
      <div className="text-xs text-gray-500">
        <div>Modèle: {agent.model}</div>
        <div>Slug: {agent.slug}</div>
        <div>Type: {agent.is_endpoint_agent ? 'Endpoint' : 'Chat'}</div>
      </div>
    </div>
  );
};

// Interface de test d'agent
interface AgentTestInterfaceProps {
  agentId: string;
  testInput: string;
  onInputChange: (input: string) => void;
  executionState: AgentExecutionState;
  onExecute: () => void;
}

const AgentTestInterface: React.FC<AgentTestInterfaceProps> = ({
  agentId,
  testInput,
  onInputChange,
  executionState,
  onExecute
}) => {
  return (
    <div className="mb-6 p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Test de l'Agent: {agentId}</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Entrée JSON:
          </label>
          <textarea
            className="w-full p-3 border rounded-md font-mono text-sm"
            rows={6}
            value={testInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder='{"query": "Votre message de test"}'
          />
        </div>

        <button
          onClick={onExecute}
          disabled={executionState.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {executionState.loading ? 'Exécution...' : 'Exécuter l\'agent'}
        </button>

        {executionState.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800">Erreur:</h4>
            <p className="text-red-600">{executionState.error}</p>
          </div>
        )}

        {executionState.result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800">Résultat:</h4>
            <pre className="text-green-600 text-sm overflow-auto">
              {JSON.stringify(executionState.result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Formulaire de création d'agent
interface CreateAgentFormProps {
  show: boolean;
  onToggle: () => void;
  onCreateAgent: (config: CreateSpecializedAgentRequest) => Promise<void>;
}

const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ show, onToggle, onCreateAgent }) => {
  const [formData, setFormData] = useState<AgentTestFormData>({
    slug: '',
    display_name: '',
    description: '',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    system_instructions: '',
    input_schema: '{"type": "object", "properties": {"input": {"type": "string"}}}',
    output_schema: '{"type": "object", "properties": {"result": {"type": "string"}}}',
    temperature: 0.7,
    max_tokens: 4000
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const config: CreateSpecializedAgentRequest = {
        ...formData,
        input_schema: JSON.parse(formData.input_schema),
        output_schema: JSON.parse(formData.output_schema)
      };
      
      await onCreateAgent(config);
      onToggle();
    } catch (error) {
      console.error('Erreur création agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={onToggle}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
      >
        Créer un nouvel agent
      </button>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">Créer un Agent Spécialisé</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Slug:</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value})}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nom d'affichage:</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-2 border rounded-md"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Modèle:</label>
          <select
            value={formData.model}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
            className="w-full p-2 border rounded-md"
          >
            <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout</option>
            <option value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instructions système:</label>
          <textarea
            value={formData.system_instructions}
            onChange={(e) => setFormData({...formData, system_instructions: e.target.value})}
            className="w-full p-2 border rounded-md"
            rows={3}
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Création...' : 'Créer l\'agent'}
          </button>
          
          <button
            type="button"
            onClick={onToggle}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpecializedAgentsTestOptimized;
