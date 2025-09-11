'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { SchemaInput } from './SchemaInput';
import { EndpointsList } from './EndpointsList';
import { EndpointForm } from './EndpointForm';
import { ExportActions } from './ExportActions';
import { DebugInfo } from './DebugInfo';
import { OpenAPITypes } from './OpenAPITypes';
import { cleanAndValidateSchema, validateOpenAPISchema, formatJSONError } from './jsonUtils';

interface OpenAPIEditorProps {
  schema: object | null;
  onSchemaLoad: (schema: object) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Composant principal de l'éditeur OpenAPI
 * Gère l'état global et orchestre les sous-composants
 */
export function OpenAPIEditor({
  schema,
  onSchemaLoad,
  onError,
  onLoading,
  isLoading,
  error
}: OpenAPIEditorProps) {
  const [currentSchema, setCurrentSchema] = useState<object | null>(schema);
  const [editingEndpoint, setEditingEndpoint] = useState<OpenAPITypes.Endpoint | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Parse les endpoints du schéma OpenAPI
  const endpoints = useMemo(() => {
    if (!currentSchema || typeof currentSchema !== 'object') return [];
    
    const openApiSchema = currentSchema as OpenAPITypes.OpenAPISchema;
    const paths = openApiSchema.paths || {};
    const endpoints: OpenAPITypes.Endpoint[] = [];

    Object.entries(paths).forEach(([path, pathItem]) => {
      if (pathItem && typeof pathItem === 'object') {
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (method && operation && typeof operation === 'object' && 'operationId' in operation) {
            const op = operation as OpenAPITypes.Operation;
            endpoints.push({
              id: `${method.toUpperCase()}_${path}`,
              operationId: op.operationId || `${method.toUpperCase()} ${path}`,
              method: method.toUpperCase(),
              path,
              summary: op.summary || '',
              description: op.description || '',
              tags: op.tags || [],
              parameters: op.parameters || [],
              requestBody: op.requestBody,
              responses: op.responses || {}
            });
          }
        });
      }
    });

    return endpoints;
  }, [currentSchema]);

  // Gestion du chargement de schéma
  const handleSchemaLoad = useCallback(async (input: string | File) => {
    onLoading(true);
    onError(null);

    try {
      let rawText: string;

      if (typeof input === 'string') {
        // URL ou JSON string
        if (input.startsWith('http')) {
          const response = await fetch(input);
          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
          rawText = await response.text();
        } else {
          rawText = input;
        }
      } else {
        // File upload
        rawText = await input.text();
      }

      // Nettoyer et valider le JSON/YAML
      const parseResult = cleanAndValidateSchema(rawText);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.error 
          ? formatJSONError(parseResult.error, parseResult.position, parseResult.context)
          : `Erreur de parsing ${parseResult.format?.toUpperCase() || 'JSON'} inconnue`;
        throw new Error(errorMessage);
      }

      const schemaData = parseResult.data;

      // Valider que c'est un schéma OpenAPI valide
      const validation = validateOpenAPISchema(schemaData);
      if (!validation.valid) {
        throw new Error(validation.error || 'Schéma OpenAPI invalide');
      }

      setCurrentSchema(schemaData);
      onSchemaLoad(schemaData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement du schéma';
      onError(errorMessage);
    } finally {
      onLoading(false);
    }
  }, [onSchemaLoad, onError, onLoading]);

  // Suppression d'un endpoint
  const handleDeleteEndpoint = useCallback((endpointId: string) => {
    if (!currentSchema) return;

    const openApiSchema = { ...currentSchema } as OpenAPITypes.OpenAPISchema;
    const paths = { ...openApiSchema.paths };

    // Trouver et supprimer l'endpoint
    Object.entries(paths).forEach(([path, pathItem]) => {
      if (pathItem && typeof pathItem === 'object') {
        Object.entries(pathItem).forEach(([method, operation]) => {
          const id = `${method.toUpperCase()}_${path}`;
          if (id === endpointId) {
            const newPathItem = { ...pathItem };
            delete newPathItem[method];
            
            if (Object.keys(newPathItem).length === 0) {
              delete paths[path];
            } else {
              paths[path] = newPathItem;
            }
          }
        });
      }
    });

    const newSchema = { ...openApiSchema, paths };
    setCurrentSchema(newSchema);
    onSchemaLoad(newSchema);
  }, [currentSchema, onSchemaLoad]);

  // Ajout/modification d'un endpoint
  const handleSaveEndpoint = useCallback((endpoint: OpenAPITypes.Endpoint) => {
    if (!currentSchema) return;

    const openApiSchema = { ...currentSchema } as OpenAPITypes.OpenAPISchema;
    const paths = { ...openApiSchema.paths };

    // Créer l'opération
    const operation: OpenAPITypes.Operation = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses
    };

    // Ajouter à paths
    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {};
    }
    paths[endpoint.path] = {
      ...paths[endpoint.path],
      [endpoint.method.toLowerCase()]: operation
    };

    const newSchema = { ...openApiSchema, paths };
    setCurrentSchema(newSchema);
    onSchemaLoad(newSchema);
    setEditingEndpoint(null);
    setShowAddForm(false);
  }, [currentSchema, onSchemaLoad]);

  // Annulation de l'édition
  const handleCancelEdit = useCallback(() => {
    setEditingEndpoint(null);
    setShowAddForm(false);
  }, []);

  return (
    <div className="openapi-editor">
      {/* Zone d'input pour charger le schéma */}
      <div className="openapi-editor-input-section">
        <SchemaInput
          onSchemaLoad={handleSchemaLoad}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Outils de débogage */}
      <DebugInfo onSchemaLoad={handleSchemaLoad} />

      {/* Actions d'export */}
      {currentSchema && (
        <div className="openapi-editor-export-section">
          <ExportActions schema={currentSchema} />
        </div>
      )}

      {/* Liste des endpoints */}
      {endpoints.length > 0 && (
        <div className="openapi-editor-endpoints-section">
          <div className="openapi-editor-endpoints-header">
            <h2>Endpoints ({endpoints.length})</h2>
            <button
              className="openapi-editor-add-button"
              onClick={() => setShowAddForm(true)}
            >
              + Ajouter un endpoint
            </button>
          </div>
          
          <EndpointsList
            endpoints={endpoints}
            onEdit={(endpoint) => setEditingEndpoint(endpoint)}
            onDelete={handleDeleteEndpoint}
          />
        </div>
      )}

      {/* Formulaire d'ajout/modification */}
      {(showAddForm || editingEndpoint) && (
        <div className="openapi-editor-form-section">
          <EndpointForm
            endpoint={editingEndpoint}
            onSave={handleSaveEndpoint}
            onCancel={handleCancelEdit}
          />
        </div>
      )}
    </div>
  );
}
