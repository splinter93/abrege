'use client';

import React from 'react';

/**
 * Composant pour injecter les styles CSS de l'éditeur OpenAPI
 * Styles complètement indépendants du reste de l'application
 */
export function OpenAPIEditorStyles() {
  return (
    <style jsx global>{`
      /* Reset et base pour l'éditeur OpenAPI */
      .openapi-editor-page {
        min-height: 100vh;
        background: #0f0f0f;
        color: #f5f5f5;
        font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.6;
      }

      .openapi-editor-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      /* Header */
      .openapi-editor-header {
        text-align: center;
        margin-bottom: 3rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid #2a2a2a;
      }

      .openapi-editor-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #ff6a00;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
      }

      .openapi-editor-subtitle {
        font-size: 1.1rem;
        color: #a0a0a0;
        margin: 0;
        font-weight: 400;
      }

      /* Section principale */
      .openapi-editor-main {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      /* Input Section */
      .schema-input {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
      }

      .schema-input-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0 0 0.5rem 0;
      }

      .schema-input-header p {
        color: #a0a0a0;
        margin: 0 0 1.5rem 0;
        font-size: 0.95rem;
      }

      .schema-input-type-selector {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .schema-input-type-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background: #2a2a2a;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }

      .schema-input-type-option:hover {
        background: #3a3a3a;
        border-color: #ff6a00;
      }

      .schema-input-type-option input[type="radio"] {
        margin: 0;
      }

      .schema-input-type-option input[type="radio"]:checked + span {
        color: #ff6a00;
        font-weight: 500;
      }

      .schema-input-field {
        margin-bottom: 1.5rem;
      }

      .schema-input-field label {
        display: block;
        font-weight: 500;
        color: #f5f5f5;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
      }

      .schema-input-textarea {
        width: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 1rem;
        color: #f5f5f5;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        resize: vertical;
        min-height: 200px;
      }

      .schema-input-textarea:focus {
        outline: none;
        border-color: var(--border-color);
        box-shadow: none;
      }

      .schema-input-url {
        width: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #f5f5f5;
        font-size: 0.95rem;
      }

      .schema-input-url:focus {
        outline: none;
        border-color: var(--border-color);
        box-shadow: none;
      }

      .schema-input-file {
        width: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #f5f5f5;
        font-size: 0.95rem;
      }

      .schema-input-actions {
        display: flex;
        justify-content: center;
        margin-top: 1.5rem;
      }

      .schema-input-submit-button {
        background: #ff6a00;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .schema-input-submit-button:hover:not(:disabled) {
        background: #e55a00;
        transform: translateY(-1px);
      }

      .schema-input-submit-button:disabled {
        background: #4a4a4a;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .schema-input-error {
        background: #2d1b1b;
        border: 1px solid #5a2a2a;
        border-radius: 8px;
        padding: 1rem;
        color: #ff6a6a;
        margin-top: 1rem;
        font-family: 'JetBrains Mono', monospace;
      }

      .schema-input-error pre {
        background: #1a0f0f;
        border: 1px solid #3a1a1a;
        border-radius: 6px;
        padding: 0.75rem;
        margin: 0.5rem 0 0 0;
        overflow-x: auto;
        font-size: 0.85rem;
        line-height: 1.4;
      }

      /* Export Section */
      .export-actions {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
      }

      .export-actions-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0 0 0.5rem 0;
      }

      .export-actions-header p {
        color: #a0a0a0;
        margin: 0 0 1.5rem 0;
        font-size: 0.95rem;
      }

      .export-actions-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }

      .export-button {
        background: #2a2a2a;
        color: #f5f5f5;
        border: 1px solid #3a3a3a;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .export-button:hover:not(:disabled) {
        background: #3a3a3a;
        border-color: #ff6a00;
        transform: translateY(-1px);
      }

      .export-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .copy-button:hover:not(:disabled) {
        background: #1a4d1a;
        border-color: #4ade80;
      }

      .download-button:hover:not(:disabled) {
        background: #1a3a4d;
        border-color: #60a5fa;
      }

      .download-minified-button:hover:not(:disabled) {
        background: #4d1a3a;
        border-color: #f472b6;
      }

      .export-message {
        background: #1a4d1a;
        border: 1px solid #4ade80;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #4ade80;
        font-size: 0.9rem;
        margin-top: 1rem;
      }

      .export-info {
        margin-top: 1.5rem;
      }

      .export-info details {
        color: #a0a0a0;
        font-size: 0.9rem;
      }

      .export-info summary {
        cursor: pointer;
        padding: 0.5rem 0;
        font-weight: 500;
      }

      .export-info ul {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
      }

      .export-info li {
        margin: 0.25rem 0;
      }

      /* Endpoints Section */
      .openapi-editor-endpoints-section {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 2rem;
      }

      .openapi-editor-endpoints-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #2a2a2a;
      }

      .openapi-editor-endpoints-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0;
      }

      .openapi-editor-add-button {
        background: #ff6a00;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .openapi-editor-add-button:hover {
        background: #e55a00;
        transform: translateY(-1px);
      }

      /* Endpoints Grid */
      .endpoints-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 1.5rem;
      }

      .endpoint-card {
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.2s ease;
      }

      .endpoint-card:hover {
        border-color: #3a3a3a;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .endpoint-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .endpoint-method {
        display: flex;
        align-items: center;
      }

      .method-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .method-get { background: #1a4d1a; color: #4ade80; }
      .method-post { background: #1a3a4d; color: #60a5fa; }
      .method-put { background: #4d3a1a; color: #fbbf24; }
      .method-patch { background: #4d1a3a; color: #f472b6; }
      .method-delete { background: #4d1a1a; color: #f87171; }
      .method-default { background: #2a2a2a; color: #a0a0a0; }

      .endpoint-actions {
        display: flex;
        gap: 0.5rem;
      }

      .endpoint-action-button {
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }

      .endpoint-action-button:hover {
        background: #3a3a3a;
        transform: scale(1.05);
      }

      .edit-button:hover {
        background: #1a3a4d;
        border-color: #60a5fa;
      }

      .delete-button:hover {
        background: #4d1a1a;
        border-color: #f87171;
      }

      .endpoint-card-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .endpoint-path {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        color: #a0a0a0;
        background: #1a1a1a;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #2a2a2a;
      }

      .endpoint-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0;
      }

      .endpoint-description {
        color: #a0a0a0;
        font-size: 0.9rem;
        margin: 0;
        line-height: 1.5;
      }

      .endpoint-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .endpoint-tag {
        background: #2a2a2a;
        color: #a0a0a0;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .endpoint-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: #a0a0a0;
      }

      .endpoint-detail {
        display: flex;
        gap: 0.5rem;
      }

      .endpoint-detail strong {
        color: #f5f5f5;
        min-width: 80px;
      }

      .endpoints-empty {
        text-align: center;
        padding: 3rem;
        color: #a0a0a0;
        font-size: 1.1rem;
      }

      /* Endpoint Form */
      .endpoint-form-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 2rem;
      }

      .endpoint-form {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .endpoint-form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #2a2a2a;
      }

      .endpoint-form-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0;
      }

      .endpoint-form-close {
        background: none;
        border: none;
        color: #a0a0a0;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .endpoint-form-close:hover {
        background: #2a2a2a;
        color: #f5f5f5;
      }

      .endpoint-form-content {
        padding: 2rem;
      }

      .endpoint-form-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1rem;
      }

      .endpoint-form-field {
        margin-bottom: 1.5rem;
      }

      .endpoint-form-field label {
        display: block;
        font-weight: 500;
        color: #f5f5f5;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
      }

      .endpoint-form-field input,
      .endpoint-form-field select,
      .endpoint-form-field textarea {
        width: 100%;
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #f5f5f5;
        font-size: 0.95rem;
        transition: all 0.2s ease;
      }

      .endpoint-form-field input:focus,
      .endpoint-form-field select:focus,
      .endpoint-form-field textarea:focus {
        outline: none;
        border-color: var(--border-color);
        box-shadow: none;
      }

      .endpoint-form-field input.error,
      .endpoint-form-field select.error,
      .endpoint-form-field textarea.error {
        border-color: #f87171;
      }

      .field-error {
        display: block;
        color: #f87171;
        font-size: 0.85rem;
        margin-top: 0.25rem;
      }

      .endpoint-form-tags {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .endpoint-form-tag-input {
        display: flex;
        gap: 0.5rem;
      }

      .endpoint-form-tag-input input {
        flex: 1;
      }

      .endpoint-form-add-tag {
        background: #ff6a00;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 50px;
      }

      .endpoint-form-add-tag:hover {
        background: #e55a00;
      }

      .endpoint-form-tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .endpoint-form-tag {
        background: #2a2a2a;
        color: #f5f5f5;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .endpoint-form-tag-remove {
        background: none;
        border: none;
        color: #a0a0a0;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .endpoint-form-tag-remove:hover {
        background: #4a2a2a;
        color: #f87171;
      }

      .endpoint-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #2a2a2a;
      }

      .endpoint-form-cancel {
        background: #2a2a2a;
        color: #f5f5f5;
        border: 1px solid #3a3a3a;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .endpoint-form-cancel:hover {
        background: #3a3a3a;
        border-color: #4a4a4a;
      }

      .endpoint-form-save {
        background: #ff6a00;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .endpoint-form-save:hover {
        background: #e55a00;
        transform: translateY(-1px);
      }

      /* Debug Info */
      .debug-info {
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .debug-info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .debug-info-header h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: #f5f5f5;
        margin: 0;
      }

      .debug-info-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .debug-button {
        background: #2a2a2a;
        color: #f5f5f5;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .debug-button:hover {
        background: #3a3a3a;
        border-color: #ff6a00;
      }

      .debug-info-content {
        background: #0f0f0f;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 1rem;
        max-height: 400px;
        overflow-y: auto;
      }

      .debug-info-output {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        line-height: 1.4;
        color: #a0a0a0;
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .openapi-editor-container {
          padding: 1rem;
        }

        .openapi-editor-title {
          font-size: 2rem;
        }

        .endpoints-grid {
          grid-template-columns: 1fr;
        }

        .endpoint-form-row {
          grid-template-columns: 1fr;
        }

        .export-actions-buttons {
          flex-direction: column;
        }

        .endpoint-form-overlay {
          padding: 1rem;
        }

        .debug-info-actions {
          flex-direction: column;
        }
      }
    `}</style>
  );
}
