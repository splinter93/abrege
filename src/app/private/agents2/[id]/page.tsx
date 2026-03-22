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
import type { NoteMention } from '@/types/noteMention';
import { areNoteMentionListsEqual } from '@/utils/noteMentionListsEqual';
import type { OpenApiSchema, AgentSchemaLink } from '@/hooks/useOpenApiSchemas';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import { agentsService } from '@/services/agents/agentsService';
import { mcpService } from '@/services/agents/mcpService';
import { useCallables } from '@/hooks/useCallables';
import { simpleLogger } from '@/utils/logger';
import { supabase } from '@/supabaseClient';
import { ArrowLeft, Menu, SlidersHorizontal, Trash2, Star, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { useParamsPanelMobile } from '@/hooks/useParamsPanelMobile';
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
  const paramsPanel = useParamsPanelMobile();

  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgentConfig | null>(null);
  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [savingAgent, setSavingAgent] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

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

  /** Chargement du contenu (première load ou outils) — affiche les spinners dans les panneaux */
  const contentLoading = pageLoading || toolsLoading;
  /** Désactive le bouton Enregistrer pendant save ou chargement */
  const panelLoading = contentLoading || savingAgent;

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
        // Tout en parallèle — listMcpServers est indépendant, pas besoin de séquencer
        const [allSchemas, linkedSchemas, linkedServers, allServers] = await Promise.all([
          fetchAllOpenApiSchemas(),
          fetchLinkedOpenApiSchemas(agentId),
          mcpService.getAgentMcpServers(agentId),
          mcpService.listMcpServers(),
        ]);
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
        'display_name', 'description', 'system_instructions', 'system_instructions_mentions', 'voice', 'tts_language',
        'temperature', 'top_p', 'max_tokens', 'priority', 'is_chat_agent', 'is_endpoint_agent',
        'model', 'context_template', 'profile_picture',
      ];
      return fields.some(field => {
        const draftValue = draft[field];
        const baseValue = base[field];
        if (field === 'system_instructions_mentions') {
          return JSON.stringify(draftValue ?? []) !== JSON.stringify(baseValue ?? []);
        }
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
        if (editedAgent.voice !== undefined) additionalFields.voice = editedAgent.voice;
        if (editedAgent.tts_language !== undefined) additionalFields.tts_language = editedAgent.tts_language;
        if (editedAgent.system_instructions_mentions !== undefined) {
          additionalFields.system_instructions_mentions = editedAgent.system_instructions_mentions;
        }
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
        const updatedAgent = await agentsService.patchAgent(identifier, editedAgent);
        setSelectedAgent(updatedAgent);
        setEditedAgent({ ...updatedAgent });
        setHasLocalChanges(false);
        /* Pas de loadAgentTools : les outils (OpenAPI, MCP, callables) n'ont pas changé */
      }
    } catch (error) {
      simpleLogger.error('[AgentDetail] Failed to save agent', error);
    } finally {
      setSavingAgent(false);
    }
  }, [selectedAgent, editedAgent, loadAgentTools, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasLocalChanges && !savingAgent) handleSaveAgent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasLocalChanges, savingAgent, handleSaveAgent]);

  const handleCancelChanges = useCallback(() => {
    if (selectedAgent) {
      setEditedAgent({ ...selectedAgent });
      setHasLocalChanges(false);
    }
  }, [selectedAgent]);

  // Sync isFavorite from user's favorite_agent_id (pour affichage + ouverture chat avec agent favori)
  useEffect(() => {
    if (!user?.id || !selectedAgent?.id) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('favorite_agent_id')
        .eq('id', user.id)
        .single();
      if (cancelled || error) return;
      setIsFavorite(data?.favorite_agent_id === selectedAgent.id);
    })();
    return () => { cancelled = true; };
  }, [user?.id, selectedAgent?.id]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user?.id || !selectedAgent?.id || togglingFavorite) return;
    setTogglingFavorite(true);
    try {
      const newFavoriteId = isFavorite ? null : selectedAgent.id;
      const { error } = await supabase
        .from('users')
        .update({ favorite_agent_id: newFavoriteId })
        .eq('id', user.id);
      if (error) {
        simpleLogger.error('[AgentDetail] Toggle favori', error);
        return;
      }
      setIsFavorite(!isFavorite);
      setSelectedAgent(prev => prev ? { ...prev, is_favorite: !isFavorite } : null);
    } finally {
      setTogglingFavorite(false);
    }
  }, [user?.id, selectedAgent?.id, isFavorite, togglingFavorite]);

  const handleFieldUpdate = useCallback(
    <K extends keyof SpecializedAgentConfig>(field: K, value: SpecializedAgentConfig[K]) => {
      let computedNext: Partial<SpecializedAgentConfig> | null = null;
      let skipUpdate = false;

      setEditedAgent(prev => {
        const base = prev ?? {};

        if (
          field === 'system_instructions_mentions' &&
          prev !== null &&
          areNoteMentionListsEqual(base.system_instructions_mentions, value as NoteMention[] | undefined)
        ) {
          skipUpdate = true;
          return prev;
        }

        computedNext = { ...base, [field]: value };
        return computedNext;
      });

      if (skipUpdate) {
        return;
      }

      if (selectedAgent && computedNext) {
        setHasLocalChanges(hasAgentChanges(selectedAgent, computedNext));
      } else if (!selectedAgent) {
        setHasLocalChanges(true);
      }
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
        <div className="bg-[var(--color-bg-primary)] flex items-center justify-center px-4 py-24">
          <div className="text-center">
            <p className="text-zinc-400 mb-4">Identifiant agent manquant.</p>
            <Link href="/private/agents2" className="text-zinc-100 hover:text-white text-sm font-medium inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour aux agents
            </Link>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  if (loadError && !isNew && !selectedAgent) {
    return (
      <PageWithSidebarLayout>
        <div className="bg-[var(--color-bg-primary)] flex items-center justify-center px-4 py-24">
          <div className="text-center">
            <p className="text-zinc-400 mb-4">Erreur : {loadError}</p>
            <Link href="/private/agents2" className="text-zinc-100 hover:text-white text-sm font-medium inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour aux agents
            </Link>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  const pageTitle = isNew ? 'Nouvel agent' : (editedAgent?.display_name || editedAgent?.name || 'Agent');
  const displayAvatar =
    typeof editedAgent?.profile_picture === 'string' && (editedAgent?.profile_picture || '').trim().length > 0;
  const avatarFallback = (pageTitle || '?')
    .split(' ')
    .map(chunk => chunk.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-agents bg-[var(--color-bg-primary)] w-full max-w-none mx-0">
        {/* Header sticky Linear */}
        <header className="sticky top-0 z-20 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-[50px] gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/private/agents2"
                  className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 transition-colors shrink-0 inline-flex items-center justify-center"
                  aria-label="Retour aux agents"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-zinc-100 font-medium truncate">{pageTitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {paramsPanel.isMobile && (
                  <button
                    type="button"
                    onClick={paramsPanel.togglePanel}
                    className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 transition-colors"
                    aria-label="Ouvrir les paramètres"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                )}
                {selectedAgent && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleFieldUpdate('is_active', !editedAgent?.is_active)}
                      title={editedAgent?.is_active ? 'Désactiver l\'agent' : 'Activer l\'agent'}
                      className={`p-1.5 rounded-md transition-colors shrink-0 ${editedAgent?.is_active ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                      aria-label={editedAgent?.is_active ? 'Désactiver l\'agent' : 'Activer l\'agent'}
                    >
                      {editedAgent?.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      disabled={togglingFavorite}
                      title={isFavorite ? 'Retirer des favoris' : 'Définir comme agent favori'}
                      className={`p-1.5 rounded-md transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none ${isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                      aria-label={isFavorite ? 'Retirer des favoris' : 'Définir comme agent favori'}
                    >
                      <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAgent}
                      title="Supprimer l'agent"
                      className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
                      aria-label="Supprimer l'agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {hasLocalChanges && (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelChanges}
                      disabled={panelLoading}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAgent}
                      disabled={panelLoading}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200 disabled:opacity-50 disabled:pointer-events-none min-w-[7rem]"
                    >
                      {savingAgent ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {contentLoading && !editedAgent ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
            <SimpleLoadingState message="Chargement de la configuration" />
          </div>
        ) : (
          <main className="w-full flex flex-col lg:flex-row min-w-0">
            {/* Overlay mobile — ferme le drawer paramètres */}
            {paramsPanel.isMobile && paramsPanel.isOpen && (
              <button
                type="button"
                aria-label="Fermer les paramètres"
                className="agent-params-overlay"
                onClick={paramsPanel.closePanel}
              />
            )}

            {/* Contenu principal centré à gauche */}
            <div className="flex-1 min-w-0 py-10">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <AgentConfiguration
                  selectedAgent={selectedAgent}
                  editedAgent={editedAgent}
                  hasChanges={hasLocalChanges}
                  isFavorite={isFavorite}
                  togglingFavorite={togglingFavorite}
                  loadingDetails={contentLoading}
                  saving={savingAgent}
                  onToggleFavorite={handleToggleFavorite}
                  onSave={handleSaveAgent}
                  onCancel={handleCancelChanges}
                  onDelete={selectedAgent ? handleDeleteAgent : () => {}}
                  onUpdateField={handleFieldUpdate}
                  systemInstructionsMentions={editedAgent?.system_instructions_mentions}
                  onMentionsChange={m => handleFieldUpdate('system_instructions_mentions', m)}
                />
              </div>
            </div>

            {/* Side panel droit — desktop fixe, mobile drawer depuis la droite */}
            <aside
              className={`agent-config-side-panel${paramsPanel.isMobile ? ' agent-config-side-panel--drawer' : ''}${paramsPanel.isMobile && paramsPanel.isOpen ? ' agent-config-side-panel--open' : ''}`}
              aria-label="Parameters (model, tools)"
              aria-hidden={paramsPanel.isMobile && !paramsPanel.isOpen}
            >
              {/* Header du drawer mobile : même style que mobile-top-bar (Menu à gauche) */}
              {paramsPanel.isMobile && (
                <div className="flex items-center justify-between min-h-[52px] px-4 py-3">
                  <button
                    type="button"
                    onClick={paramsPanel.closePanel}
                    className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                    aria-label="Fermer"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-semibold text-zinc-200 tracking-wide">PARAMETERS</span>
                  <div className="w-9 shrink-0" aria-hidden />
                </div>
              )}
              <div className="space-y-6 p-4 lg:p-0 lg:py-4 lg:px-4 overflow-y-auto h-full">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 text-center pt-2">Configuration</h2>
                <AgentParameters
                  selectedAgent={selectedAgent}
                  editedAgent={editedAgent}
                  loadingDetails={contentLoading}
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
            </aside>
          </main>
        )}
      </div>
    </PageWithSidebarLayout>
  );
}
