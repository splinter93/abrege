import React, { useState } from 'react';
import { Save, X, Trash2, Star, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';

const TTS_VOICE_OPTIONS = [
  { value: '', label: 'Sélectionner une voix' },
  { value: 'fr-female-aura', label: 'FR · Aura (F)' },
  { value: 'fr-male-orion', label: 'FR · Orion (M)' },
  { value: 'en-female-luna', label: 'EN · Luna (F)' },
];

interface AgentConfigurationProps {
  selectedAgent: SpecializedAgentConfig | null;
  editedAgent: Partial<SpecializedAgentConfig> | null;
  hasChanges: boolean;
  isFavorite: boolean;
  togglingFavorite: boolean;
  loadingDetails: boolean;
  onToggleFavorite: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdateField: <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => void;
  onOpenChat: () => void;
}

export function AgentConfiguration({
  selectedAgent,
  editedAgent,
  hasChanges,
  isFavorite,
  togglingFavorite,
  loadingDetails,
  onToggleFavorite,
  onSave,
  onCancel,
  onDelete,
  onUpdateField,
  onOpenChat,
}: AgentConfigurationProps) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  if (!selectedAgent) {
    return (
      <div className="agent-details-panel">
        <div className="empty-state">
          <span className="empty-icon" role="img" aria-label="Robot">
            🤖
          </span>
          <h3>Sélectionnez un agent</h3>
          <p>Choisissez un agent pour afficher sa configuration.</p>
        </div>
      </div>
    );
  }

  if (loadingDetails || !editedAgent) {
    return (
      <div className="agent-details-panel">
        <SimpleLoadingState message="Chargement de la configuration" />
      </div>
    );
  }

  const displayAvatarPreview =
    typeof editedAgent.profile_picture === 'string' && editedAgent.profile_picture.trim().length > 0;

  const agentDisplayName =
    editedAgent.display_name ||
    selectedAgent.display_name ||
    selectedAgent.name ||
    'Agent sans nom';

  const agentTypeValue = (() => {
    if (editedAgent.is_chat_agent && editedAgent.is_endpoint_agent) return 'both';
    if (editedAgent.is_chat_agent) return 'chat';
    return 'endpoint';
  })();

  const handleAgentTypeChange = (value: 'chat' | 'endpoint' | 'both') => {
    if (value === 'chat') {
      onUpdateField('is_chat_agent', true);
      onUpdateField('is_endpoint_agent', false);
      return;
    }

    if (value === 'endpoint') {
      onUpdateField('is_chat_agent', false);
      onUpdateField('is_endpoint_agent', true);
      return;
    }

    onUpdateField('is_chat_agent', true);
    onUpdateField('is_endpoint_agent', true);
  };

  const avatarFallback = agentDisplayName
    .split(' ')
    .map(chunk => chunk.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="agent-details-panel agent-config-panel">
        <div className="agent-details">
        <div className="agent-profile-card">
          <button
            type="button"
            className="agent-profile-card__avatar"
            onClick={() => setShowAvatarModal(true)}
            aria-label="Voir et éditer l'avatar de l'agent"
          >
            {displayAvatarPreview ? (
              <img
                src={editedAgent.profile_picture}
                alt={`Avatar de ${agentDisplayName}`}
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span>{avatarFallback}</span>
            )}
          </button>

          <div className="agent-profile-card__main">
            <label className="visually-hidden" htmlFor="agent-display-name">
              Nom d&apos;affichage
            </label>
            <input
              id="agent-display-name"
              type="text"
              className="agent-profile-card__name"
              value={editedAgent.display_name || ''}
              onChange={event => onUpdateField('display_name', event.target.value)}
              placeholder="Nom de l'agent"
            />

            <label className="visually-hidden" htmlFor="agent-description">
              Description
            </label>
            <input
              id="agent-description"
              className="agent-profile-card__description agent-profile-card__description--inline"
              value={editedAgent.description || ''}
              onChange={event => onUpdateField('description', event.target.value)}
              placeholder="Décrivez rapidement le rôle de cet agent…"
            />
          </div>

          <div className="agent-profile-card__actions">
            <button
              className="btn-chat"
              type="button"
              onClick={onOpenChat}
              disabled={!selectedAgent}
              title="Accéder au chat"
            >
              <MessageCircle size={16} />
            </button>
            <button
              className={`btn-favorite ${isFavorite ? 'active' : ''}`}
              type="button"
              onClick={onToggleFavorite}
              disabled={togglingFavorite}
              title={isFavorite ? 'Retirer des favoris' : 'Définir comme agent favori'}
            >
              <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {hasChanges && (
              <>
                <button
                  className="btn-tertiary"
                  type="button"
                  onClick={onCancel}
                  disabled={loadingDetails}
                >
                  <X size={16} />
                  <span>Annuler</span>
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={onSave}
                  disabled={loadingDetails}
                >
                  <span className="btn-primary__icon">
                    <Save size={16} />
                  </span>
                  <span className="btn-primary__label">Sauvegarder</span>
                </button>
              </>
            )}

            <button className="btn-danger" type="button" onClick={onDelete} title="Supprimer l'agent">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="agent-config-sections">
          <section className="agent-config-inline">
            <div className="agent-inline-field">
              <label className="field-label" htmlFor="agent-kind">
                Type d&apos;agent
              </label>
              <select
                id="agent-kind"
                className="field-select"
                value={agentTypeValue}
                onChange={event => handleAgentTypeChange(event.target.value as 'chat' | 'endpoint' | 'both')}
              >
                <option value="chat">Agent de Chat</option>
                <option value="endpoint">Agent d&apos;Exécution</option>
                <option value="both">Chat &amp; Exécution</option>
              </select>
            </div>

            <div className="agent-inline-field agent-inline-toggle">
              <span id="agent-active-label" className="field-label">
                Agent actif
              </span>
              <button
                type="button"
                className={`agent-toggle ${editedAgent.is_active ? 'agent-toggle--on' : ''}`}
                onClick={() => onUpdateField('is_active', !editedAgent.is_active)}
                aria-pressed={Boolean(editedAgent.is_active)}
                aria-labelledby="agent-active-label"
              >
                <span className="agent-toggle__thumb" />
              </button>
            </div>
          </section>

          <section className="agent-config-section">
            <div className="agent-config-section__header">
              <h3>Instructions système</h3>
              {hasChanges && <span className="agent-config-section__status">Modifié</span>}
            </div>

            <label className="visually-hidden" htmlFor="agent-system-instructions">
              Instructions système
            </label>
            <textarea
              id="agent-system-instructions"
              className="field-textarea code agent-config-editor__textarea"
              value={editedAgent.system_instructions || ''}
              onChange={event => onUpdateField('system_instructions', event.target.value)}
              rows={12}
              placeholder="Définissez précisément le comportement, la voix, les contraintes et les objectifs de l'agent."
            />
          </section>

          <section className="agent-config-section">
            <div className="agent-config-field">
              <label className="field-label" htmlFor="agent-personality">
                Personnalité
              </label>
              <textarea
                id="agent-personality"
                className="field-textarea"
                value={editedAgent.personality || ''}
                onChange={event => onUpdateField('personality', event.target.value)}
                rows={3}
                placeholder="Ex: Pragmatique, empathique, spécialisé finance..."
              />
            </div>
          </section>

          <section className="agent-config-section">
            <div className="agent-config-section__header">
              <h3>Voix (TTS)</h3>
            </div>

            <div className="agent-config-grid">
              <div className="agent-config-field">
                <label className="visually-hidden" htmlFor="agent-voice">
                  Voix TTS
                </label>
                <select
                  id="agent-voice"
                  className="field-select"
                  value={editedAgent.voice ?? ''}
                  onChange={event => onUpdateField('voice', event.target.value)}
                >
                  {TTS_VOICE_OPTIONS.map(option => (
                    <option key={option.value || 'default'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>

      {showAvatarModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="agent-avatar-modal-title">
          <div className="modal-content agent-avatar-modal">
            <div className="modal-header">
              <h3 id="agent-avatar-modal-title">Avatar de l&apos;agent</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Fermer la fenêtre"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body agent-avatar-modal__body">
              <div className="agent-avatar-modal__preview">
                {displayAvatarPreview ? (
                  <img src={editedAgent.profile_picture} alt={`Avatar de ${agentDisplayName}`} />
                ) : (
                  <span>{avatarFallback}</span>
                )}
              </div>

              <div className="agent-avatar-modal__field">
                <label className="field-label" htmlFor="agent-avatar-url">
                  URL de l&apos;image
                </label>
                <div className="agent-avatar-modal__input">
                  <ImageIcon size={16} aria-hidden="true" />
                  <input
                    id="agent-avatar-url"
                    type="text"
                    className="field-input"
                    value={editedAgent.profile_picture || ''}
                    onChange={event => onUpdateField('profile_picture', event.target.value)}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgentConfiguration;

