/**
 * Modal de formulaire pour créer/éditer un prompt
 * @module components/prompts/PromptFormModal
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import IconPicker from './IconPicker';
import { getIconComponent } from '@/utils/iconMapper';
import { FiX, FiInfo } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import './PromptFormModal.css';

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
    <div className="prompt-modal-overlay" onClick={onCancel}>
      <div className="prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-modal-header">
          <h2 className="prompt-modal-title">
            {prompt ? 'Modifier le prompt' : 'Nouveau prompt'}
          </h2>
          <button
            className="prompt-modal-close"
            onClick={onCancel}
            type="button"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="prompt-modal-form">
          <div className="prompt-form-row">
            {/* Nom du prompt */}
            <div className="prompt-form-group prompt-form-group--grow">
              <label className="prompt-form-label" htmlFor="name">
                Nom du prompt *
              </label>
              <input
                id="name"
                type="text"
                className={`prompt-form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Améliorer l'écriture"
                maxLength={100}
              />
              {errors.name && <span className="prompt-form-error">{errors.name}</span>}
            </div>

            {/* Icône */}
            <div className="prompt-form-group prompt-form-group--icon">
              <label className="prompt-form-label" htmlFor="icon-selector">
                Icône
              </label>
              <button
                id="icon-selector"
                type="button"
                className={`prompt-icon-selector ${hasSelectedIcon ? 'prompt-icon-selector--icon' : 'prompt-icon-selector--empty'}`}
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
              >
                {hasSelectedIcon ? (
                  <SelectedIcon size={20} />
                ) : (
                  <span className="prompt-icon-selector__placeholder">Choisir</span>
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

          <div className="prompt-form-row prompt-form-row--top">
            {/* Contexte */}
            <div className="prompt-form-group prompt-form-group--grow">
              <label className="prompt-form-label" htmlFor="context">
                Contexte
              </label>
              <select
                id="context"
                className="prompt-form-select"
                value={formData.context}
                onChange={(e) => handleChange('context', e.target.value)}
              >
                <option value="editor">Éditeur</option>
                <option value="chat">Chat</option>
                <option value="both">Éditeur & Chat</option>
              </select>
            </div>

            {/* Agent */}
            <div className="prompt-form-group prompt-form-group--agent">
              <label className="prompt-form-label" htmlFor="agent_id">
                Agent spécialisé
              </label>
              <select
                id="agent_id"
                className="prompt-form-select"
                value={formData.agent_id ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    agent_id: value ? value : null
                  }));
                  if (errors.agent_id) {
                    setErrors(prevErrors => {
                      const { agent_id, ...rest } = prevErrors;
                      return rest;
                    });
                  }
                }}
              >
                <option value="">Aucun agent</option>
                {agents
                  .filter(a => a.is_active)
                  .map(agent => {
                    const model = agent.model || '';
                    const providerIcon = model.includes('grok') ? '🤖' : '⚡';
                    return (
                      <option key={agent.id} value={agent.id}>
                        {providerIcon} {agent.name}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Template du prompt */}
          <div className="prompt-form-group">
            <label className="prompt-form-label" htmlFor="prompt_template">
              Template du prompt *
            </label>
            <textarea
              id="prompt_template"
              className={`prompt-form-textarea ${errors.prompt_template ? 'error' : ''}`}
              value={formData.prompt_template}
              onChange={(e) => handleChange('prompt_template', e.target.value)}
              placeholder="Exemple: Améliore ce texte : {selection}"
              rows={4}
            />
            {errors.prompt_template && (
              <span className="prompt-form-error">{errors.prompt_template}</span>
            )}
            <small className="prompt-form-hint">
              Utilisez <code>{'{selection}'}</code> pour insérer le texte sélectionné
            </small>

            <div className="prompt-placeholder-summary">
              <div className="prompt-placeholder-summary__header">
                <span className="prompt-placeholder-summary__title">Arguments détectés</span>
                <span className="prompt-placeholder-summary__count">
                  {placeholders.length}
                </span>
              </div>

              {placeholders.length > 0 ? (
                <ul className="prompt-placeholder-summary__list">
                  {placeholders.map((placeholder) => (
                    <li key={placeholder.name} className="prompt-placeholder-summary__item">
                      <code>{`{${placeholder.name}}`}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="prompt-placeholder-summary__empty">Aucun argument personnalisé.</p>
              )}

              {reservedPlaceholders.some((placeholder) => placeholder.name === 'selection') && (
                <p className="prompt-placeholder-summary__hint">
                  {`{selection}`} est un placeholder réservé : il n’est disponible que pour les prompts de l’éditeur.
                </p>
              )}
            </div>
          </div>

          {/* Mode d'insertion (uniquement pour editor) */}
          {(formData.context === 'editor' || formData.context === 'both') && (
          <div className="prompt-form-group">
            <label className="prompt-form-label" htmlFor="insertion_mode">
              Mode d'insertion
            </label>
            <select
              id="insertion_mode"
              className="prompt-form-select"
              value={formData.insertion_mode}
              onChange={(e) => handleChange('insertion_mode', e.target.value)}
            >
              <option value="replace">Remplacer la sélection</option>
              <option value="append">Ajouter après la sélection</option>
              <option value="prepend">Ajouter avant la sélection</option>
            </select>
          </div>
          )}

          {/* Structured Output */}
          <div className="prompt-form-group">
            <div className="prompt-form-checkbox-row">
              <label className="prompt-form-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={formData.use_structured_output}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      use_structured_output: e.target.checked,
                      // Générer automatiquement le schéma quand activé
                      output_schema: e.target.checked ? {
                        type: 'object',
                        properties: {
                          content: {
                            type: 'string',
                            description: 'Le contenu demandé, sans introduction ni explication'
                          }
                        },
                        required: ['content']
                      } : undefined
                    }));
                  }}
                />
                <span className="prompt-form-checkbox-label">
                  Strict Mode
                </span>
              </label>
              <Tooltip text={strictModeTooltip}>
                <button
                  type="button"
                  className="prompt-form-info-icon"
                  aria-label="Informations Strict Mode"
                >
                  <FiInfo size={16} />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="prompt-modal-footer">
            <button
              type="button"
              className="prompt-btn prompt-btn-secondary"
              onClick={onCancel}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="prompt-btn prompt-btn-primary"
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


