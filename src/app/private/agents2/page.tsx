/**
 * Page de gestion des agents (version compacte)
 * Structure alignée sur la page Prompts
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import AgentCard from '@/components/agents/AgentCard';
import AgentDetailsModal from '@/components/agents/AgentDetailsModal';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Bot } from 'lucide-react';
import '@/styles/main.css';
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
  const { user, loading: authLoading } = useAuth();
  const { agents, loading, error } = useSpecializedAgents();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name)),
    [agents]
  );

  const activeAgentsCount = useMemo(
    () => sortedAgents.filter(agent => agent.is_active).length,
    [sortedAgents]
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

  const handleCreate = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('agents:lastSelected');
    }
    setIsModalOpen(true);
  };

  const handleEdit = (agent: SpecializedAgentConfig) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('agents:lastSelected', agent.id);
    }
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('agents:lastSelected');
    }
    setIsModalOpen(false);
  };

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
                <button onClick={handleCreate} className="agents2-create-btn">
                  + Nouvel agent
                </button>
              </div>
            </div>

            {sortedAgents.length === 0 ? (
              <div className="agents2-empty">
                <div className="agents2-empty-icon">🤖</div>
                <h3>Aucun agent configuré</h3>
                <p>Créez votre premier agent pour automatiser vos workflows IA.</p>
                <button onClick={handleCreate} className="agents2-empty-cta">
                  Créer un agent
                </button>
              </div>
            ) : (
              <div className="agents2-grid">
                {sortedAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => handleEdit(agent)}
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

          {isModalOpen && <AgentDetailsModal onClose={handleCloseModal} />}
        </div>
      </main>
    </div>
  );
}

