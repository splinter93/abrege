/**
 * Modal de formulaire pour créer/éditer un prompt (style Linear / Agents)
 * @module components/prompts/PromptFormModal
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import IconPicker from './IconPicker';
import { getIconComponent } from '@/utils/iconMapper';
import { X, Info } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import Tooltip from '@/components/Tooltip';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-100 text-sm placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-zinc-800/20 focus:outline-none transition-colors';
const labelClass = 'text-xs font-medium text-zinc-400 block mb-1.5';

interface PromptFormModalProps {
  prompt: EditorPrompt | null;
  agents: Agent[];
  onSave: (data: EditorPromptCreateRequest) => void | Promise<void>;
  onCancel: () => void;
}

const PromptFormModal: React.FC<PromptFormModalProps> = ({
  prompt,
  agents,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<EditorPromptCreateRequest>({
    name: '',
    prompt_template: '',
    icon: 'FiZap',
    context: 'editor',
    agent_id: null,
    insertion_mode: 'replace',
    use_structured_output: false
  });

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const placeholders = useMemo(
    () => parsePromptPlaceholders(formData.prompt_template),
    [formData.prompt_template]
  );

  const reservedPlaceholders = useMemo(
    () =>
      parsePromptPlaceholders(formData.prompt_template, { includeReserved: true }).filter(
        (placeholder) => placeholder.isReserved
      ),
    [formData.prompt_template]
  );

  // Initialiser le formulaire si on édite un prompt
  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        prompt_template: prompt.prompt_template,
        icon: prompt.icon,
        context: prompt.context || 'editor',
        agent_id: prompt.agent_id ?? null,
        insertion_mode: prompt.insertion_mode || 'replace',
        use_structured_output: prompt.use_structured_output || false
      });
    }
  }, [prompt]);

  /**
   * Validation du formulaire
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Le nom ne peut pas dépasser 100 caractères';
    }

    const trimmedTemplate = formData.prompt_template.trim();

    if (!trimmedTemplate) {
      newErrors.prompt_template = 'Le template est requis';
    }

    const hasSelectionConflict =
      reservedPlaceholders.some((placeholder) => placeholder.name === 'selection') &&
      formData.context !== 'editor';

    if (hasSelectionConflict) {
      newErrors.prompt_template =
        'Le placeholder {selection} est réservé à l’éditeur. Adaptez le contexte ou retirez-le.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: EditorPromptCreateRequest = {
      ...formData,
      agent_id: formData.agent_id ?? null
    };

    await onSave(payload);
  };

  /**
   * Gère le changement de champ
   */
  const handleChange = (field: keyof EditorPromptCreateRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const SelectedIcon = getIconComponent(formData.icon);
  // Déterminer si une icône a été sélectionnée (pas juste la valeur par défaut)
  // En mode création, 'FiZap' est la valeur par défaut donc on considère qu'aucune icône n'est sélectionnée
  // En mode édition, on affiche toujours l'icône si elle existe
  const isDefaultIcon = !prompt && formData.icon === 'FiZap';
  const hasSelectedIcon = !isDefaultIcon;
  const strictModeTooltip =
    'Active le mode JSON pour supprimer les phrases parasites du LLM.\nExemples : "Voici la correction", "J\'ai reformulé".';

  return (
    <div
      className="prompt-modal-overlay-tw fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="prompt-modal-tw w-full max-w-[600px] max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-bg-block)] shadow-xl"
        style={{ border: 'var(--border-block)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 shrink-0" style={{ borderBottom: 'var(--border-block)' }}>
          <h2 className="text-lg font-semibold text-zinc-100">
            {prompt ? 'Modifier le prompt' : 'Nouveau prompt'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 gap-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className={labelClass} htmlFor="name">
                Nom du prompt *
              </label>
              <input
                id="name"
                type="text"
                className={`${inputClass} ${errors.name ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Améliorer l'écriture"
                maxLength={100}
              />
              {errors.name && <span className="mt-1 text-xs text-red-400">{errors.name}</span>}
            </div>
            <div className="sm:w-[130px] shrink-0">
              <label className={labelClass} htmlFor="icon-selector">
                Icône
              </label>
              <button
                id="icon-selector"
                type="button"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/40 transition-colors flex items-center justify-center gap-2"
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
              >
                {hasSelectedIcon ? (
                  <SelectedIcon size={20} className="text-amber-400/90" />
                ) : (
                  <span className="text-xs text-zinc-500">Choisir</span>
                )}
              </button>
              {isIconPickerOpen && (
                <IconPicker
                  selectedIcon={formData.icon}
                  onSelect={(icon) => {
                    handleChange('icon', icon);
                    setIsIconPickerOpen(false);
                  }}
                  onClose={() => setIsIconPickerOpen(false)}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
            <div className="flex-1 min-w-0">
              <label className={labelClass} htmlFor="context">
                Contexte
              </label>
              <CustomSelect
                id="context"
                value={formData.context}
                options={[
                  { value: 'editor', label: 'Éditeur' },
                  { value: 'chat', label: 'Chat' },
                  { value: 'both', label: 'Éditeur & Chat' }
                ]}
                onChange={val => handleChange('context', val as 'editor' | 'chat' | 'both')}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className={labelClass} htmlFor="agent_id">
                Agent spécialisé
              </label>
              <CustomSelect
                id="agent_id"
                value={formData.agent_id ?? ''}
                options={[
                  { value: '', label: 'Aucun agent' },
                  ...agents
                    .filter(a => a.is_active)
                    .map(agent => ({
                      value: agent.id,
                      label: agent.name
                    }))
                ]}
                onChange={val => {
                  setFormData(prev => ({ ...prev, agent_id: val ? val : null }));
                  if (errors.agent_id) {
                    setErrors(prevErrors => {
                      const { agent_id, ...rest } = prevErrors;
                      return rest;
                    });
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="prompt_template">
              Template du prompt *
            </label>
            <textarea
              id="prompt_template"
              className={`${inputClass} font-mono text-[13px] leading-relaxed min-h-[140px] resize-none ${errors.prompt_template ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
              value={formData.prompt_template}
              onChange={(e) => handleChange('prompt_template', e.target.value)}
              placeholder="Exemple: Améliore ce texte : {selection}"
              rows={4}
            />
            {errors.prompt_template && (
              <span className="mt-1 block text-xs text-red-400">{errors.prompt_template}</span>
            )}
            <p className="mt-1.5 text-xs text-zinc-500">
              Utilisez <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono text-[11px]">{'{selection}'}</code> pour insérer le texte sélectionné
            </p>

            <div className="mt-4 p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Arguments détectés</span>
                <span className="min-w-[24px] h-6 px-1.5 rounded-md bg-zinc-800/60 text-zinc-400 text-xs font-medium flex items-center justify-center">
                  {placeholders.length}
                </span>
              </div>
              {placeholders.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {placeholders.map((p) => (
                    <li key={p.name}>
                      <code className="px-2 py-0.5 rounded-md bg-zinc-800/60 font-mono text-[11px] text-zinc-400">{`{${p.name}}`}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Aucun argument personnalisé.</p>
              )}
              {reservedPlaceholders.some((p) => p.name === 'selection') && (
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {`{selection}`} est réservé : disponible uniquement pour les prompts de l’éditeur.
                </p>
              )}
            </div>
          </div>

          {(formData.context === 'editor' || formData.context === 'both') && (
            <div>
              <label className={labelClass} htmlFor="insertion_mode">
                Mode d&apos;insertion
              </label>
              <CustomSelect
                id="insertion_mode"
                value={formData.insertion_mode ?? ''}
                options={[
                  { value: 'replace', label: 'Remplacer la sélection' },
                  { value: 'append', label: 'Ajouter après la sélection' },
                  { value: 'prepend', label: 'Ajouter avant la sélection' }
                ]}
                onChange={val => handleChange('insertion_mode', val as 'replace' | 'append' | 'prepend')}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-3 cursor-pointer group/check">
              <input
                type="checkbox"
                checked={formData.use_structured_output}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    use_structured_output: e.target.checked,
                    output_schema: e.target.checked
                      ? {
                          type: 'object',
                          properties: {
                            content: {
                              type: 'string',
                              description: 'Le contenu demandé, sans introduction ni explication'
                            }
                          },
                          required: ['content']
                        }
                      : undefined
                  }));
                }}
                className="w-4 h-4 rounded border border-zinc-600 bg-zinc-900/50 text-white focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-zinc-300 group-hover/check:text-zinc-100">Strict Mode</span>
            </label>
            <Tooltip text={strictModeTooltip}>
              <button type="button" className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors" aria-label="Informations Strict Mode">
                <Info className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/60 shrink-0">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-300 text-sm font-medium hover:bg-zinc-800/40 transition-colors"
              onClick={onCancel}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              {prompt ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptFormModal;


