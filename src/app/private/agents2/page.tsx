/**
 * Page de gestion des agents (version compacte)
 * Liste des cartes ; clic → page dédiée /private/agents2/[id]
 */
'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import PageWithSidebarLayout from '@/components/PageWithSidebarLayout';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import AgentCard from '@/components/agents/AgentCard';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Bot } from 'lucide-react';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
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
  const { agents, loading, error, deleteAgent } = useSpecializedAgents();

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name)),
    [agents]
  );

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
        <div className="agents2-section">
          <div className="agents2-error">
            <p>❌ Erreur: {error}</p>
          </div>
        </div>
      </PageWithSidebarLayout>
    );
  }

  return (
    <PageWithSidebarLayout>
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
                <button onClick={handleNewAgent} className="agents2-create-btn">
                  + Nouvel agent
                </button>
              </div>
            </div>

            {sortedAgents.length === 0 ? (
              <div className="agents2-empty">
                <div className="agents2-empty-icon">🤖</div>
                <h3>Aucun agent configuré</h3>
                <p>Créez votre premier agent pour automatiser vos workflows IA.</p>
                <button onClick={handleNewAgent} className="agents2-empty-cta">
                  Créer un agent
                </button>
              </div>
            ) : (
              <div className="agents2-grid">
                {sortedAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => handleOpenAgent(agent)}
                    onToggle={() => {
                      // TODO: hook toggle (reprendre logique prompts)
                    }}
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

