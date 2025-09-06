/**
 * Composant de test pour les agents spécialisés
 * Interface utilisateur pour tester et valider le système
 */

'use client';

import React, { useState } from 'react';
import { useSpecializedAgents, useAgentExecution } from '@/hooks/useSpecializedAgents';
import { CreateSpecializedAgentRequest } from '@/types/specializedAgents';

export const SpecializedAgentsTest: React.FC = () => {
  const { agents, loading, error, executeAgent, createAgent } = useSpecializedAgents();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [testInput, setTestInput] = useState<string>('{"query": "Test message"}');
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Hook pour l'exécution d'agent
  const agentExecution = useAgentExecution(selectedAgent);

  const handleExecuteAgent = async () => {
    if (!selectedAgent) return;

    try {
      const input = JSON.parse(testInput);
      const result = await executeAgent(selectedAgent, input);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Input JSON invalide'
      });
    }
  };

  const handleCreateAgent = async (formData: CreateSpecializedAgentRequest) => {
    const result = await createAgent(formData);
    if (result.success) {
      setShowCreateForm(false);
      alert(`Agent créé avec succès ! Endpoint: ${result.endpoint}`);
    } else {
      alert(`Erreur: ${result.error}`);
    }
  };

  return (
    <div className="specialized-agents-test">
      <h2>Test des Agents Spécialisés</h2>

      {error && (
        <div className="error-message">
          <strong>Erreur:</strong> {error}
        </div>
      )}

      <div className="test-section">
        <h3>1. Liste des Agents</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="agents-list">
            {agents.length === 0 ? (
              <p>Aucun agent spécialisé trouvé</p>
            ) : (
              agents.map(agent => (
                <div key={agent.id} className="agent-card">
                  <h4>{agent.display_name} ({agent.slug})</h4>
                  <p><strong>Modèle:</strong> {agent.model}</p>
                  <p><strong>Description:</strong> {agent.description}</p>
                  <p><strong>Endpoint:</strong> /api/v2/agents/{agent.slug}</p>
                  <button 
                    onClick={() => setSelectedAgent(agent.slug || '')}
                    className={selectedAgent === agent.slug ? 'selected' : ''}
                  >
                    Sélectionner
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="test-section">
        <h3>2. Test d'Exécution</h3>
        {selectedAgent ? (
          <div className="execution-test">
            <p><strong>Agent sélectionné:</strong> {selectedAgent}</p>
            
            <div className="input-section">
              <label htmlFor="test-input">Input JSON:</label>
              <textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={4}
                placeholder='{"query": "Test message"}'
              />
            </div>

            <button onClick={handleExecuteAgent} disabled={agentExecution.loading}>
              {agentExecution.loading ? 'Exécution...' : 'Exécuter l\'agent'}
            </button>

            {testResult && (
              <div className="result-section">
                <h4>Résultat:</h4>
                <div className={`result ${testResult.success ? 'success' : 'error'}`}>
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Sélectionnez un agent pour le tester</p>
        )}
      </div>

      <div className="test-section">
        <h3>3. Création d'Agent</h3>
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Annuler' : 'Créer un nouvel agent'}
        </button>

        {showCreateForm && (
          <CreateAgentForm onSubmit={handleCreateAgent} />
        )}
      </div>

      <div className="test-section">
        <h3>4. Endpoints Disponibles</h3>
        <div className="endpoints-list">
          <div className="endpoint">
            <strong>GET</strong> /api/v2/openapi-schema
            <p>Schéma OpenAPI complet avec les agents spécialisés</p>
          </div>
          <div className="endpoint">
            <strong>GET</strong> /api/ui/agents/specialized
            <p>Liste des agents spécialisés</p>
          </div>
          <div className="endpoint">
            <strong>POST</strong> /api/ui/agents/specialized
            <p>Créer un agent spécialisé</p>
          </div>
          {agents.map(agent => (
            <div key={agent.id} className="endpoint">
              <strong>POST</strong> /api/v2/agents/{agent.slug}
              <p>Exécuter l'agent {agent.display_name}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .specialized-agents-test {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .test-section {
          margin: 30px 0;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .agents-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }

        .agent-card {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .agent-card h4 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }

        .agent-card p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }

        .agent-card button {
          background: #1976d2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }

        .agent-card button.selected {
          background: #388e3c;
        }

        .execution-test {
          background: white;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .input-section {
          margin: 15px 0;
        }

        .input-section label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .input-section textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 14px;
        }

        .result-section {
          margin: 20px 0;
        }

        .result {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          border-left: 4px solid #ddd;
        }

        .result.success {
          border-left-color: #4caf50;
        }

        .result.error {
          border-left-color: #f44336;
        }

        .result pre {
          margin: 0;
          white-space: pre-wrap;
          font-size: 12px;
        }

        .endpoints-list {
          display: grid;
          gap: 10px;
        }

        .endpoint {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .endpoint strong {
          color: #1976d2;
          margin-right: 10px;
        }

        .endpoint p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }

        button {
          background: #1976d2;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        button:hover {
          background: #1565c0;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

interface CreateAgentFormProps {
  onSubmit: (config: CreateSpecializedAgentRequest) => void;
}

const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<CreateSpecializedAgentRequest>({
    slug: '',
    display_name: '',
    description: '',
    model: 'deepseek-chat',
    system_instructions: '',
    input_schema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input de l\'agent' }
      },
      required: ['input']
    },
    output_schema: {
      type: 'object',
      properties: {
        result: { type: 'string', description: 'Résultat de l\'agent' }
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="create-agent-form">
      <div className="form-group">
        <label>Slug (identifiant unique):</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({...formData, slug: e.target.value})}
          placeholder="ex: mon-agent"
          required
        />
      </div>

      <div className="form-group">
        <label>Nom d'affichage:</label>
        <input
          type="text"
          value={formData.display_name}
          onChange={(e) => setFormData({...formData, display_name: e.target.value})}
          placeholder="ex: Mon Agent"
          required
        />
      </div>

      <div className="form-group">
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Description de l'agent"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Modèle LLM:</label>
        <select
          value={formData.model}
          onChange={(e) => setFormData({...formData, model: e.target.value})}
        >
          <optgroup label="Llama 4 (Groq)">
            <option value="meta-llama/llama-4-maverick-17b-128e-instruct">
              Llama 4 Maverick 17B (Multimodal - 128 experts)
            </option>
            <option value="meta-llama/llama-4-scout-17b-16e-instruct">
              Llama 4 Scout 17B (Multimodal - 16 experts)
            </option>
          </optgroup>
          <optgroup label="DeepSeek">
            <option value="deepseek-chat">DeepSeek Chat</option>
            <option value="deepseek-vision">DeepSeek Vision</option>
          </optgroup>
          <optgroup label="Autres">
            <option value="gpt-4">GPT-4</option>
            <option value="claude-3">Claude 3</option>
          </optgroup>
        </select>
      </div>

      <div className="form-group">
        <label>Instructions système:</label>
        <textarea
          value={formData.system_instructions}
          onChange={(e) => setFormData({...formData, system_instructions: e.target.value})}
          placeholder="Instructions pour l'agent"
          rows={4}
          required
        />
      </div>

      <button type="submit">Créer l'agent</button>

      <style jsx>{`
        .create-agent-form {
          background: white;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #ddd;
          margin: 15px 0;
        }

        .form-group {
          margin: 15px 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group textarea {
          resize: vertical;
        }
      `}</style>
    </form>
  );
};
