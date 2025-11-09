/**
 * Page de gestion des agents (version compacte)
 * Structure alignée sur la page Prompts
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import AgentConfiguration from '@/components/agents/AgentConfiguration';
import AgentParameters from '@/components/agents/AgentParameters';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgentConfig | null>(null);
  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);

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

  const handleOpenModal = (agent: SpecializedAgentConfig | null) => {
    setSelectedAgent(agent);
    setEditedAgent(agent ? { ...agent } : null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
    setEditedAgent(null);
  };

  const handleSaveAgent = () => {
    // TODO: implémenter la sauvegarde via useAgentEditor-like hook (à connecter)
    handleCloseModal();
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
                  <h2>{selectedAgent ? `Configuration · ${selectedAgent.display_name || selectedAgent.name}` : 'Nouvel agent'}</h2>
                  <button
                    type="button"
                    className="agents2-modal__close"
                    aria-label="Fermer"
                    onClick={handleCloseModal}
                  >
                    ✕
                  </button>
                </header>
                <div className="agents2-modal__content agents-layout agents-layout--modal">
                  <div className="agent-panel-motion">
                    <AgentConfiguration
                      selectedAgent={selectedAgent}
                      editedAgent={editedAgent}
                      hasChanges={false}
                      isFavorite={Boolean(selectedAgent?.is_favorite)}
                      togglingFavorite={false}
                      loadingDetails={false}
                      onToggleFavorite={() => {}}
                      onSave={handleSaveAgent}
                      onCancel={handleCloseModal}
                      onDelete={handleCloseModal}
                      onUpdateField={(field, value) => {
                        setEditedAgent(prev => ({
                          ...prev,
                          [field]: value,
                        }));
                      }}
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
                      loadingDetails={false}
                      openApiSchemas={[]}
                      agentOpenApiSchemas={[]}
                      openApiLoading={false}
                      mcpServers={[]}
                      agentMcpServers={[]}
                      mcpLoading={false}
                      onLinkSchema={async () => {}}
                      onUnlinkSchema={async () => {}}
                      onLinkServer={async () => {}}
                      onUnlinkServer={async () => {}}
                      isSchemaLinked={() => false}
                      isServerLinked={() => false}
                      onUpdateField={(field, value) => {
                        setEditedAgent(prev => ({
                          ...prev,
                          [field]: value,
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

