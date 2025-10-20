"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { useSpecializedAgents } from "@/hooks/useSpecializedAgents";
import { useMcpServers } from "@/hooks/useMcpServers";
import { useOpenApiSchemas } from "@/hooks/useOpenApiSchemas";
import { SpecializedAgentConfig } from "@/types/specializedAgents";
import { GROQ_MODELS_BY_CATEGORY, getModelInfo } from "@/constants/groqModels";
import { Bot, Trash2, Save, X, ExternalLink, Plus, ChevronDown, ChevronUp, FileText, CheckCircle } from "lucide-react";
import "@/styles/main.css";
import "./agents.css";

/**
 * Page de gestion des agents spécialisés
 */
export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <AgentsPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

/**
 * Contenu de la page (séparé pour AuthGuard)
 */
function AgentsPageContent() {
  const {
    agents,
    loading,
    error,
    selectedAgent,
    selectAgent,
    getAgent,
    updateAgent,
    patchAgent,
    deleteAgent,
    loadAgents,
  } = useSpecializedAgents();

  const {
    allServers: mcpServers,
    agentServers: agentMcpServers,
    loading: mcpLoading,
    linkServer,
    unlinkServer,
    isServerLinked,
    loadAgentServers: reloadAgentMcpServers,
  } = useMcpServers(selectedAgent?.id);

  const {
    allSchemas: openApiSchemas,
    agentSchemas: agentOpenApiSchemas,
    loading: openApiLoading,
    linkSchema,
    unlinkSchema,
    isSchemaLinked,
    loadAgentSchemas: reloadAgentSchemas,
  } = useOpenApiSchemas(selectedAgent?.id);

  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showMcpDropdown, setShowMcpDropdown] = useState(false);
  const [showOpenApiDropdown, setShowOpenApiDropdown] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  
  // Ref pour suivre si la sélection initiale a été faite
  const initialSelectionDone = useRef(false);

  /**
   * Synchronise editedAgent quand selectedAgent change (ex: après une mise à jour)
   */
  useEffect(() => {
    if (selectedAgent && !hasChanges) {
      setEditedAgent({ ...selectedAgent });
    }
  }, [selectedAgent, hasChanges]);

  /**
   * Sélectionne automatiquement le premier agent au chargement (une seule fois)
   */
  useEffect(() => {
    if (!loading && agents.length > 0 && !selectedAgent && !initialSelectionDone.current) {
      initialSelectionDone.current = true;
      handleSelectAgent(agents[0]);
    }
  }, [loading, agents.length, selectedAgent]);


  /**
   * Sélectionne un agent et charge ses détails complets
   */
  const handleSelectAgent = async (agent: SpecializedAgentConfig) => {
    setHasChanges(false);
    setLoadingDetails(true);
    
    try {
      // Charger les détails complets de l'agent (incluant system_instructions)
      const agentId = agent.slug || agent.id;
      const fullAgent = await getAgent(agentId);
      
      if (fullAgent) {
        selectAgent(fullAgent); // Mettre à jour avec les détails complets
        setEditedAgent({ ...fullAgent });
      } else {
        selectAgent(agent);
        setEditedAgent({ ...agent });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * Annule les modifications
   */
  const handleCancelEdit = () => {
    if (!selectedAgent) return;
    setEditedAgent({ ...selectedAgent });
    setHasChanges(false);
  };

  /**
   * Sauvegarde les modifications
   */
  const handleSaveEdit = async () => {
    if (!selectedAgent || !editedAgent || !hasChanges) return;

    const agentId = selectedAgent.slug || selectedAgent.id;
    const updated = await patchAgent(agentId, editedAgent);

    if (updated) {
      selectAgent(updated);
      setEditedAgent({ ...updated });
      setHasChanges(false);
    }
  };

  /**
   * Supprime un agent
   */
  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;

    const agentId = selectedAgent.slug || selectedAgent.id;
    const success = await deleteAgent(agentId);

    if (success) {
      selectAgent(null);
      setShowDeleteConfirm(false);
    }
  };

  /**
   * Met à jour un champ de l'agent édité
   */
  const updateField = <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => {
    setEditedAgent(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };


  if (loading && agents.length === 0) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Chargement des agents...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>

      <main className="page-content-area">
        <UnifiedPageTitle
          icon={Bot}
          title="Agents Spécialisés"
          subtitle="Gérez et configurez vos agents IA personnalisés"
        />

        <div className="main-dashboard">
          {error && (
            <motion.div 
              className="error-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <div className="agents-layout">
          {/* Colonne 1: Liste des agents */}
          <motion.div
            className="agents-list-panel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="panel-header">
              <h2 className="panel-title">Agents disponibles</h2>
              <button 
                className="btn-icon"
                onClick={loadAgents}
                title="Rafraîchir"
              >
                🔄
              </button>
            </div>

            <div className="agents-list">
              {agents.length === 0 ? (
                <div className="empty-state">
                  <Bot size={48} className="empty-icon" />
                  <p>Aucun agent disponible</p>
                </div>
              ) : (
                agents.map((agent) => (
                  <motion.button
                    key={agent.id}
                    className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                    onClick={() => handleSelectAgent(agent)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="agent-card-header">
                      <div className="agent-header-left">
                        {agent.profile_picture && (
                          <img 
                            src={agent.profile_picture} 
                            alt={agent.display_name || agent.name}
                            className="agent-avatar-small"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <h3 className="agent-name">
                          {agent.display_name || agent.name}
                        </h3>
                      </div>
                      <div className={`agent-status ${agent.is_active ? 'active' : 'inactive'}`}>
                        {agent.is_active ? '●' : '○'}
                      </div>
                    </div>
                    <p className="agent-description">
                      {agent.description || 'Aucune description'}
                    </p>
                    <div className="agent-meta">
                      <span className="agent-model">{agent.model}</span>
                      <span className="agent-slug">{agent.slug}</span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>

          {/* Colonne 2: Configuration de l'agent (milieu) */}
          <motion.div
            className="agent-details-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {selectedAgent ? (
              loadingDetails ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Chargement des détails...</p>
                </div>
              ) : (
              <div className="agent-details">
                <div className="details-header">
                  <h2 className="details-title">
                    Configuration de l'agent
                    {hasChanges && <span className="changes-indicator">●</span>}
                  </h2>
                  <div className="details-actions">
                    {hasChanges && (
                      <>
                        <button
                          className="btn-primary"
                          onClick={handleSaveEdit}
                        >
                          <Save size={16} />
                          <span>Sauvegarder</span>
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          <X size={16} />
                          <span>Annuler</span>
                        </button>
                      </>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={16} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>

                <div className="details-content">
                  {/* Informations générales */}
                  <div className="detail-section">
                    <h3 className="section-title">Informations</h3>
                    
                    <div className="field-group">
                      <label className="field-label">Nom d'affichage</label>
                      <input
                        type="text"
                        className="field-input"
                        value={editedAgent?.display_name || ''}
                        onChange={(e) => updateField('display_name', e.target.value)}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Slug</label>
                      <p className="field-value field-readonly">{selectedAgent.slug}</p>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Description</label>
                      <textarea
                        className="field-textarea"
                        value={editedAgent?.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        placeholder="Description de l'agent..."
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Image de profil (URL ou emoji)</label>
                      <input
                        type="text"
                        className="field-input"
                        value={editedAgent?.profile_picture || ''}
                        onChange={(e) => updateField('profile_picture', e.target.value)}
                        placeholder="🤖 ou https://example.com/avatar.png"
                      />
                      {editedAgent?.profile_picture && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img 
                            src={editedAgent.profile_picture} 
                            alt="Avatar de l'agent"
                            style={{ 
                              width: '48px', 
                              height: '48px', 
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid rgba(255, 255, 255, 0.2)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="field-group">
                      <label className="field-label">Personnalité</label>
                      <textarea
                        className="field-textarea"
                        value={editedAgent?.personality || ''}
                        onChange={(e) => updateField('personality', e.target.value)}
                        rows={2}
                        placeholder="Ex: Professionnel, amical, technique..."
                      />
                    </div>
                  </div>

                  {/* Instructions système */}
                  <div className="detail-section">
                    <h3 className="section-title">Instructions système</h3>
                    
                    <div className="field-group">
                      <textarea
                        className="field-textarea code"
                        value={editedAgent?.system_instructions || ''}
                        onChange={(e) => updateField('system_instructions', e.target.value)}
                        rows={10}
                        placeholder="Instructions système pour l'agent..."
                      />
                    </div>
                  </div>

                  {/* Capacités et expertise */}
                  <div className="detail-section">
                    <h3 className="section-title">Expertise</h3>

                    <div className="field-group">
                      <label className="field-label">Domaines d'expertise (séparés par des virgules)</label>
                      <input
                        type="text"
                        className="field-input"
                        value={editedAgent?.expertise?.join(', ') || ''}
                        onChange={(e) => updateField('expertise', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Ex: analyse, rédaction, synthèse"
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Capacités API V2</label>
                      <div className="capabilities-tags">
                        {(editedAgent?.api_v2_capabilities || []).map((cap, index) => (
                          <span key={index} className="capability-tag">{cap}</span>
                        ))}
                        {(!editedAgent?.api_v2_capabilities || editedAgent.api_v2_capabilities.length === 0) && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>Aucune capacité définie</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )
            ) : (
              <div className="empty-state">
                <Bot size={64} className="empty-icon" />
                <h3>Sélectionnez un agent</h3>
                <p>Choisissez un agent dans la liste pour voir ses détails</p>
              </div>
            )}
          </motion.div>

          {/* Colonne 3: Réglages (droite) */}
          <motion.div
            className="agent-settings-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {selectedAgent ? (
              loadingDetails ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                </div>
              ) : (
              <div className="agent-settings">
                <div className="panel-header">
                  <h2 className="panel-title">Réglages</h2>
                </div>

                <div className="settings-content">
                  {/* Modèle LLM */}
                  <div className="detail-section">
                    <h3 className="section-title">Modèle LLM</h3>

                    <div className="field-group">
                      <label className="field-label">Modèle</label>
                      <select
                        className="field-select"
                        value={editedAgent?.model || ''}
                        onChange={(e) => updateField('model', e.target.value)}
                      >
                        {!editedAgent?.model && (
                          <option value="">-- Sélectionner un modèle --</option>
                        )}
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
                      {editedAgent?.model && getModelInfo(editedAgent.model) && (
                        <div className="model-info">
                          <div className="model-insight">
                            {getModelInfo(editedAgent.model)?.description}
                          </div>
                          <div className="model-pricing">
                            {getModelInfo(editedAgent.model)?.pricing.input} input • {getModelInfo(editedAgent.model)?.pricing.output} output
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="field-group">
                      <label className="field-label">Provider</label>
                      <select
                        className="field-select"
                        value={editedAgent?.provider || 'groq'}
                        onChange={(e) => updateField('provider', e.target.value)}
                      >
                        <option value="groq">Groq (MCP Tools)</option>
                        <option value="xai">xAI (OpenAPI Tools)</option>
                      </select>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        color: 'rgba(255, 255, 255, 0.6)', 
                        marginTop: '0.25rem' 
                      }}>
                        {editedAgent?.provider === 'xai' 
                          ? '→ Utilisera les OpenAPI Tools (assignez un schéma ci-dessous)' 
                          : '→ Utilisera les MCP Tools (configurez ci-dessous)'}
                      </p>
                    </div>
                  </div>

                  {/* Paramètres LLM */}
                  <div className="detail-section">
                    <h3 
                      className="section-title section-title-collapsible"
                      onClick={() => setShowParameters(!showParameters)}
                    >
                      Paramètres
                      {showParameters ? (
                        <ChevronUp size={16} className="section-chevron" />
                      ) : (
                        <ChevronDown size={16} className="section-chevron" />
                      )}
                    </h3>

                    {showParameters && (
                      <>
                        <div className="field-group">
                          <label className="field-label">Température ({editedAgent?.temperature || 0})</label>
                          <input
                            type="range"
                            className="field-range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={editedAgent?.temperature || 0}
                            onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Top P ({editedAgent?.top_p || 1})</label>
                          <input
                            type="range"
                            className="field-range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={editedAgent?.top_p || 1}
                            onChange={(e) => updateField('top_p', parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Max Tokens</label>
                          <input
                            type="number"
                            className="field-input"
                            value={editedAgent?.max_tokens || 0}
                            onChange={(e) => updateField('max_tokens', parseInt(e.target.value))}
                            min="1"
                            max="100000"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* OpenAPI Tools */}
                  <div className="detail-section">
                    <h3 className="section-title">
                      OpenAPI Tools
                      <a 
                        href="/docs/OPENAPI-TOOLS-IMPLEMENTATION.md" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="section-doc-link"
                        title="Documentation OpenAPI Tools"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </h3>

                    {openApiLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                      </div>
                    ) : (
                      <>
                        <div className="field-group">
                          <div className="mcp-add-header">
                            <label className="field-label">Ajouter un schéma</label>
                            <button
                              className="btn-mcp-add"
                              onClick={() => setShowOpenApiDropdown(!showOpenApiDropdown)}
                              title="Ajouter un schéma OpenAPI"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          {showOpenApiDropdown && openApiSchemas.length > 0 && (
                            <div className="mcp-dropdown">
                              {openApiSchemas
                                .filter(schema => !isSchemaLinked(schema.id))
                                .map(schema => (
                                  <div
                                    key={schema.id}
                                    className="mcp-dropdown-item"
                                    onClick={() => {
                                      if (selectedAgent) {
                                        linkSchema(selectedAgent.id, schema.id);
                                        setShowOpenApiDropdown(false);
                                      }
                                    }}
                                  >
                                    <div className="mcp-dropdown-name">{schema.name}</div>
                                    {schema.description && (
                                      <div className="mcp-dropdown-desc">{schema.description}</div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                          {openApiSchemas.length === 0 && (
                            <p className="empty-text" style={{ marginTop: '0.5rem' }}>
                              Aucun schéma OpenAPI configuré dans la base de données.
                            </p>
                          )}
                        </div>

                        {agentOpenApiSchemas.length > 0 && (
                          <div className="field-group">
                            <label className="field-label">
                              Schémas actifs ({agentOpenApiSchemas.length})
                            </label>
                            <div className="mcp-linked-servers">
                              {agentOpenApiSchemas.map(link => (
                                <div key={link.id} className="mcp-linked-item">
                                  <div className="mcp-linked-info">
                                    <div className="mcp-linked-name">{link.openapi_schema.name}</div>
                                    {link.openapi_schema.description && (
                                      <div className="mcp-linked-desc">{link.openapi_schema.description}</div>
                                    )}
                                  </div>
                                  <button
                                    className="btn-mcp-remove"
                                    onClick={() => {
                                      if (selectedAgent) {
                                        unlinkSchema(selectedAgent.id, link.openapi_schema_id);
                                      }
                                    }}
                                    title="Retirer ce schéma"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* MCP Tools */}
                  <div className="detail-section">
                    <h3 className="section-title">
                      MCP Tools
                      <a 
                        href="https://console.groq.com/docs/mcp" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="section-doc-link"
                        title="Documentation Groq MCP"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </h3>

                    {mcpLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                      </div>
                    ) : (
                      <>
                        <div className="field-group">
                          <div className="mcp-add-header">
                            <label className="field-label">Ajouter un outil</label>
                            <button
                              className="btn-mcp-add"
                              onClick={() => setShowMcpDropdown(!showMcpDropdown)}
                              title="Ajouter un MCP Tool"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          {showMcpDropdown && mcpServers.length > 0 && (
                            <div className="mcp-dropdown">
                              {mcpServers
                                .filter(server => !isServerLinked(server.id))
                                .map(server => (
                                  <div
                                    key={server.id}
                                    className="mcp-dropdown-item"
                                    onClick={() => {
                                      if (selectedAgent) {
                                        linkServer(selectedAgent.id, server.id);
                                        setShowMcpDropdown(false);
                                      }
                                    }}
                                  >
                                    <div className="mcp-dropdown-name">{server.name}</div>
                                    {server.description && (
                                      <div className="mcp-dropdown-desc">{server.description}</div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                          {mcpServers.length === 0 && (
                            <p className="empty-text" style={{ marginTop: '0.5rem' }}>
                              Aucun serveur MCP configuré dans la base de données.
                            </p>
                          )}
                        </div>

                        {agentMcpServers.length > 0 && (
                          <div className="field-group">
                            <label className="field-label">
                              Outils actifs ({agentMcpServers.length})
                            </label>
                            <div className="mcp-linked-servers">
                              {agentMcpServers.map(link => (
                                <div key={link.id} className="mcp-linked-item">
                                  <div className="mcp-linked-info">
                                    <div className="mcp-linked-name">{link.mcp_server.name}</div>
                                    {link.mcp_server.description && (
                                      <div className="mcp-linked-desc">{link.mcp_server.description}</div>
                                    )}
                                  </div>
                                  <button
                                    className="btn-mcp-remove"
                                    onClick={() => {
                                      if (selectedAgent) {
                                        unlinkServer(selectedAgent.id, link.mcp_server_id);
                                      }
                                    }}
                                    title="Retirer ce serveur"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* État */}
                  <div className="detail-section">
                    <h3 className="section-title">État</h3>

                    <div className="field-group">
                      <label className="field-checkbox">
                        <input
                          type="checkbox"
                          checked={editedAgent?.is_active || false}
                          onChange={(e) => updateField('is_active', e.target.checked)}
                        />
                        <span>Agent actif</span>
                      </label>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Type d'agent</label>
                      <p className="field-value">
                        {selectedAgent.is_chat_agent ? '💬 Chat' : '🔌 Endpoint'}
                      </p>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Priorité</label>
                      <input
                        type="number"
                        className="field-input"
                        value={editedAgent?.priority || 0}
                        onChange={(e) => updateField('priority', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Version</label>
                      <p className="field-value field-readonly">{selectedAgent.version || '1.0.0'}</p>
                    </div>
                  </div>
                </div>
              </div>
              )
            ) : (
              <div className="empty-state-compact">
                <p className="empty-text">Sélectionnez un agent</p>
              </div>
            )}
          </motion.div>
          </div>

          {/* Modal de confirmation de suppression */}
        <AnimatePresence>
          {showDeleteConfirm && selectedAgent && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>⚠️ Confirmer la suppression</h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Êtes-vous sûr de vouloir supprimer l'agent{' '}
                    <strong>{selectedAgent.display_name || selectedAgent.name}</strong> ?
                  </p>
                  <p className="warning-text">
                    Cette action est irréversible.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleDeleteAgent}
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

