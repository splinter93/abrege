import React, { useState } from 'react';
import { X, Image as ImageIcon, Power, PowerOff, Star, Pencil } from 'lucide-react';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { CustomSelect } from '@/components/ui/CustomSelect';

const TTS_VOICE_OPTIONS = [
  { value: 'fr-female-aura', label: 'FR · Aura (F)' },
  { value: 'fr-male-orion', label: 'FR · Orion (M)' },
  { value: 'en-female-luna', label: 'EN · Luna (F)' },
];

const AGENT_KIND_OPTIONS = [
  { value: 'chat', label: 'Agent de Chat' },
  { value: 'endpoint', label: 'Agent d\'Exécution' },
  { value: 'both', label: 'Chat & Exécution' },
];

const inputBase =
  'input-block w-full px-3 py-2 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none transition-colors';
const labelBase = 'text-xs font-medium text-zinc-400 block mb-1.5';

interface AgentConfigurationProps {
  selectedAgent: SpecializedAgentConfig | null;
  editedAgent: Partial<SpecializedAgentConfig> | null;
  hasChanges: boolean;
  isFavorite: boolean;
  togglingFavorite: boolean;
  loadingDetails: boolean;
  /** True pendant l’enregistrement (bouton Annuler désactivé, pas de spinner plein écran) */
  saving?: boolean;
  onToggleFavorite: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdateField: <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => void;
}

export function AgentConfiguration({
  selectedAgent,
  editedAgent,
  hasChanges,
  isFavorite,
  togglingFavorite,
  loadingDetails,
  saving = false,
  onToggleFavorite,
  onSave,
  onCancel,
  onDelete,
  onUpdateField,
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
      <div className="space-y-6">
        {/* Identité : avatar + bandeau (Actif, Favori) puis nom + description */}
        <section className="space-y-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                aria-label="Voir et éditer l'avatar de l'agent"
                className="section-block shrink-0 w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-zinc-400 text-sm font-medium hover:border-[var(--color-border-secondary)] transition-colors"
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
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 transition-all border border-transparent hover:border-zinc-700/50"
                aria-label="Changer l'image de l'avatar"
              >
                <Pencil className="w-3.5 h-3.5" />
                Changer d&apos;image
              </button>
              {selectedAgent && (
                <div className="section-block flex items-center gap-2 rounded-xl px-3 py-2 border border-[var(--color-border-block)] bg-[var(--color-bg-block)] ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    disabled={togglingFavorite}
                    title={isFavorite ? 'Retirer des favoris' : 'Définir comme agent favori (utilisé à l\'ouverture du chat)'}
                    className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                    aria-label={isFavorite ? 'Retirer des favoris' : 'Définir comme agent favori'}
                  >
                    <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateField('is_active', !editedAgent?.is_active)}
                    title={editedAgent?.is_active ? 'Désactiver l\'agent' : 'Activer l\'agent'}
                    className={`p-2 rounded-lg border transition-colors shrink-0 ${editedAgent?.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' : 'bg-zinc-800/60 border-zinc-600/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-400'}`}
                    aria-label={editedAgent?.is_active ? 'Désactiver l\'agent' : 'Activer l\'agent'}
                  >
                    {editedAgent?.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
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
            {hasChanges && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loadingDetails || saving}
                className="section-block inline-flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 text-sm hover:bg-[var(--color-bg-content)] hover:text-zinc-100 transition-colors disabled:opacity-50"
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
          <CustomSelect
            id="agent-kind"
            value={agentTypeValue}
            options={AGENT_KIND_OPTIONS}
            onChange={val => handleAgentTypeChange(val as 'chat' | 'endpoint' | 'both')}
          />
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
            className={`${inputBase} font-mono text-[13px] leading-relaxed resize-none text-zinc-400`}
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
          <CustomSelect
            id="agent-voice"
            value={editedAgent.voice ?? ''}
            options={TTS_VOICE_OPTIONS}
            onChange={val => onUpdateField('voice', val)}
            placeholder="Sélectionner une voix"
          />
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
          <div className="section-block w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 id="agent-avatar-modal-title" className="text-base font-semibold text-zinc-100">
                Avatar de l&apos;agent
              </h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[var(--color-bg-content)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="section-block w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-zinc-400 text-2xl font-medium">
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
