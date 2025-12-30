/**
 * Page de gestion des agents (version compacte)
 * Structure alignée sur la page Prompts
 */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import AgentCard from '@/components/agents/AgentCard';
import AgentDetailsModal from '@/components/agents/AgentDetailsModal';
import type { SpecializedAgentConfig, CreateSpecializedAgentRequest } from '@/types/specializedAgents';
import { Bot } from 'lucide-react';
import '@/styles/main.css';
import '@/app/private/agents_page_backup_legacy/agents.css';
import '@/app/ai/agents2/agents2.css';
import AgentConfiguration from '@/components/agents/AgentConfiguration';
import AgentParameters from '@/components/agents/AgentParameters';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import { useRouter } from 'next/navigation';
import { agentsService } from '@/services/agents/agentsService';
import type { OpenApiSchema, AgentSchemaLink } from '@/hooks/useOpenApiSchemas';
import { useCallables } from '@/hooks/useCallables';
import type { CallableListItem, AgentCallableLink } from '@/hooks/useCallables';
import { mcpService } from '@/services/agents/mcpService';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import { simpleLogger } from '@/utils/logger';

export default function AgentsV2Page() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <AgentsV2Content />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function AgentsV2Content() {
  const { user, loading: authLoading } = useAuth();
  const { agents, loading, error, loadAgents } = useSpecializedAgents();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgentConfig | null>(null);
  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const [availableOpenApiSchemas, setAvailableOpenApiSchemas] = useState<OpenApiSchema[]>([]);
  const [linkedOpenApiSchemas, setLinkedOpenApiSchemas] = useState<AgentSchemaLink[]>([]);
  const [availableMcpServers, setAvailableMcpServers] = useState<McpServer[]>([]);
  const [linkedMcpServers, setLinkedMcpServers] = useState<AgentMcpServerWithDetails[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  // Hook pour les callables
  const {
    availableCallables,
    agentCallables,
    loading: callablesLoading,
    loadAvailableCallables,
    loadAgentCallables,
    linkCallable,
    unlinkCallable,
  } = useCallables(selectedAgent?.id);

  const panelLoading = modalLoading || toolsLoading || savingAgent;

  const clearToolsState = useCallback(() => {
    setAvailableOpenApiSchemas([]);
    setLinkedOpenApiSchemas([]);
    setAvailableMcpServers([]);
    setLinkedMcpServers([]);
  }, []);

  const fetchAllOpenApiSchemas = useCallback(async (): Promise<OpenApiSchema[]> => {
    const response = await fetch('/api/ui/openapi-schemas');
    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.error || 'Échec du chargement des schémas OpenAPI');
    }
    return data.schemas ?? [];
  }, []);

  const fetchLinkedOpenApiSchemas = useCallback(async (agentId: string): Promise<AgentSchemaLink[]> => {
    const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas`);
    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.error || 'Échec du chargement des schémas liés');
    }
    return data.schemas ?? [];
  }, []);

  const loadAgentTools = useCallback(
    async (agentId: string | null) => {
      if (!agentId) {
        clearToolsState();
        return;
      }

      setToolsLoading(true);
      try {
        const [allSchemas, linkedSchemas, allServers, linkedServers] = await Promise.all([
          fetchAllOpenApiSchemas(),
          fetchLinkedOpenApiSchemas(agentId),
          mcpService.listMcpServers(),
          mcpService.getAgentMcpServers(agentId),
        ]);

        setAvailableOpenApiSchemas(allSchemas);
        setLinkedOpenApiSchemas(linkedSchemas);
        setAvailableMcpServers(allServers);
        setLinkedMcpServers(linkedServers);

        // Charger les callables de l'agent
        await loadAgentCallables(agentId);
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to load agent tools', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [clearToolsState, fetchAllOpenApiSchemas, fetchLinkedOpenApiSchemas, loadAgentCallables]
  );

  useEffect(() => {
    if (selectedAgent) {
      setHasLocalChanges(false);
    }
  }, [selectedAgent]);

  const hasAgentChanges = useCallback(
    (base: SpecializedAgentConfig | null, draft: Partial<SpecializedAgentConfig> | null): boolean => {
      if (!base || !draft) {
        return false;
      }

      const fields: (keyof SpecializedAgentConfig)[] = [
        'display_name',
        'description',
        'system_instructions',
        'personality',
        'voice',
        'temperature',
        'top_p',
        'max_tokens',
        'priority',
        'is_chat_agent',
        'is_endpoint_agent',
        'model',
        'context_template',
        'profile_picture'
      ];

      return fields.some(field => {
        const draftValue = draft[field];
        const baseValue = base[field];
        return draftValue !== undefined && draftValue !== baseValue;
      });
    },
    []
  );

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name)),
    [agents]
  );

  const activeAgentsCount = useMemo(
    () => sortedAgents.filter(agent => agent.is_active).length,
    [sortedAgents]
  );

  const handleOpenModal = useCallback(async (agent: SpecializedAgentConfig | null) => {
    setIsModalOpen(true);

    if (!agent) {
      setSelectedAgent(null);
      // Initialiser avec des valeurs par défaut pour un nouvel agent
      setEditedAgent({
        display_name: '',
        description: '',
        system_instructions: '',
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        is_chat_agent: true,
        is_endpoint_agent: false,
        is_active: true,
        temperature: 0.7,
        max_tokens: 4000,
        personality: '',
        voice: '',
      });
      clearToolsState();
      return;
    }

    setModalLoading(true);

    try {
      const identifier = agent.slug || agent.id;
      const fullAgent = await agentsService.getAgent(identifier);

      setSelectedAgent(fullAgent);
      setEditedAgent({ ...fullAgent });
      setHasLocalChanges(false);
      await loadAgentTools(fullAgent.id);
    } catch (fetchError) {
      simpleLogger.error('[AgentsV2] Failed to load agent details', fetchError);
      setSelectedAgent(agent);
      setEditedAgent({ ...agent });
      setHasLocalChanges(false);
      await loadAgentTools(agent.id);
    } finally {
      setModalLoading(false);
    }
  }, [clearToolsState, loadAgentTools]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAgent(null);
    setEditedAgent(null);
    setModalLoading(false);
    setSavingAgent(false);
    setHasLocalChanges(false);
    clearToolsState();
  }, [clearToolsState]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);

  const handleSaveAgent = useCallback(async () => {
    if (!editedAgent) {
      return;
    }

    try {
      setSavingAgent(true);

      // Mode création : selectedAgent est null
      if (!selectedAgent) {
        // Validation des champs requis pour la création
        if (!editedAgent.display_name || !editedAgent.description || !editedAgent.system_instructions || !editedAgent.model) {
          simpleLogger.error('[AgentsV2] Missing required fields for agent creation', {
            hasDisplayName: !!editedAgent.display_name,
            hasDescription: !!editedAgent.description,
            hasSystemInstructions: !!editedAgent.system_instructions,
            hasModel: !!editedAgent.model,
          });
          // TODO: Afficher un message d'erreur à l'utilisateur
          return;
        }

        // Générer un slug à partir du display_name
        const slug = (editedAgent.display_name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Créer l'agent
        const createData: CreateSpecializedAgentRequest = {
          slug,
          display_name: editedAgent.display_name,
          description: editedAgent.description,
          model: editedAgent.model,
          system_instructions: editedAgent.system_instructions,
          is_chat_agent: editedAgent.is_chat_agent ?? true,
          temperature: editedAgent.temperature ?? 0.7,
          max_tokens: editedAgent.max_tokens ?? 4000,
        };

        const newAgent = await agentsService.createAgent(createData);
        
        // Mettre à jour les champs additionnels (personality, voice) si présents
        const additionalFields: Partial<SpecializedAgentConfig> = {};
        if (editedAgent.personality !== undefined) {
          additionalFields.personality = editedAgent.personality;
        }
        if (editedAgent.voice !== undefined) {
          additionalFields.voice = editedAgent.voice;
        }
        
        let finalAgent = newAgent;
        if (Object.keys(additionalFields).length > 0) {
          const identifier = newAgent.slug || newAgent.id;
          await agentsService.patchAgent(identifier, additionalFields);
          finalAgent = await agentsService.getAgent(identifier);
        }
        
        await loadAgents();
        setSelectedAgent(finalAgent);
        setEditedAgent({ ...finalAgent });
        setHasLocalChanges(false);
        await loadAgentTools(finalAgent.id);
        simpleLogger.dev('[AgentsV2] Agent created', { agentId: finalAgent.id, slug: finalAgent.slug });
      } else {
        // Mode édition : mettre à jour l'agent existant
        const identifier = selectedAgent.slug || selectedAgent.id;
        await agentsService.patchAgent(identifier, editedAgent);
        await loadAgents();
        const updatedAgent = await agentsService.getAgent(identifier);
        setSelectedAgent(updatedAgent);
        setEditedAgent({ ...updatedAgent });
        setHasLocalChanges(false);
        await loadAgentTools(updatedAgent.id);
        simpleLogger.dev('[AgentsV2] Agent saved', { agentId: identifier });
      }
    } catch (error) {
      simpleLogger.error('[AgentsV2] Failed to save agent', error);
      // TODO: Afficher un message d'erreur à l'utilisateur
    } finally {
      setSavingAgent(false);
    }
  }, [selectedAgent, editedAgent, loadAgents, loadAgentTools]);

  const handleCancelChanges = useCallback(() => {
    if (selectedAgent) {
      setEditedAgent({ ...selectedAgent });
      setHasLocalChanges(false);
    }
  }, [selectedAgent]);

  const handleFieldUpdate = useCallback(
    <K extends keyof SpecializedAgentConfig>(field: K, value: SpecializedAgentConfig[K]) => {
      setEditedAgent(prev => {
        const next = { ...(prev ?? {}), [field]: value };
        if (selectedAgent) {
          setHasLocalChanges(hasAgentChanges(selectedAgent, next));
        } else {
          setHasLocalChanges(true);
        }
        return next;
      });
    },
    [hasAgentChanges, selectedAgent]
  );

  const handleLinkSchema = useCallback(
    async (agentId: string, schemaId: string) => {
      if (!agentId) {
        return;
      }
      try {
        setToolsLoading(true);
        const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema_id: schemaId })
        });
        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.error || 'Erreur lors de la liaison du schéma OpenAPI');
        }
        await loadAgentTools(agentId);
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to link OpenAPI schema', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleUnlinkSchema = useCallback(
    async (agentId: string, schemaId: string) => {
      if (!agentId) {
        return;
      }
      try {
        setToolsLoading(true);
        const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas/${schemaId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.error || 'Erreur lors de la suppression du schéma OpenAPI');
        }
        await loadAgentTools(agentId);
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to unlink OpenAPI schema', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleLinkServer = useCallback(
    async (agentId: string, serverId: string): Promise<boolean> => {
      if (!agentId) {
        return false;
      }
      try {
        setToolsLoading(true);
        await mcpService.linkMcpServerToAgent({
          agent_id: agentId,
          mcp_server_id: serverId
        });
        await loadAgentTools(agentId);
        return true;
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to link MCP server', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleUnlinkServer = useCallback(
    async (agentId: string, serverId: string): Promise<boolean> => {
      if (!agentId) {
        return false;
      }
      try {
        setToolsLoading(true);
        await mcpService.unlinkMcpServerFromAgent(agentId, serverId);
        await loadAgentTools(agentId);
        return true;
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to unlink MCP server', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const isSchemaLinked = useCallback(
    (schemaId: string) => linkedOpenApiSchemas.some(schema => schema.openapi_schema_id === schemaId),
    [linkedOpenApiSchemas]
  );

  const isServerLinked = useCallback(
    (serverId: string) => linkedMcpServers.some(server => server.mcp_server_id === serverId),
    [linkedMcpServers]
  );

  const handleLinkCallable = useCallback(
    async (agentId: string, callableId: string): Promise<boolean> => {
      if (!agentId) {
        return false;
      }
      try {
        setToolsLoading(true);
        const success = await linkCallable(agentId, callableId);
        if (success) {
          await loadAgentCallables(agentId);
        }
        return success;
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to link callable', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [linkCallable, loadAgentCallables]
  );

  const handleUnlinkCallable = useCallback(
    async (agentId: string, callableId: string): Promise<boolean> => {
      if (!agentId) {
        return false;
      }
      try {
        setToolsLoading(true);
        const success = await unlinkCallable(agentId, callableId);
        if (success) {
          await loadAgentCallables(agentId);
        }
        return success;
      } catch (error) {
        simpleLogger.error('[AgentsV2] Failed to unlink callable', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [unlinkCallable, loadAgentCallables]
  );

  const isCallableLinked = useCallback(
    (callableId: string) => agentCallables.some(link => link.callable_id === callableId),
    [agentCallables]
  );

  if (authLoading || !user?.id) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <SimpleLoadingState message="Chargement" />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <SimpleLoadingState message="Chargement des agents" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <div className="agents2-section">
            <div className="agents2-error">
              <p>❌ Erreur: {error}</p>
            </div>
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
        <div className="page-content-inner">
          <div className="agents2-section">
            <div className="agents2-container">
              <UnifiedPageTitle
                icon={Bot}
                title="Agents IA"
                subtitle="Configurez et pilotez vos agents spécialisés"
                stats={[
                  { number: sortedAgents.length, label: sortedAgents.length > 1 ? 'agents' : 'agent' },
                  { number: activeAgentsCount, label: 'actifs' }
                ]}
              />
              <div className="agents2-header-actions">
                <button onClick={() => handleOpenModal(null)} className="agents2-create-btn">
                  + Nouvel agent
                </button>
              </div>
            </div>

            {sortedAgents.length === 0 ? (
              <div className="agents2-empty">
                <div className="agents2-empty-icon">🤖</div>
                <h3>Aucun agent configuré</h3>
                <p>Créez votre premier agent pour automatiser vos workflows IA.</p>
                <button onClick={() => handleOpenModal(null)} className="agents2-empty-cta">
                  Créer un agent
                </button>
              </div>
            ) : (
              <div className="agents2-grid">
                {sortedAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => handleOpenModal(agent)}
                    onToggle={() => {
                      // TODO: hook toggle (reprendre logique prompts)
                    }}
                    onDelete={() => {
                      // TODO: suppression depuis modal
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {isModalOpen ? (
            <div className="agents2-modal-backdrop" role="dialog" aria-modal="true">
              <div className="agents2-modal">
                <header className="agents2-modal__header">
                  <UnifiedPageTitle
                    icon={Bot}
                    title="Agent Configuration"
                    subtitle="Configurer mes agents IA"
                    className="agents2-modal-title"
                    initialAnimation={false}
                  />
                  <button
                    type="button"
                    className="agents2-modal__close"
                    aria-label="Fermer"
                    onClick={handleCloseModal}
                  >
                    ✕
                  </button>
                </header>
                <div className="agents2-modal__content">
                  {panelLoading ? (
                    <div className="agents2-modal__loading">
                      <SimpleLoadingState message="Chargement de la configuration" />
                    </div>
                  ) : (
                    <div className="agents-layout agents-layout--modal">
                      <div className="agent-panel-motion">
                        <AgentConfiguration
                          selectedAgent={selectedAgent}
                          editedAgent={editedAgent}
                          hasChanges={hasLocalChanges}
                          isFavorite={Boolean(selectedAgent?.is_favorite)}
                          togglingFavorite={false}
                          loadingDetails={panelLoading}
                          onToggleFavorite={() => {}}
                          onSave={handleSaveAgent}
                          onCancel={handleCancelChanges}
                          onDelete={handleCloseModal}
                          onUpdateField={handleFieldUpdate}
                          onOpenChat={() => {
                            if (!selectedAgent) return;
                            const identifier = selectedAgent.slug || selectedAgent.id;
                            router.push(`/chat?agent=${encodeURIComponent(identifier)}`);
                          }}
                        />
                      </div>
                      <div className="agent-panel-motion">
                        <AgentParameters
                          selectedAgent={selectedAgent}
                          editedAgent={editedAgent}
                          loadingDetails={panelLoading}
                          openApiSchemas={availableOpenApiSchemas}
                          agentOpenApiSchemas={linkedOpenApiSchemas}
                          openApiLoading={toolsLoading}
                          mcpServers={availableMcpServers}
                          agentMcpServers={linkedMcpServers}
                          mcpLoading={toolsLoading}
                          availableCallables={availableCallables}
                          agentCallables={agentCallables}
                          callablesLoading={callablesLoading || toolsLoading}
                          onLinkSchema={handleLinkSchema}
                          onUnlinkSchema={handleUnlinkSchema}
                          onLinkServer={handleLinkServer}
                          onUnlinkServer={handleUnlinkServer}
                          onLinkCallable={handleLinkCallable}
                          onUnlinkCallable={handleUnlinkCallable}
                          isSchemaLinked={isSchemaLinked}
                          isServerLinked={isServerLinked}
                          isCallableLinked={isCallableLinked}
                          onUpdateField={handleFieldUpdate}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

