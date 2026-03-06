/**
 * Page de gestion des agents (style Linear / Vercel)
 * Liste des cartes ; clic → page dédiée /private/agents2/[id]
 */
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import PageWithSidebarLayout from '@/components/PageWithSidebarLayout';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import AgentCard from '@/components/agents/AgentCard';
import AgentListItem from '@/components/agents/AgentListItem';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Bot, Search, LayoutGrid, List, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { simpleLogger } from '@/utils/logger';
import '@/styles/main.css';
import '@/app/private/agents_page_backup_legacy/agents.css';
import '@/app/ai/agents2/agents2.css';

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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { agents, loading, error, deleteAgent, updateAgent } = useSpecializedAgents();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const effectiveViewMode = isMobile ? 'list' : viewMode;

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name)),
    [agents]
  );

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return sortedAgents;
    const q = searchQuery.trim().toLowerCase();
    return sortedAgents.filter(agent => {
      const name = (agent.display_name || agent.name || '').toLowerCase();
      const desc = (agent.description || agent.system_instructions || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [sortedAgents, searchQuery]);

  const activeAgentsCount = useMemo(
    () => sortedAgents.filter(agent => agent.is_active).length,
    [sortedAgents]
  );

  const handleOpenAgent = useCallback(
    (agent: SpecializedAgentConfig) => {
      router.push(`/private/agents2/${agent.id}`);
    },
    [router]
  );

  const handleNewAgent = useCallback(() => {
    router.push('/private/agents2/new');
  }, [router]);

  const handleDeleteAgent = useCallback(
    async (agent: SpecializedAgentConfig) => {
      const name = agent.display_name || agent.name || 'cet agent';
      if (!window.confirm(`Supprimer l'agent « ${name} » ?`)) return;
      try {
        await deleteAgent(agent.id);
      } catch (e) {
        simpleLogger.error('[AgentsV2] Failed to delete agent', e);
      }
    },
    [deleteAgent]
  );

  const handleToggleAgent = useCallback(
    async (agent: SpecializedAgentConfig) => {
      try {
        await updateAgent(agent.id, { is_active: !agent.is_active });
      } catch (e) {
        simpleLogger.error('[AgentsV2] Failed to toggle agent', e);
      }
    },
    [updateAgent]
  );

  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
    );
  }

  if (loading) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement des agents" />
      </PageWithSidebarLayout>
    );
  }

  if (error) {
    return (
      <PageWithSidebarLayout>
        <div className="min-h-[40vh] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-zinc-400">Erreur: {error}</p>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-agents bg-[var(--color-bg-primary)] min-h-full w-full max-w-none mx-0 flex flex-col">
        {/* Header sticky Linear */}
        <header className="sticky top-0 z-10 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-zinc-400" />
                  Agents IA
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {filteredAgents.length} {filteredAgents.length > 1 ? 'agents' : 'agent'}
                  {searchQuery.trim() ? '' : ` · ${activeAgentsCount} actifs`}
                </span>
              </div>

              <div className="flex flex-row items-center gap-2 w-full sm:w-auto min-w-0">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Rechercher…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
                  />
                </div>
                {!isMobile && (
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${effectiveViewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Vue grille"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${effectiveViewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Vue liste"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNewAgent}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Nouvel agent
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Aucun agent configuré</h3>
              <p className="text-zinc-500 text-sm max-w-sm mb-6">
                Créez votre premier agent pour automatiser vos workflows IA.
              </p>
              <button
                type="button"
                onClick={handleNewAgent}
                className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Créer un agent
              </button>
            </div>
          ) : effectiveViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => handleOpenAgent(agent)}
                  onToggle={() => handleToggleAgent(agent)}
                  onDelete={() => handleDeleteAgent(agent)}
                />
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col border border-solid rounded-xl overflow-hidden divide-y divide-[var(--color-border-block)]"
              style={{ borderColor: 'var(--color-border-block)', borderWidth: 'var(--border-block-width)' }}
            >
              {filteredAgents.map(agent => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  onEdit={() => handleOpenAgent(agent)}
                  onToggle={() => handleToggleAgent(agent)}
                  onDelete={() => handleDeleteAgent(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWithSidebarLayout>
  );
}
