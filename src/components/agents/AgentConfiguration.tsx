import React, { useState } from 'react';
import { X, Image as ImageIcon, Power, PowerOff, Star, Pencil, FolderSearch } from 'lucide-react';
import ScriviaFilePicker from '@/components/chat/ScriviaFilePicker';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TTS_VOICE_OPTIONS, TTS_LANGUAGE_OPTIONS } from '@/constants/ttsVoices';

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
  const [showFilePicker, setShowFilePicker] = useState(false);

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
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  aria-label="Voir et éditer l'avatar de l'agent"
                  className="group/avatar relative section-block w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-zinc-400 text-base font-medium hover:border-[var(--color-border-secondary)] transition-colors"
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
                    <span className="group-hover/avatar:opacity-0 transition-opacity">{avatarFallback}</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-700/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4 text-zinc-100" />
                  </div>
                </button>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--color-bg-primary)] ${editedAgent.is_active ? 'bg-emerald-500' : 'bg-zinc-500'}`}
                  title={editedAgent.is_active ? 'Actif' : 'Suspendu'}
                />
              </div>
              <div className="group/name flex-1 min-w-0 relative rounded-lg px-2 py-1 hover:bg-zinc-800/40 transition-colors">
                <input
                  id="agent-display-name"
                  type="text"
                  value={editedAgent.display_name || ''}
                  onChange={e => onUpdateField('display_name', e.target.value)}
                  placeholder="Nom de l'agent"
                  className="w-full bg-transparent text-xl font-semibold text-zinc-100 placeholder:text-zinc-600 border-none outline-none focus:ring-0 px-0 py-0 truncate hover:text-white transition-colors cursor-text"
                />
                <input
                  id="agent-description"
                  type="text"
                  value={editedAgent.description || ''}
                  onChange={e => onUpdateField('description', e.target.value)}
                  placeholder="Décrivez rapidement le rôle de cet agent…"
                  className="w-full bg-transparent text-sm text-zinc-500 placeholder:text-zinc-700 border-none outline-none focus:ring-0 px-0 py-0 truncate hover:text-zinc-400 transition-colors cursor-text"
                />
                <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover/name:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>
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
            className="input-block w-full px-5 py-4 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none transition-colors font-mono text-[13px] leading-relaxed resize-none text-zinc-400"
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

        {/* Voix TTS + Langue */}
        <section>
          <label className={labelBase}>Voix & Langue (TTS)</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <CustomSelect
                id="agent-voice"
                value={editedAgent.voice ?? ''}
                options={TTS_VOICE_OPTIONS}
                onChange={val => onUpdateField('voice', val)}
                placeholder="Voix"
              />
            </div>
            <div className="flex-1">
              <CustomSelect
                id="agent-tts-language"
                value={editedAgent.tts_language ?? 'en'}
                options={TTS_LANGUAGE_OPTIONS}
                onChange={val => onUpdateField('tts_language', val)}
                placeholder="Langue"
              />
            </div>
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
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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
                  <button
                    type="button"
                    onClick={() => setShowFilePicker(true)}
                    title="Parcourir mes fichiers"
                    className="section-block shrink-0 p-2.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
                  >
                    <FolderSearch className="w-4 h-4" />
                  </button>
                </div>
                <ScriviaFilePicker
                  isOpen={showFilePicker}
                  onClose={() => setShowFilePicker(false)}
                  onSelectImages={(images) => {
                    if (images.length > 0) {
                      onUpdateField('profile_picture', images[0].url);
                    }
                    setShowFilePicker(false);
                  }}
                  multiple={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgentConfiguration;
