/**
 * Page dédiée à un agent : édition ou création (id = "new")
 * Remplace l'ancienne modal de détail agent.
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PageWithSidebarLayout from '@/components/PageWithSidebarLayout';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import AgentConfiguration from '@/components/agents/AgentConfiguration';
import AgentParameters from '@/components/agents/AgentParameters';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import type { SpecializedAgentConfig, CreateSpecializedAgentRequest } from '@/types/specializedAgents';
import type { OpenApiSchema, AgentSchemaLink } from '@/hooks/useOpenApiSchemas';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import { agentsService } from '@/services/agents/agentsService';
import { mcpService } from '@/services/agents/mcpService';
import { useCallables } from '@/hooks/useCallables';
import { simpleLogger } from '@/utils/logger';
import { Bot, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import '@/styles/main.css';
import '@/app/private/agents_page_backup_legacy/agents.css';
import '@/app/ai/agents2/agents2.css';

export default function AgentDetailPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <AgentDetailContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function AgentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { user, loading: authLoading } = useAuth();
  const isNew = id === 'new';

  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgentConfig | null>(null);
  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [savingAgent, setSavingAgent] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [availableOpenApiSchemas, setAvailableOpenApiSchemas] = useState<OpenApiSchema[]>([]);
  const [linkedOpenApiSchemas, setLinkedOpenApiSchemas] = useState<AgentSchemaLink[]>([]);
  const [availableMcpServers, setAvailableMcpServers] = useState<McpServer[]>([]);
  const [linkedMcpServers, setLinkedMcpServers] = useState<AgentMcpServerWithDetails[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  const {
    availableCallables,
    agentCallables,
    loading: callablesLoading,
    loadAgentCallables,
    linkCallable,
    unlinkCallable,
  } = useCallables(selectedAgent?.id);

  const panelLoading = pageLoading || toolsLoading || savingAgent;

  const fetchAllOpenApiSchemas = useCallback(async (): Promise<OpenApiSchema[]> => {
    const response = await fetch('/api/ui/openapi-schemas');
    const data = await response.json();
    if (!data?.success) throw new Error(data?.error || 'Échec du chargement des schémas OpenAPI');
    return data.schemas ?? [];
  }, []);

  const fetchLinkedOpenApiSchemas = useCallback(async (agentId: string): Promise<AgentSchemaLink[]> => {
    const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas`);
    const data = await response.json();
    if (!data?.success) throw new Error(data?.error || 'Échec du chargement des schémas liés');
    return data.schemas ?? [];
  }, []);

  const loadAgentTools = useCallback(
    async (agentId: string | null) => {
      if (!agentId) {
        setAvailableOpenApiSchemas([]);
        setLinkedOpenApiSchemas([]);
        setLinkedMcpServers([]);
        return;
      }
      setToolsLoading(true);
      try {
        const [allSchemas, linkedSchemas, linkedServers] = await Promise.all([
          fetchAllOpenApiSchemas(),
          fetchLinkedOpenApiSchemas(agentId),
          mcpService.getAgentMcpServers(agentId),
        ]);
        const allServers = await mcpService.listMcpServers();
        setAvailableOpenApiSchemas(allSchemas);
        setLinkedOpenApiSchemas(linkedSchemas);
        setAvailableMcpServers(allServers);
        setLinkedMcpServers(linkedServers);
        await loadAgentCallables(agentId);
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to load agent tools', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [fetchAllOpenApiSchemas, fetchLinkedOpenApiSchemas, loadAgentCallables]
  );

  useEffect(() => {
    if (!id || isNew) {
      if (isNew) {
        setSelectedAgent(null);
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
        setPageLoading(false);
        setLoadError(null);
      }
      return;
    }
    let cancelled = false;
    setPageLoading(true);
    setLoadError(null);
    const identifier = id as string;
    agentsService
      .getAgent(identifier)
      .then(fullAgent => {
        if (cancelled) return;
        setSelectedAgent(fullAgent);
        setEditedAgent({ ...fullAgent });
        setHasLocalChanges(false);
        return loadAgentTools(fullAgent.id);
      })
      .catch(fetchError => {
        if (cancelled) return;
        simpleLogger.error('[AgentDetail] Failed to load agent', fetchError);
        setLoadError(fetchError instanceof Error ? fetchError.message : 'Erreur chargement');
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, loadAgentTools]);

  const hasAgentChanges = useCallback(
    (base: SpecializedAgentConfig | null, draft: Partial<SpecializedAgentConfig> | null): boolean => {
      if (!base || !draft) return false;
      const fields: (keyof SpecializedAgentConfig)[] = [
        'display_name', 'description', 'system_instructions', 'personality', 'voice',
        'temperature', 'top_p', 'max_tokens', 'priority', 'is_chat_agent', 'is_endpoint_agent',
        'model', 'context_template', 'profile_picture',
      ];
      return fields.some(field => {
        const draftValue = draft[field];
        const baseValue = base[field];
        return draftValue !== undefined && draftValue !== baseValue;
      });
    },
    []
  );

  const handleSaveAgent = useCallback(async () => {
    if (!editedAgent) return;
    try {
      setSavingAgent(true);
      if (!selectedAgent) {
        if (!editedAgent.display_name || !editedAgent.description || !editedAgent.system_instructions || !editedAgent.model) {
          simpleLogger.error('[AgentDetail] Missing required fields for creation');
          return;
        }
        const slug = (editedAgent.display_name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
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
        const additionalFields: Partial<SpecializedAgentConfig> = {};
        if (editedAgent.personality !== undefined) additionalFields.personality = editedAgent.personality;
        if (editedAgent.voice !== undefined) additionalFields.voice = editedAgent.voice;
        if (Object.keys(additionalFields).length > 0) {
          const identifier = newAgent.slug || newAgent.id;
          await agentsService.patchAgent(identifier, additionalFields);
          const finalAgent = await agentsService.getAgent(identifier);
          setSelectedAgent(finalAgent);
          setEditedAgent({ ...finalAgent });
          setHasLocalChanges(false);
          await loadAgentTools(finalAgent.id);
          router.replace(`/private/agents2/${finalAgent.id}`);
        } else {
          setSelectedAgent(newAgent);
          setEditedAgent({ ...newAgent });
          setHasLocalChanges(false);
          await loadAgentTools(newAgent.id);
          router.replace(`/private/agents2/${newAgent.id}`);
        }
      } else {
        const identifier = selectedAgent.slug || selectedAgent.id;
        await agentsService.patchAgent(identifier, editedAgent);
        const updatedAgent = await agentsService.getAgent(identifier);
        setSelectedAgent(updatedAgent);
        setEditedAgent({ ...updatedAgent });
        setHasLocalChanges(false);
        await loadAgentTools(updatedAgent.id);
      }
    } catch (error) {
      simpleLogger.error('[AgentDetail] Failed to save agent', error);
    } finally {
      setSavingAgent(false);
    }
  }, [selectedAgent, editedAgent, loadAgentTools, router]);

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
        if (selectedAgent) setHasLocalChanges(hasAgentChanges(selectedAgent, next));
        else setHasLocalChanges(true);
        return next;
      });
    },
    [hasAgentChanges, selectedAgent]
  );

  const handleLinkSchema = useCallback(
    async (agentId: string, schemaId: string) => {
      if (!agentId) return;
      setToolsLoading(true);
      try {
        const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema_id: schemaId }),
        });
        const data = await response.json();
        if (!data?.success) throw new Error(data?.error || 'Erreur liaison schéma');
        await loadAgentTools(agentId);
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to link OpenAPI schema', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleUnlinkSchema = useCallback(
    async (agentId: string, schemaId: string) => {
      if (!agentId) return;
      setToolsLoading(true);
      try {
        const response = await fetch(`/api/ui/agents/${agentId}/openapi-schemas/${schemaId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!data?.success) throw new Error(data?.error || 'Erreur suppression schéma');
        await loadAgentTools(agentId);
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to unlink OpenAPI schema', error);
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleLinkServer = useCallback(
    async (agentId: string, serverId: string): Promise<boolean> => {
      if (!agentId) return false;
      setToolsLoading(true);
      try {
        await mcpService.linkMcpServerToAgent({ agent_id: agentId, mcp_server_id: serverId });
        await loadAgentTools(agentId);
        return true;
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to link MCP server', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleUnlinkServer = useCallback(
    async (agentId: string, serverId: string): Promise<boolean> => {
      if (!agentId) return false;
      setToolsLoading(true);
      try {
        await mcpService.unlinkMcpServerFromAgent(agentId, serverId);
        await loadAgentTools(agentId);
        return true;
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to unlink MCP server', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [loadAgentTools]
  );

  const handleLinkCallable = useCallback(
    async (agentId: string, callableId: string): Promise<boolean> => {
      if (!agentId) return false;
      setToolsLoading(true);
      try {
        const success = await linkCallable(agentId, callableId);
        if (success) await loadAgentCallables(agentId);
        return success;
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to link callable', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [linkCallable, loadAgentCallables]
  );

  const handleUnlinkCallable = useCallback(
    async (agentId: string, callableId: string): Promise<boolean> => {
      if (!agentId) return false;
      setToolsLoading(true);
      try {
        const success = await unlinkCallable(agentId, callableId);
        if (success) await loadAgentCallables(agentId);
        return success;
      } catch (error) {
        simpleLogger.error('[AgentDetail] Failed to unlink callable', error);
        return false;
      } finally {
        setToolsLoading(false);
      }
    },
    [unlinkCallable, loadAgentCallables]
  );

  const isSchemaLinked = useCallback(
    (schemaId: string) => linkedOpenApiSchemas.some(s => s.openapi_schema_id === schemaId),
    [linkedOpenApiSchemas]
  );
  const isServerLinked = useCallback(
    (serverId: string) => linkedMcpServers.some(s => s.mcp_server_id === serverId),
    [linkedMcpServers]
  );
  const isCallableLinked = useCallback(
    (callableId: string) => agentCallables.some(l => l.callable_id === callableId),
    [agentCallables]
  );

  const handleDeleteAgent = useCallback(async () => {
    if (!selectedAgent) return;
    const name = selectedAgent.display_name || selectedAgent.name || 'cet agent';
    if (!window.confirm(`Supprimer l'agent « ${name} » ?`)) return;
    try {
      await agentsService.deleteAgent(selectedAgent.id);
      router.push('/private/agents2');
    } catch (e) {
      simpleLogger.error('[AgentDetail] Failed to delete agent', e);
    }
  }, [selectedAgent, router]);

  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
    );
  }

  if (!id) {
    return (
      <PageWithSidebarLayout>
        <div className="agents2-section">
          <p>Identifiant agent manquant.</p>
          <Link href="/private/agents2">Retour aux agents</Link>
        </div>
      </PageWithSidebarLayout>
    );
  }

  if (loadError && !isNew && !selectedAgent) {
    return (
      <PageWithSidebarLayout>
        <div className="agents2-section">
          <div className="agents2-error">
            <p>Erreur : {loadError}</p>
            <Link href="/private/agents2" className="agents2-back-link">
              <ArrowLeft size={18} /> Retour aux agents
            </Link>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  const pageTitle = isNew ? 'Nouvel agent' : (editedAgent?.display_name || editedAgent?.name || 'Agent');
  const pageSubtitle = isNew ? 'Créer un nouvel agent IA' : 'Configuration et paramètres';

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner">
        <div className="agents2-section agents2-section--page">
          <div className="agents2-container agents2-container--page">
            <div className="agents2-page-header">
              <Link href="/private/agents2" className="agents2-back-link" aria-label="Retour aux agents">
                <ArrowLeft size={20} /> Agents
              </Link>
              <UnifiedPageTitle
                icon={Bot}
                title={pageTitle}
                subtitle={pageSubtitle}
                initialAnimation={false}
              />
            </div>

            {panelLoading && !editedAgent ? (
              <div className="agents2-modal__loading">
                <SimpleLoadingState message="Chargement de la configuration" />
              </div>
            ) : (
              <div className="agents-layout agents-layout--page">
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
                    onDelete={selectedAgent ? handleDeleteAgent : () => {}}
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
    </PageWithSidebarLayout>
  );
}
