"use client";

import { motion, AnimatePresence } from "framer-motion";
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

/**
 * Page de gestion des agents spécialisés
 */
export interface AgentsPageProps {
  embedded?: boolean;
  initialAgentId?: string | null;
}

export default function AgentsPage({ embedded = false, initialAgentId }: AgentsPageProps = {}) {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <AgentsPageContent embedded={embedded} initialAgentId={initialAgentId} />
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

  const content = (
    <div className={embedded ? 'agents-embedded-wrapper' : 'page-wrapper'}>
      {!embedded && (
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      )}

      <main className={`page-content-area ${embedded ? 'agents-embedded-content' : ''}`}>
        {!embedded && (
        <UnifiedPageTitle
          icon={Bot}
          title="Agents Spécialisés"
          subtitle="Gérez et configurez vos agents IA personnalisés"
        />
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
          {/* Colonne 1: Liste des agents */}
          {!embedded && (
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
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
          )}

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

