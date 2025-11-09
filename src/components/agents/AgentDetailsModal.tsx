'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AgentConfiguration from '@/components/agents/AgentConfiguration';
import AgentParameters from '@/components/agents/AgentParameters';
import { useAgentEditor } from '@/hooks/useAgentEditor';
import './AgentDetailsModal.css';

interface AgentDetailsModalProps {
  onClose: () => void;
}

const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({ onClose }) => {
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
  } = useAgentEditor();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('agents-details-modal-open');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('agents-details-modal-open');
    };
  }, [onClose]);

  const renderBody = () => {
    if (loading && agents.length === 0) {
      return (
        <div className="agent-modal-state">
          <div className="agent-modal-state__icon">
            <div className="loading-spinner" />
          </div>
          <h3>Chargement des agents</h3>
          <p>Patiente quelques secondes, nous préparons la configuration.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="agent-modal-state agent-modal-state--error">
          <div className="agent-modal-state__icon">⚠️</div>
          <h3>Impossible de charger les agents</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (agents.length === 0) {
      return (
        <div className="agent-modal-state agent-modal-state--empty">
          <div className="agent-modal-state__icon">🤖</div>
          <h3>Aucun agent configuré</h3>
          <p>Crée ton premier agent depuis le dashboard Agents pour commencer.</p>
        </div>
      );
    }

    return (
      <div className="agent-modal-grid">
        <motion.div
          className="agent-modal-column"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
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

        <motion.div
          className="agent-modal-column"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
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
    );
  };

  return (
    <div className="agent-details-modal">
      <div className="agent-details-modal__backdrop" onClick={onClose} />
      <div className="agent-details-modal__content">
        <button
          className="agent-details-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
        <div className="agent-details-modal__page">
          <div className="agent-modal-surface">
            <header className="agent-modal-header">
              <div className="agent-modal-header__titles">
                <h2>Agents spécialisés</h2>
                <p>Configurez finement vos agents et leurs outils en toute simplicité.</p>
              </div>
              <div className="agent-modal-selector">
                <label htmlFor="agent-selector">Agent</label>
                <select
                  id="agent-selector"
                  value={selectedAgent?.id || ''}
                  onChange={event => {
                    const next = agents.find(agent => agent.id === event.target.value);
                    if (next) {
                      void handleSelectAgent(next);
                    }
                  }}
                >
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.display_name || agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </header>

            {renderBody()}
          </div>
        </div>
      </div>

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
              onClick={event => event.stopPropagation()}
            >
              <div className="modal-header">
                <h3>⚠️ Confirmer la suppression</h3>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Êtes-vous sûr de vouloir supprimer l&apos;agent{' '}
                  <strong>{selectedAgent.display_name || selectedAgent.name}</strong> ?
                </p>
                <p className="warning-text">Cette action est irréversible.</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuler
                </button>
                <button className="btn-danger" type="button" onClick={() => void handleDeleteAgent()}>
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentDetailsModal;

