'use client';

import React, { useState, useRef } from 'react';

interface SchemaInputProps {
  onSchemaLoad: (input: string | File) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Composant pour charger un schéma OpenAPI
 * Supporte le coller de JSON, l'upload de fichier et les URLs
 */
export function SchemaInput({ onSchemaLoad, isLoading, error }: SchemaInputProps) {
  const [inputType, setInputType] = useState<'json' | 'url' | 'file'>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputType === 'json' && jsonInput.trim()) {
      onSchemaLoad(jsonInput.trim());
    } else if (inputType === 'url' && urlInput.trim()) {
      onSchemaLoad(urlInput.trim());
    } else if (inputType === 'file' && fileInputRef.current?.files?.[0]) {
      onSchemaLoad(fileInputRef.current.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSchemaLoad(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    try {
      JSON.parse(pastedText);
      setJsonInput(pastedText);
      setInputType('json');
    } catch {
      // Pas du JSON valide, on laisse l'utilisateur choisir
    }
  };

  return (
    <div className="schema-input">
      <div className="schema-input-header">
        <h3>Charger un schéma OpenAPI</h3>
        <p>Collez votre JSON, fournissez une URL ou uploadez un fichier</p>
      </div>

      <form onSubmit={handleSubmit} className="schema-input-form">
        {/* Sélection du type d'input */}
        <div className="schema-input-type-selector">
          <label className="schema-input-type-option">
            <input
              type="radio"
              name="inputType"
              value="json"
              checked={inputType === 'json'}
              onChange={(e) => setInputType(e.target.value as 'json')}
            />
            <span>JSON</span>
          </label>
          <label className="schema-input-type-option">
            <input
              type="radio"
              name="inputType"
              value="url"
              checked={inputType === 'url'}
              onChange={(e) => setInputType(e.target.value as 'url')}
            />
            <span>URL</span>
          </label>
          <label className="schema-input-type-option">
            <input
              type="radio"
              name="inputType"
              value="file"
              checked={inputType === 'file'}
              onChange={(e) => setInputType(e.target.value as 'file')}
            />
            <span>Fichier</span>
          </label>
        </div>

        {/* Input JSON */}
        {inputType === 'json' && (
          <div className="schema-input-field">
            <label htmlFor="json-input">Schéma JSON</label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="Collez votre schéma OpenAPI en JSON ici..."
              className="schema-input-textarea"
              rows={8}
            />
          </div>
        )}

        {/* Input URL */}
        {inputType === 'url' && (
          <div className="schema-input-field">
            <label htmlFor="url-input">URL du schéma</label>
            <input
              id="url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
              className="schema-input-url"
            />
          </div>
        )}

        {/* Input Fichier */}
        {inputType === 'file' && (
          <div className="schema-input-field">
            <label htmlFor="file-input">Fichier JSON</label>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileChange}
              className="schema-input-file"
            />
          </div>
        )}

        {/* Bouton de soumission */}
        <div className="schema-input-actions">
          <button
            type="submit"
            disabled={isLoading || (inputType === 'json' && !jsonInput.trim()) || (inputType === 'url' && !urlInput.trim())}
            className="schema-input-submit-button"
          >
            {isLoading ? 'Chargement...' : 'Charger le schéma'}
          </button>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="schema-input-error">
            <strong>Erreur :</strong>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              marginTop: '0.5rem',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              {error}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
