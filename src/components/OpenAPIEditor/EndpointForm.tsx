'use client';

import React, { useState, useEffect } from 'react';
import { OpenAPITypes } from './OpenAPITypes';

interface EndpointFormProps {
  endpoint?: OpenAPITypes.Endpoint | null;
  onSave: (endpoint: OpenAPITypes.Endpoint) => void;
  onCancel: () => void;
}

/**
 * Formulaire pour ajouter ou modifier un endpoint
 * Gère la validation et la création des données d'endpoint
 */
export function EndpointForm({ endpoint, onSave, onCancel }: EndpointFormProps) {
  const [formData, setFormData] = useState<OpenAPITypes.EndpointFormData>({
    operationId: '',
    method: 'GET',
    path: '',
    summary: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!endpoint;

  useEffect(() => {
    if (endpoint) {
      setFormData({
        operationId: endpoint.operationId,
        method: endpoint.method,
        path: endpoint.path,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags
      });
    } else {
      setFormData({
        operationId: '',
        method: 'GET',
        path: '',
        summary: '',
        description: '',
        tags: []
      });
    }
    setErrors({});
  }, [endpoint]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.operationId.trim()) {
      newErrors.operationId = 'L\'ID d\'opération est requis';
    }

    if (!formData.path.trim()) {
      newErrors.path = 'Le chemin est requis';
    } else if (!formData.path.startsWith('/')) {
      newErrors.path = 'Le chemin doit commencer par /';
    }

    if (!formData.summary.trim()) {
      newErrors.summary = 'Le résumé est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newEndpoint: OpenAPITypes.Endpoint = {
      id: endpoint?.id || `${formData.method.toUpperCase()}_${formData.path}`,
      operationId: formData.operationId.trim(),
      method: formData.method.toUpperCase(),
      path: formData.path.trim(),
      summary: formData.summary.trim(),
      description: formData.description.trim(),
      tags: formData.tags,
      parameters: endpoint?.parameters || [],
      requestBody: endpoint?.requestBody,
      responses: endpoint?.responses || {
        '200': {
          description: 'Succès'
        }
      }
    };

    onSave(newEndpoint);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="endpoint-form-overlay">
      <div className="endpoint-form">
        <div className="endpoint-form-header">
          <h3>{isEditing ? 'Modifier l\'endpoint' : 'Ajouter un endpoint'}</h3>
          <button
            type="button"
            className="endpoint-form-close"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="endpoint-form-content">
          <div className="endpoint-form-row">
            <div className="endpoint-form-field">
              <label htmlFor="operationId">ID d'opération *</label>
              <input
                id="operationId"
                type="text"
                value={formData.operationId}
                onChange={(e) => setFormData(prev => ({ ...prev, operationId: e.target.value }))}
                placeholder="getUserById"
                className={errors.operationId ? 'error' : ''}
              />
              {errors.operationId && <span className="field-error">{errors.operationId}</span>}
            </div>

            <div className="endpoint-form-field">
              <label htmlFor="method">Méthode *</label>
              <select
                id="method"
                value={formData.method}
                onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div className="endpoint-form-field">
            <label htmlFor="path">Chemin *</label>
            <input
              id="path"
              type="text"
              value={formData.path}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="/api/users/{id}"
              className={errors.path ? 'error' : ''}
            />
            {errors.path && <span className="field-error">{errors.path}</span>}
          </div>

          <div className="endpoint-form-field">
            <label htmlFor="summary">Résumé *</label>
            <input
              id="summary"
              type="text"
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Récupérer un utilisateur par ID"
              className={errors.summary ? 'error' : ''}
            />
            {errors.summary && <span className="field-error">{errors.summary}</span>}
          </div>

          <div className="endpoint-form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description détaillée de l'endpoint..."
              rows={3}
            />
          </div>

          <div className="endpoint-form-field">
            <label>Tags</label>
            <div className="endpoint-form-tags">
              <div className="endpoint-form-tag-input">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ajouter un tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="endpoint-form-add-tag"
                >
                  +
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="endpoint-form-tag-list">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="endpoint-form-tag">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="endpoint-form-tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="endpoint-form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="endpoint-form-cancel"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="endpoint-form-save"
            >
              {isEditing ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
