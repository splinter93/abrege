'use client';

import React, { useState, useCallback } from 'react';
import { OpenAPIEditor } from '@/components/OpenAPIEditor/OpenAPIEditor';
import { OpenAPIEditorStyles } from '@/components/OpenAPIEditor/OpenAPIEditorStyles';

/**
 * Page standalone pour l'éditeur visuel de schéma OpenAPI
 * Interface complètement indépendante du reste de l'application
 */
export default function OpenAPIEditorPage() {
  const [schema, setSchema] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSchemaLoad = useCallback((newSchema: object) => {
    setSchema(newSchema);
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setSchema(null);
  }, []);

  const handleLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="openapi-editor-page">
      <OpenAPIEditorStyles />
      
      <div className="openapi-editor-container">
        <header className="openapi-editor-header">
          <h1 className="openapi-editor-title">
            OpenAPI Schema Editor
          </h1>
          <p className="openapi-editor-subtitle">
            Éditeur visuel pour créer et modifier des schémas OpenAPI
          </p>
        </header>

        <main className="openapi-editor-main">
          <OpenAPIEditor
            schema={schema}
            onSchemaLoad={handleSchemaLoad}
            onError={handleError}
            onLoading={handleLoading}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
}
