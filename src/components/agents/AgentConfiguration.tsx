import React, { useState } from 'react';
import { X, Image as ImageIcon, MessageCircle, ChevronDown } from 'lucide-react';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';

const TTS_VOICE_OPTIONS = [
  { value: '', label: 'Sélectionner une voix' },
  { value: 'fr-female-aura', label: 'FR · Aura (F)' },
  { value: 'fr-male-orion', label: 'FR · Orion (M)' },
  { value: 'en-female-luna', label: 'EN · Luna (F)' },
];

const inputBase =
  'w-full px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-100 text-sm placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-zinc-800/20 focus:outline-none transition-colors';
const labelBase = 'text-xs font-medium text-zinc-400 block mb-1.5';

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

  const isCreating = !selectedAgent && editedAgent !== null;

  if (loadingDetails || (!editedAgent && !isCreating)) {
    return (
      <div className="py-8">
        <SimpleLoadingState message="Chargement de la configuration" />
      </div>
    );
  }

  if (!selectedAgent && !isCreating) {
    return (
      <div className="py-12 text-center">
        <span className="text-4xl" role="img" aria-label="Robot">🤖</span>
        <h3 className="mt-4 text-lg font-semibold text-zinc-100">Sélectionnez un agent</h3>
        <p className="mt-1 text-sm text-zinc-500">Choisissez un agent pour afficher sa configuration.</p>
      </div>
    );
  }

  const displayAvatarPreview =
    typeof editedAgent.profile_picture === 'string' && editedAgent.profile_picture.trim().length > 0;

  const agentDisplayName =
    editedAgent.display_name ||
    (selectedAgent ? (selectedAgent.display_name || selectedAgent.name) : null) ||
    'Nouvel agent';

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
      <div className="space-y-10">
        {/* Identité : avatar au-dessus, puis nom + description */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              aria-label="Voir et éditer l'avatar de l'agent"
              className="shrink-0 w-14 h-14 rounded-full overflow-hidden border border-zinc-800/60 bg-zinc-900/30 flex items-center justify-center text-zinc-400 text-sm font-medium hover:border-zinc-600 transition-colors self-start"
            >
              {displayAvatarPreview ? (
                <img
                  src={editedAgent.profile_picture}
                  alt={`Avatar de ${agentDisplayName}`}
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{avatarFallback}</span>
              )}
            </button>
            <div className="space-y-4 min-w-0">
              <div>
                <label className={labelBase} htmlFor="agent-display-name">
                  Nom d&apos;affichage
                </label>
                <input
                  id="agent-display-name"
                  type="text"
                  className={inputBase}
                  value={editedAgent.display_name || ''}
                  onChange={e => onUpdateField('display_name', e.target.value)}
                  placeholder="Nom de l'agent"
                />
              </div>
              <div>
                <label className={labelBase} htmlFor="agent-description">
                  Description
                </label>
                <input
                  id="agent-description"
                  type="text"
                  className={inputBase}
                  value={editedAgent.description || ''}
                  onChange={e => onUpdateField('description', e.target.value)}
                  placeholder="Décrivez rapidement le rôle de cet agent…"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedAgent && (
              <button
                type="button"
                onClick={onOpenChat}
                title="Accéder au chat"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/20 hover:text-zinc-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            )}
            {hasChanges && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loadingDetails}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-sm hover:bg-zinc-800/20 hover:text-zinc-100 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            )}
          </div>
        </section>

        {/* Type d'agent */}
        <section>
          <label className={labelBase} htmlFor="agent-kind">
            Type d&apos;agent
          </label>
          <div className="relative">
            <select
              id="agent-kind"
              className={`${inputBase} cursor-pointer pr-10 appearance-none`}
              value={agentTypeValue}
              onChange={e => handleAgentTypeChange(e.target.value as 'chat' | 'endpoint' | 'both')}
            >
              <option value="chat">Agent de Chat</option>
              <option value="endpoint">Agent d&apos;Exécution</option>
              <option value="both">Chat &amp; Exécution</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </section>

        {/* Instructions système */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelBase} htmlFor="agent-system-instructions">
              Instructions système
            </label>
            {hasChanges && (
              <span className="text-[10px] font-medium text-amber-400/80">Modifié</span>
            )}
          </div>
          <textarea
            id="agent-system-instructions"
            className={`${inputBase} font-mono text-[13px] leading-relaxed resize-none`}
            rows={12}
            value={editedAgent.system_instructions || ''}
            onChange={e => onUpdateField('system_instructions', e.target.value)}
            placeholder="Définissez précisément le comportement, la voix, les contraintes et les objectifs de l'agent."
          />
        </section>

        {/* Personnalité */}
        <section>
          <label className={labelBase} htmlFor="agent-personality">
            Personnalité
          </label>
          <textarea
            id="agent-personality"
            className={`${inputBase} resize-none`}
            rows={3}
            value={editedAgent.personality || ''}
            onChange={e => onUpdateField('personality', e.target.value)}
            placeholder="Ex: Pragmatique, empathique, spécialisé finance..."
          />
        </section>

        {/* Voix TTS */}
        <section>
          <label className={labelBase} htmlFor="agent-voice">
            Voix (TTS)
          </label>
          <div className="relative">
            <select
              id="agent-voice"
              className={`${inputBase} cursor-pointer pr-10 appearance-none`}
              value={editedAgent.voice ?? ''}
              onChange={e => onUpdateField('voice', e.target.value)}
            >
              {TTS_VOICE_OPTIONS.map(option => (
                <option key={option.value || 'default'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </section>
      </div>

      {/* Modal Avatar */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-avatar-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800/60 bg-[var(--color-bg-primary)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 id="agent-avatar-modal-title" className="text-base font-semibold text-zinc-100">
                Avatar de l&apos;agent
              </h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-zinc-800/60 bg-zinc-900/30 flex items-center justify-center text-zinc-400 text-2xl font-medium">
                  {displayAvatarPreview ? (
                    <img
                      src={editedAgent.profile_picture}
                      alt={`Avatar de ${agentDisplayName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{avatarFallback}</span>
                  )}
                </div>
              </div>
              <div>
                <label className={labelBase} htmlFor="agent-avatar-url">
                  URL de l&apos;image
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    id="agent-avatar-url"
                    type="text"
                    className={`${inputBase} pl-9`}
                    value={editedAgent.profile_picture || ''}
                    onChange={e => onUpdateField('profile_picture', e.target.value)}
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
