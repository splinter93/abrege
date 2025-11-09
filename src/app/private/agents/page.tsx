"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import { Bot } from "lucide-react";
import AgentConfiguration from "@/components/agents/AgentConfiguration";
import AgentParameters from "@/components/agents/AgentParameters";
import { useAgentEditor } from "@/hooks/useAgentEditor";
import "@/styles/main.css";
import "./agents.css";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

function AgentsPageContainer() {
  const searchParams = useSearchParams();
  const embeddedParam = searchParams?.get('embedded');
  const embedded = embeddedParam === '1' || embeddedParam === 'true';
  const initialAgentId = searchParams?.get('agent') ?? null;
  return (
    <AgentsPageContent embedded={embedded} initialAgentId={initialAgentId} />
  );
}

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <Suspense fallback={<SimpleLoadingState message="Chargement" />}>
          <AgentsPageContainer />
        </Suspense>
      </AuthGuard>
    </ErrorBoundary>
  );
}

/**
 * Contenu de la page (séparé pour AuthGuard)
 */
export interface AgentsPageContentProps {
  embedded?: boolean;
  initialAgentId?: string | null;
}

function AgentsPageContent({ embedded = false, initialAgentId }: AgentsPageContentProps = {}) {
  const router = useRouter();
  const {
    agents,
    loading,
    error,
    selectedAgent,
    editedAgent,
    hasChanges,
    loadingDetails,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isFavorite,
    togglingFavorite,
    handleSelectAgent,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteAgent,
    handleToggleFavorite,
    updateField,
    loadAgents,
    mcpServers,
    agentMcpServers,
    mcpLoading,
    linkServer,
    unlinkServer,
    isServerLinked,
    openApiSchemas,
    agentOpenApiSchemas,
    openApiLoading,
    linkSchema,
    unlinkSchema,
    isSchemaLinked,
  } = useAgentEditor({ initialAgentId });

  if (loading && agents.length === 0) {
    return embedded ? (
      <SimpleLoadingState message="Chargement" />
    ) : (
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

  const handleOpenChat = () => {
    if (!selectedAgent) {
      return;
    }
    const slug = selectedAgent.slug || selectedAgent.id;
    router.push(`/chat?agent=${encodeURIComponent(slug)}`);
  };

  const content = (
    <div className={embedded ? 'agents-embedded-wrapper' : 'page-wrapper'}>
      {!embedded && (
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      )}

      <main className={`page-content-area ${embedded ? 'agents-embedded-content' : ''}`}>
        {!embedded && (
        <div className="page-title-with-switcher">
          <UnifiedPageTitle
            icon={Bot}
            title="Agents Spécialisés"
            subtitle="Gérez et configurez vos agents IA personnalisés"
          />
          <div className="agent-switcher-inline">
            <div className="agent-toolbar__select">
              <button
                type="button"
                className="agent-select-trigger-button"
                onClick={event => {
                  const menu = document.getElementById('agent-switcher-menu');
                  if (menu) {
                    menu.classList.toggle('open');
                  }
                  event.currentTarget.classList.toggle('open');
                }}
              >
                {selectedAgent ? (
                  <span className="agent-select-trigger">
                    {selectedAgent.profile_picture ? (
                      <img src={selectedAgent.profile_picture} alt={selectedAgent.display_name || selectedAgent.name}
                        className="agent-select-trigger__avatar"
                        onError={event => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="agent-select-trigger__avatar agent-select-trigger__avatar--fallback">
                        {(selectedAgent.display_name || selectedAgent.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="agent-select-trigger__label">
                      {selectedAgent.display_name || selectedAgent.name}
                    </span>
                    <span className="agent-select-trigger__chevron-wrapper">
                      <ChevronDown size={16} className="agent-select-trigger__chevron" aria-hidden="true" />
                    </span>
                  </span>
                ) : (
                  <span className="agent-select-trigger__label">Aucun agent</span>
                )}
              </button>

              <div id="agent-switcher-menu" className="agent-select-menu">
              {agents.map(agent => {
                const fallback = (agent.display_name || agent.name || 'AG').slice(0, 2).toUpperCase();
                const isActive = selectedAgent?.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className={`agent-select-option ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      handleSelectAgent(agent);
                      const menu = document.getElementById('agent-switcher-menu');
                      if (menu) {
                        menu.classList.remove('open');
                      }
                      const trigger = document.querySelector('.agent-select-trigger-button.open');
                      trigger?.classList.remove('open');
                    }}
                  >
                    {agent.profile_picture ? (
                      <img src={agent.profile_picture}
                        alt={agent.display_name || agent.name}
                        className="agent-select-option__avatar"
                        onError={event => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="agent-select-option__avatar agent-select-option__avatar--fallback">
                        {fallback}
                      </span>
                    )}
                    <span className="agent-select-option__label">
                      {agent.display_name || agent.name}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>
        )}

        <div className={`main-dashboard ${embedded ? 'main-dashboard--embedded' : ''}`}>
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

          <div className={`agents-layout ${embedded ? 'agents-layout--embedded' : ''}`}>
          {/* Colonne 2: Configuration de l'agent (milieu) */}
          <motion.div
            className="agent-panel-motion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AgentConfiguration
              selectedAgent={selectedAgent}
              editedAgent={editedAgent}
              hasChanges={hasChanges}
              isFavorite={isFavorite}
              togglingFavorite={togglingFavorite}
              loadingDetails={loadingDetails}
              onToggleFavorite={handleToggleFavorite}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              onDelete={() => setShowDeleteConfirm(true)}
              onUpdateField={updateField}
              onOpenChat={handleOpenChat}
            />
          </motion.div>

          {/* Colonne 3: Réglages (droite) */}
          <motion.div
            className="agent-panel-motion"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <AgentParameters
              selectedAgent={selectedAgent}
              editedAgent={editedAgent}
              loadingDetails={loadingDetails}
              openApiSchemas={openApiSchemas}
              agentOpenApiSchemas={agentOpenApiSchemas}
              openApiLoading={openApiLoading}
              mcpServers={mcpServers}
              agentMcpServers={agentMcpServers}
              mcpLoading={mcpLoading}
              onLinkSchema={linkSchema}
              onUnlinkSchema={unlinkSchema}
              onLinkServer={linkServer}
              onUnlinkServer={unlinkServer}
              isSchemaLinked={isSchemaLinked}
              isServerLinked={isServerLinked}
              onUpdateField={updateField}
            />
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

  return content;
}

