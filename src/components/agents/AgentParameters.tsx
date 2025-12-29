import React, { useState } from 'react';
import { Plus, X, Info } from 'lucide-react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { GROQ_MODELS_BY_CATEGORY, getModelInfo } from '@/constants/groqModels';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import type { AgentSchemaLink, OpenApiSchema } from '@/hooks/useOpenApiSchemas';
import type { AgentCallableLink, CallableListItem } from '@/hooks/useCallables';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

interface AgentParametersProps {
  selectedAgent: SpecializedAgentConfig | null;
  editedAgent: Partial<SpecializedAgentConfig> | null;
  loadingDetails: boolean;
  openApiSchemas: OpenApiSchema[];
  agentOpenApiSchemas: AgentSchemaLink[];
  openApiLoading: boolean;
  mcpServers: McpServer[];
  agentMcpServers: AgentMcpServerWithDetails[];
  mcpLoading: boolean;
  availableCallables?: CallableListItem[];
  agentCallables?: AgentCallableLink[];
  callablesLoading?: boolean;
  onLinkSchema: (agentId: string, schemaId: string) => Promise<void>;
  onUnlinkSchema: (agentId: string, schemaId: string) => Promise<void>;
  onLinkServer: (agentId: string, serverId: string) => Promise<boolean>;
  onUnlinkServer: (agentId: string, serverId: string) => Promise<boolean>;
  onLinkCallable?: (agentId: string, callableId: string) => Promise<boolean>;
  onUnlinkCallable?: (agentId: string, callableId: string) => Promise<boolean>;
  isSchemaLinked: (schemaId: string) => boolean;
  isServerLinked: (serverId: string) => boolean;
  isCallableLinked?: (callableId: string) => boolean;
  onUpdateField: <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => void;
}

