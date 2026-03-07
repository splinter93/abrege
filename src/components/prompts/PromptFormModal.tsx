/**
 * Formulaire de création/édition d'un prompt — vue in-page (pas de modale/overlay)
 * Header fixe sticky avec titre + Annuler / Enregistrer, contenu scrollable.
 * @module components/prompts/PromptFormModal
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import IconPicker from './IconPicker';
import { getIconComponent } from '@/utils/iconMapper';
import { ArrowLeft, Info } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import Tooltip from '@/components/Tooltip';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import HighlightedTextarea from './HighlightedTextarea';

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
  onCancel,
}) => {
  const [formData, setFormData] = useState<EditorPromptCreateRequest>({
    name: '',
    prompt_template: '',
    icon: 'FiZap',
    context: 'editor',
    agent_id: null,
    insertion_mode: 'replace',
    use_structured_output: false,
  });

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const placeholders = useMemo(
    () => parsePromptPlaceholders(formData.prompt_template),
    [formData.prompt_template]
  );

  const reservedPlaceholders = useMemo(
    () =>
      parsePromptPlaceholders(formData.prompt_template, { includeReserved: true }).filter(
        (p) => p.isReserved
      ),
    [formData.prompt_template]
  );

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        prompt_template: prompt.prompt_template,
        icon: prompt.icon,
        context: prompt.context || 'editor',
        agent_id: prompt.agent_id ?? null,
        insertion_mode: prompt.insertion_mode || 'replace',
        use_structured_output: prompt.use_structured_output || false,
      });
    }
  }, [prompt]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Le nom ne peut pas dépasser 100 caractères';
    }

    if (!formData.prompt_template.trim()) {
      newErrors.prompt_template = 'Le template est requis';
    }

    const hasSelectionConflict =
      reservedPlaceholders.some((p) => p.name === 'selection') &&
      formData.context !== 'editor';

    if (hasSelectionConflict) {
      newErrors.prompt_template =
        'Le placeholder {selection} est réservé à l\'éditeur. Adaptez le contexte ou retirez-le.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ ...formData, agent_id: formData.agent_id ?? null });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EditorPromptCreateRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const SelectedIcon = getIconComponent(formData.icon);
  const isDefaultIcon = !prompt && formData.icon === 'FiZap';
  const hasSelectedIcon = !isDefaultIcon;
  const pageTitle = formData.name.trim() || (prompt ? prompt.name : 'Nouveau prompt');

  // En création : dès qu'on a un nom ou un template, on considère qu'il y a des modifs
  // En édition : compare champ par champ avec l'état initial
  const hasChanges = !prompt
    ? formData.name.trim().length > 0 || formData.prompt_template.trim().length > 0
    : (
        formData.name !== (prompt.name ?? '') ||
        formData.prompt_template !== (prompt.prompt_template ?? '') ||
        formData.icon !== (prompt.icon ?? 'FiZap') ||
        (formData.context ?? 'editor') !== (prompt.context ?? 'editor') ||
        (formData.agent_id ?? null) !== (prompt.agent_id ?? null) ||
        (formData.insertion_mode ?? 'replace') !== (prompt.insertion_mode ?? 'replace') ||
        (formData.use_structured_output ?? false) !== (prompt.use_structured_output ?? false)
      );

  const strictModeTooltip =
    'Active le mode JSON pour supprimer les phrases parasites du LLM.\nExemples : "Voici la correction", "J\'ai reformulé".';

  return (
    <div className="page-content-inner page-content-inner-prompt-form bg-[var(--color-bg-primary)] w-full max-w-none mx-0 flex flex-col min-h-full">

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-20 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-zinc-800/60 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Gauche : retour + titre */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700/60 transition-colors shrink-0"
                aria-label="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-100 font-medium truncate">{pageTitle}</span>
            </div>

            {/* Droite : Annuler + Enregistrer — visibles uniquement si modif */}
            {hasChanges && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-300 text-sm font-medium hover:bg-zinc-800/40 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit as unknown as React.MouseEventHandler}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {saving ? 'Enregistrement…' : (prompt ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Nom + Icône */}
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

            {/* Contexte + Agent */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              <div className="flex-1 min-w-0">
                <label className={labelClass} htmlFor="context">
                  Contexte
                </label>
                <CustomSelect
                  id="context"
                  value={formData.context ?? 'editor'}
                  options={[
                    { value: 'editor', label: 'Éditeur' },
                    { value: 'chat', label: 'Chat' },
                    { value: 'both', label: 'Éditeur & Chat' },
                  ]}
                  onChange={(val) => handleChange('context', val as 'editor' | 'chat' | 'both')}
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
                      .filter((a) => a.is_active)
                      .map((agent) => ({ value: agent.id, label: agent.name })),
                  ]}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, agent_id: val ? val : null }));
                    if (errors.agent_id) {
                      setErrors((prev) => {
                        const { agent_id, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Template */}
            <div>
              <label className={labelClass} htmlFor="prompt_template">
                Template du prompt *
              </label>
            <HighlightedTextarea
              id="prompt_template"
              value={formData.prompt_template}
              onChange={(val) => handleChange('prompt_template', val)}
              placeholder="Exemple: Améliore ce texte : {selection}"
              rows={6}
              hasError={!!errors.prompt_template}
            />
              {errors.prompt_template && (
                <span className="mt-1 block text-xs text-red-400">{errors.prompt_template}</span>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-500">
                  Utilisez{' '}
                  <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono text-[11px]">
                    {'{selection}'}
                  </code>{' '}
                  pour insérer le texte sélectionné
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.use_structured_output}
                      aria-label="Strict Mode"
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          use_structured_output: e.target.checked,
                          output_schema: e.target.checked
                            ? {
                                type: 'object',
                                properties: {
                                  content: {
                                    type: 'string',
                                    description:
                                      'Le contenu demandé, sans introduction ni explication',
                                  },
                                },
                                required: ['content'],
                              }
                            : undefined,
                        }));
                      }}
                      className="prompt-strict-checkbox"
                    />
                    <span className="text-sm font-medium text-zinc-400">Strict Mode</span>
                  </label>
                  <Tooltip text={strictModeTooltip}>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
                      aria-label="Informations Strict Mode"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Arguments détectés */}
              <div className="mt-4 p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Arguments détectés
                  </span>
                  <span className="min-w-[24px] h-6 px-1.5 rounded-md bg-zinc-800/60 text-zinc-400 text-xs font-medium flex items-center justify-center">
                    {placeholders.length}
                  </span>
                </div>
                {placeholders.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {placeholders.map((p) => (
                      <li key={p.name}>
                        <code className="px-2 py-0.5 rounded-md bg-zinc-800/60 font-mono text-[11px] text-zinc-400">
                          {`{${p.name}}`}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">Aucun argument personnalisé.</p>
                )}
                {reservedPlaceholders.some((p) => p.name === 'selection') && (
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    {`{selection}`} est réservé : disponible uniquement pour les prompts de l&apos;éditeur.
                  </p>
                )}
              </div>
            </div>

            {/* Mode d'insertion */}
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
                    { value: 'prepend', label: 'Ajouter avant la sélection' },
                  ]}
                  onChange={(val) =>
                    handleChange('insertion_mode', val as 'replace' | 'append' | 'prepend')
                  }
                />
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default PromptFormModal;
