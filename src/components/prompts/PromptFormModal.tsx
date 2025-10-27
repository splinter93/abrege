/**
 * Modal de formulaire pour créer/éditer un prompt
 * @module components/prompts/PromptFormModal
 */

import React, { useState, useEffect } from 'react';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import IconPicker from './IconPicker';
import { getIconComponent } from '@/utils/iconMapper';
import { FiX } from 'react-icons/fi';
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
    agent_id: undefined,
    description: '',
    category: '',
    insertion_mode: 'replace',
    use_structured_output: false
  });

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialiser le formulaire si on édite un prompt
  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        prompt_template: prompt.prompt_template,
        icon: prompt.icon,
        context: prompt.context || 'editor',
        agent_id: prompt.agent_id || undefined,
        description: prompt.description || '',
        category: prompt.category || '',
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

    if (!formData.prompt_template.trim()) {
      newErrors.prompt_template = 'Le template est requis';
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

    await onSave(formData);
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
          {/* Nom du prompt */}
          <div className="prompt-form-group">
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

          {/* Description */}
          <div className="prompt-form-group">
            <label className="prompt-form-label" htmlFor="description">
              Description
            </label>
            <input
              id="description"
              type="text"
              className="prompt-form-input"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description optionnelle"
            />
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
          </div>

          {/* Icône */}
          <div className="prompt-form-group">
            <label className="prompt-form-label">Icône</label>
            <button
              type="button"
              className="prompt-icon-selector"
              onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
            >
              <SelectedIcon size={20} />
              <span>Changer l'icône</span>
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

          {/* Agent */}
          <div className="prompt-form-group">
            <label className="prompt-form-label" htmlFor="agent_id">
              Agent spécialisé *
            </label>
            <select
              id="agent_id"
              className="prompt-form-select"
              value={formData.agent_id || ''}
              onChange={(e) => handleChange('agent_id', e.target.value)}
            >
              <option value="">Sélectionnez un agent</option>
              {agents
                .filter(a => a.is_active)
                .map(agent => {
                  // Déduire le provider depuis le modèle
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

          {/* Catégorie */}
          <div className="prompt-form-group">
            <label className="prompt-form-label" htmlFor="category">
              Catégorie
            </label>
            <select
              id="category"
              className="prompt-form-select"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              <option value="">Aucune</option>
              <option value="writing">Writing</option>
              <option value="code">Code</option>
              <option value="translate">Translate</option>
              <option value="analysis">Analysis</option>
              <option value="learning">Learning</option>
              <option value="brainstorm">Brainstorm</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Contexte d'utilisation */}
          <div className="prompt-form-group">
            <label className="prompt-form-label">
              Contexte d'utilisation
            </label>
            <div className="prompt-context-options">
              <label className="prompt-context-option">
                <input
                  type="radio"
                  name="context"
                  value="editor"
                  checked={formData.context === 'editor'}
                  onChange={(e) => handleChange('context', e.target.value)}
                />
                <span>📝 Éditeur uniquement</span>
              </label>
              <label className="prompt-context-option">
                <input
                  type="radio"
                  name="context"
                  value="chat"
                  checked={formData.context === 'chat'}
                  onChange={(e) => handleChange('context', e.target.value)}
                />
                <span>💬 Chat uniquement</span>
              </label>
              <label className="prompt-context-option">
                <input
                  type="radio"
                  name="context"
                  value="both"
                  checked={formData.context === 'both'}
                  onChange={(e) => handleChange('context', e.target.value)}
                />
                <span>📝💬 Les deux</span>
              </label>
            </div>
            <small className="prompt-form-hint">
              Choisissez où ce prompt sera disponible en tant que slash command
            </small>
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
            <small className="prompt-form-hint">
              <strong>Replace:</strong> pour corriger, reformuler, simplifier<br />
              <strong>Append:</strong> pour expliquer, développer, continuer<br />
              <strong>Prepend:</strong> pour ajouter une intro
            </small>
          </div>
          )}

          {/* Structured Output */}
          <div className="prompt-form-group">
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
                Format strict (structured output)
              </span>
            </label>
            <small className="prompt-form-hint">
              Active le mode JSON pour éliminer les phrases parasites du LLM<br />
              (ex: "Voici la correction:", "J'ai reformulé...")
            </small>
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


