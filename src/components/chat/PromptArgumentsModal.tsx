/**
 * Modal for collecting prompt placeholder values before insertion in chat.
 * @module components/chat/PromptArgumentsModal
 */

'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';
import './PromptArgumentsModal.css';

interface PromptArgumentsModalProps {
  prompt: EditorPrompt | null;
  initialValues?: Record<string, string>;
  onCancel: () => void;
  onConfirm: (values: Record<string, string>) => void;
}

const PromptArgumentsModal: React.FC<PromptArgumentsModalProps> = ({
  prompt,
  initialValues,
  onCancel,
  onConfirm
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const placeholders = useMemo(() => {
    if (!prompt) {
      return [];
    }
    return parsePromptPlaceholders(prompt.prompt_template);
  }, [prompt]);

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
    } else {
      setValues({});
    }
    setTouched({});
  }, [initialValues, prompt]);

  if (!prompt || placeholders.length === 0) {
    return null;
  }

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const isValid = placeholders.every((placeholder) => {
    const value = values[placeholder.name];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      setTouched(
        placeholders.reduce<Record<string, boolean>>((acc, placeholder) => {
          acc[placeholder.name] = true;
          return acc;
        }, {})
      );
      return;
    }
    onConfirm(
      placeholders.reduce<Record<string, string>>((acc, placeholder) => {
        const value = values[placeholder.name] ?? '';
        acc[placeholder.name] = value.trim();
        return acc;
      }, {})
    );
  };

  return (
    <div
      className="prompt-arguments-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="prompt-arguments-modal" onClick={(event) => event.stopPropagation()}>
        <div className="prompt-arguments-header">
          <h3 className="prompt-arguments-title">Compléter le prompt</h3>
          <p className="prompt-arguments-subtitle">
            {prompt.name} — {placeholders.length} argument
            {placeholders.length > 1 ? 's' : ''}
          </p>
        </div>

        <form className="prompt-arguments-form" onSubmit={handleSubmit}>
          <div className="prompt-arguments-inputs">
            {placeholders.map((placeholder) => {
              const key = placeholder.name;
              const value = values[key] ?? '';
              const hasError = touched[key] && value.trim().length === 0;
              return (
                <label key={key} className="prompt-arguments-field">
                  <span className="prompt-arguments-label">{`{${key}}`}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(event) => handleChange(key, event.target.value)}
                    onBlur={() => handleBlur(key)}
                    className={`prompt-arguments-input${hasError ? ' error' : ''}`}
                    autoFocus={placeholders[0].name === key}
                  />
                  {hasError && (
                    <span className="prompt-arguments-error">Ce champ est requis</span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="prompt-arguments-actions">
            <button type="button" className="prompt-arguments-button secondary" onClick={onCancel}>
              Annuler
            </button>
            <button type="submit" className="prompt-arguments-button primary" disabled={!isValid}>
              Insérer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptArgumentsModal;