export function AgentParameters({
  selectedAgent,
  editedAgent,
  loadingDetails,
  openApiSchemas,
  agentOpenApiSchemas,
  openApiLoading,
  mcpServers,
  agentMcpServers,
  mcpLoading,
  availableCallables = [],
  agentCallables = [],
  callablesLoading = false,
  onLinkSchema,
  onUnlinkSchema,
  onLinkServer,
  onUnlinkServer,
  onLinkCallable,
  onUnlinkCallable,
  isSchemaLinked,
  isServerLinked,
  isCallableLinked = () => false,
  onUpdateField,
}: AgentParametersProps) {
  const [showOpenApiDropdown, setShowOpenApiDropdown] = useState(false);
  const [showMcpDropdown, setShowMcpDropdown] = useState(false);
  const [showCallablesDropdown, setShowCallablesDropdown] = useState(false);

  if (loadingDetails) {
    return (
      <div className="agent-settings-panel agent-params-panel">
        <SimpleLoadingState message="Chargement des réglages" />
      </div>
    );
  }

  if (!selectedAgent || !editedAgent) {
    return (
      <div className="agent-settings-panel agent-params-panel">
        <div className="agent-modal-state agent-modal-state--empty">
          <div className="agent-modal-state__icon">🤖</div>
          <h3>Sélectionnez un agent</h3>
          <p>Choisissez un agent pour accéder aux réglages avancés.</p>
        </div>
      </div>
    );
  }

  const handleLinkSchema = async (schemaId: string) => {
    await onLinkSchema(selectedAgent.id, schemaId);
    setShowOpenApiDropdown(false);
  };

  const handleUnlinkSchema = async (schemaId: string) => {
    await onUnlinkSchema(selectedAgent.id, schemaId);
  };

  const handleLinkServer = async (serverId: string) => {
    const linked = await onLinkServer(selectedAgent.id, serverId);
    if (linked) {
      setShowMcpDropdown(false);
    }
  };

  const handleUnlinkServer = async (serverId: string) => {
    await onUnlinkServer(selectedAgent.id, serverId);
  };

  const handleLinkCallable = async (callableId: string) => {
    if (!onLinkCallable || !selectedAgent) return;
    const linked = await onLinkCallable(selectedAgent.id, callableId);
    if (linked) {
      setShowCallablesDropdown(false);
    }
  };

  const handleUnlinkCallable = async (callableId: string) => {
    if (!onUnlinkCallable || !selectedAgent) return;
    await onUnlinkCallable(selectedAgent.id, callableId);
  };

  const modelInfo = editedAgent.model ? getModelInfo(editedAgent.model) : null;

  return (
    <div className="agent-settings-panel agent-params-panel">
      <div className="agent-params">
        <section className="agent-params-card agent-params-card--model">
          <div className="agent-params-card__header">
            <h3>Modèle LLM</h3>
          </div>
          <div className="agent-params-card__body">
            <label className="visually-hidden" htmlFor="agent-model">
              Modèle LLM
            </label>
            <div className="agent-params-select">
              <select
                id="agent-model"
                className="field-select"
                value={editedAgent.model || ''}
                onChange={event => onUpdateField('model', event.target.value)}
              >
                {!editedAgent.model && <option value="">-- Choisissez un modèle --</option>}
                {Object.entries(GROQ_MODELS_BY_CATEGORY).map(([category, models]) => (
                  <optgroup key={category} label={category}>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.recommended ? '⭐' : ''} • {model.speed} TPS
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {modelInfo && (
                <button
                  type="button"
                  className="agent-select-info"
                  title={`${modelInfo.description}\nTarifs : ${modelInfo.pricing.input} input / ${modelInfo.pricing.output} output\nVitesses : ${modelInfo.speed} TPS`}
                >
                  <Info size={16} />
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="agent-params-card">
          <div className="agent-params-card__header">
            <h3>Réglages principaux</h3>
          </div>
          <div className="agent-params-card__body agent-params-grid">
            <div className="agent-params-field">
              <div className="agent-params-field__label">
                <span>Température</span>
                <span className="agent-params-field__value">{(editedAgent.temperature ?? 0).toFixed(1)}</span>
              </div>
              <input
                id="agent-temperature"
                type="range"
                className="field-range"
                min="0"
                max="2"
                step="0.1"
                value={editedAgent.temperature ?? 0}
                onChange={event => onUpdateField('temperature', parseFloat(event.target.value))}
              />
            </div>

            <div className="agent-params-field">
              <div className="agent-params-field__label">
                <span>Top P</span>
                <span className="agent-params-field__value">{(editedAgent.top_p ?? 1).toFixed(2)}</span>
              </div>
              <input
                id="agent-top-p"
                type="range"
                className="field-range"
                min="0"
                max="1"
                step="0.05"
                value={editedAgent.top_p ?? 1}
                onChange={event => onUpdateField('top_p', parseFloat(event.target.value))}
              />
            </div>

            <div className="agent-params-field">
              <div className="agent-params-field__label">
                <span>Max tokens</span>
                <span className="agent-params-field__value">{editedAgent.max_tokens ?? 0}</span>
              </div>
              <input
                id="agent-max-tokens"
                type="range"
                className="field-range"
                min="1"
                max="100000"
                step="100"
                value={editedAgent.max_tokens ?? 0}
                onChange={event => onUpdateField('max_tokens', parseInt(event.target.value, 10))}
              />
            </div>
          </div>
        </section>

        <section className="agent-params-card">
          <div className="agent-params-card__header">
            <h3>OpenAPI Tools</h3>
            <div className="agent-params-card__actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowOpenApiDropdown(value => !value)}
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>
          </div>

          <div className="agent-params-card__body">
            {showOpenApiDropdown && openApiSchemas.length > 0 && (
              <div className="agent-params-dropdown">
                {openApiSchemas
                  .filter(schema => !isSchemaLinked(schema.id))
                  .map(schema => (
                    <button
                      key={schema.id}
                      type="button"
                      className="agent-params-dropdown__item agent-params-dropdown__item--compact"
                      onClick={() => handleLinkSchema(schema.id)}
                    >
                      <div className="agent-params-dropdown__name">{schema.name}</div>
                    </button>
                  ))}
                {openApiSchemas.filter(schema => !isSchemaLinked(schema.id)).length === 0 && (
                  <div className="agent-params-dropdown__empty">
                    Tous les schémas disponibles sont déjà liés
                  </div>
                )}
              </div>
            )}

            {openApiLoading ? (
              <div className="agent-params-state">
                <div className="loading-spinner" />
                <p>Chargement des schémas disponibles…</p>
              </div>
            ) : agentOpenApiSchemas.length === 0 ? (
              <div className="agent-params-empty">
                <p>Aucun schéma OpenAPI lié pour cet agent.</p>
              </div>
            ) : (
              <div className="agent-params-list">
                {agentOpenApiSchemas.map(schema => (
                  <div key={schema.id} className="agent-params-list__item">
                    <div className="agent-params-list__content">
                      <div className="agent-params-list__title">{schema.openapi_schema?.name ?? schema.openapi_schema_id}</div>
                    </div>
                    <button
                      type="button"
                      className="agent-params-list__remove"
                      onClick={() => handleUnlinkSchema(schema.openapi_schema_id)}
                      title="Retirer ce schéma"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </section>
        )}

        <section className="agent-params-card">
          <div className="agent-params-card__header">
            <h3>MCP Tools</h3>
            <div className="agent-params-card__actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowMcpDropdown(value => !value)}
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>
          </div>

          <div className="agent-params-card__body">
            {showMcpDropdown && mcpServers.length > 0 && (
              <div className="agent-params-dropdown">
                {mcpServers
                  .filter(server => !isServerLinked(server.id))
                  .map(server => (
                    <button
                      key={server.id}
                      type="button"
                      className="agent-params-dropdown__item agent-params-dropdown__item--compact"
                      onClick={() => handleLinkServer(server.id)}
                    >
                      <div className="agent-params-dropdown__name">{server.name}</div>
                    </button>
                  ))}
                {mcpServers.filter(server => !isServerLinked(server.id)).length === 0 && (
                  <div className="agent-params-dropdown__empty">
                    Tous les serveurs disponibles sont déjà liés
                  </div>
                )}
              </div>
            )}

            {mcpLoading ? (
              <div className="agent-params-state">
                <div className="loading-spinner" />
                <p>Chargement des serveurs MCP…</p>
              </div>
            ) : agentMcpServers.length === 0 ? (
              <div className="agent-params-empty">
                <p>Aucun serveur MCP n&apos;est actuellement lié.</p>
              </div>
            ) : (
              <div className="agent-params-list">
                {agentMcpServers.map(link => (
                  <div key={link.id} className="agent-params-list__item">
                    <div className="agent-params-list__content">
                      <div className="agent-params-list__title">{link.mcp_server.name}</div>
                    </div>
                    <button
                      className="agent-params-list__remove"
                      type="button"
                      onClick={() => handleUnlinkServer(link.mcp_server_id)}
                      title="Retirer ce serveur"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {onLinkCallable && onUnlinkCallable && (
          <section className="agent-params-card">
            <div className="agent-params-card__header">
              <h3>Callables Synesia</h3>
              <div className="agent-params-card__actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowCallablesDropdown(value => !value)}
                >
                  <Plus size={16} />
                  Ajouter
                </button>
              </div>
            </div>

          <div className="agent-params-card__body">
            {showCallablesDropdown && availableCallables.length > 0 && (
              <div className="agent-params-dropdown">
                {availableCallables
                  .filter(callable => !isCallableLinked(callable.id))
                  .map(callable => (
                    <button
                      key={callable.id}
                      type="button"
                      className="agent-params-dropdown__item agent-params-dropdown__item--compact"
                      onClick={() => handleLinkCallable(callable.id)}
                    >
                      <div className="agent-params-dropdown__name">
                        {callable.name}
                        {callable.type && (
                          <span className="agent-params-dropdown__badge">
                            {callable.type}
                          </span>
                        )}
                      </div>
                      {callable.description && (
                        <div className="agent-params-dropdown__description">
                          {callable.description}
                        </div>
                      )}
                    </button>
                  ))}
                {availableCallables.filter(callable => !isCallableLinked(callable.id)).length === 0 && (
                  <div className="agent-params-dropdown__empty">
                    Tous les callables disponibles sont déjà liés
                  </div>
                )}
              </div>
            )}

            {callablesLoading ? (
              <div className="agent-params-state">
                <div className="loading-spinner" />
                <p>Chargement des callables…</p>
              </div>
            ) : agentCallables.length === 0 ? (
              <div className="agent-params-empty">
                <p>Aucun callable n&apos;est actuellement lié.</p>
              </div>
            ) : (
              <div className="agent-params-list">
                {agentCallables.map(link => (
                  <div key={link.id} className="agent-params-list__item">
                    <div className="agent-params-list__content">
                      <div className="agent-params-list__title">
                        {link.synesia_callable.name}
                        {link.synesia_callable.type && (
                          <span className="agent-params-list__badge">
                            {link.synesia_callable.type}
                          </span>
                        )}
                      </div>
                      {link.synesia_callable.description && (
                        <div className="agent-params-list__description">
                          {link.synesia_callable.description}
                        </div>
                      )}
                    </div>
                    <button
                      className="agent-params-list__remove"
                      type="button"
                      onClick={() => handleUnlinkCallable(link.callable_id)}
                      title="Retirer ce callable"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="agent-params-card">
          <div className="agent-params-card__header">
            <h3>Réglages avancés</h3>
          </div>
          <div className="agent-params-card__body agent-params-grid agent-params-grid--state">
            <div className="agent-params-field">
              <label className="field-label" htmlFor="agent-priority">
                Priorité
              </label>
              <input
                id="agent-priority"
                type="number"
                className="field-input"
                value={editedAgent.priority ?? 0}
                onChange={event => onUpdateField('priority', parseInt(event.target.value, 10))}
              />
            </div>

            <div className="agent-params-field agent-params-field--readonly">
              <label className="field-label" htmlFor="agent-version">
                Version
              </label>
              <p className="field-value field-readonly" id="agent-version">
                {selectedAgent.version || '1.0.0'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AgentParameters;
