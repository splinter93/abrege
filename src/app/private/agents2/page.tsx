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
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
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
      [...agents].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      }),
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
        <div className="page-content-inner page-content-inner-agents w-full max-w-none mx-0 bg-[var(--color-bg-primary)] min-h-full">
          <SimpleLoadingState message="Chargement" />
        </div>
      </PageWithSidebarLayout>
    );
  }

  if (loading) {
    return (
      <PageWithSidebarLayout>
        <div className="page-content-inner page-content-inner-agents w-full max-w-none mx-0 bg-[var(--color-bg-primary)] min-h-full">
          <SimpleLoadingState message="Chargement des agents" />
        </div>
      </PageWithSidebarLayout>
    );
  }

  if (error) {
    return (
      <PageWithSidebarLayout>
        <div className="page-content-inner page-content-inner-agents w-full max-w-none mx-0 bg-[var(--color-bg-primary)] min-h-full">
          <div className="min-h-[40vh] flex items-center justify-center px-4">
            <div className="text-center">
              <p className="text-zinc-400">Erreur: {error}</p>
            </div>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  return (
    <PageWithSidebarLayout>
      <div className="page-content-inner page-content-inner-agents bg-[var(--color-bg-primary)] w-full max-w-none mx-0">
        {/* En-tête — même structure que Fichiers (max-w-screen-2xl) */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-4 pb-0">
          <div className="max-w-screen-2xl mx-auto w-full">
          <div className="mb-10 mt-5 sm:mt-8 flex w-full items-center justify-between">
            <div className="flex flex-col items-start font-sans">
              <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
                Agents IA
              </h1>
              <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
                Agents spécialisés pour automatiser vos workflows IA.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleNewAgent}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Agent</span>
                </button>
              </div>
            </div>

            {/* Ligne 2 : Barre de recherche + toggle vue */}
            <div className="flex items-center gap-3 w-full mb-6 justify-between">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Rechercher…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-[var(--color-border-block)] transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
                />
              </div>
              {!isMobile && (
                <div
                  className="flex shrink-0 items-center gap-1 rounded-xl p-0.5"
                  style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg p-2 transition-all ${effectiveViewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Vue grille"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg p-2 transition-all ${effectiveViewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Contenu principal — même structure que Fichiers */}
          <div className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="max-w-screen-2xl mx-auto w-full">
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
                className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200"
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
        </div>
    </PageWithSidebarLayout>
  );
}
