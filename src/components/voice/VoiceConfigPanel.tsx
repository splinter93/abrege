'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { XAIVoiceTool, XAIVoicePredefinedToolType } from '@/services/xai/types';
import { parseOpenApiToVoiceTools } from '@/services/xai/utils/openApiToVoiceTools';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Type pour un schéma OpenAPI (liste)
 */
interface OpenApiSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
}

/**
 * Props du composant VoiceConfigPanel
 */
export interface VoiceConfigPanelProps {
  onConfigChange: (config: {
    instructions: string;
    tools: XAIVoiceTool[];
    tool_choice: 'auto' | 'none' | 'required';
  }) => void;
}

/**
 * Composant de configuration pour XAI Voice
 * 
 * Permet de configurer :
 * - Instructions système
 * - Tools prédéfinis (file_search, web_search, x_search)
 * - Tools OpenAPI (via sélection d'un schéma)
 * - Tool choice (auto/none/required)
 */
export function VoiceConfigPanel({ onConfigChange }: VoiceConfigPanelProps) {
  const [instructions, setInstructions] = useState<string>('You are a helpful AI assistant. Respond naturally and concisely.');
  const [predefinedTools, setPredefinedTools] = useState<Set<XAIVoicePredefinedToolType>>(new Set());
  const [availableSchemas, setAvailableSchemas] = useState<OpenApiSchema[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [openApiTools, setOpenApiTools] = useState<XAIVoiceTool[]>([]);
  const [openApiError, setOpenApiError] = useState<string | null>(null);
  const [openApiLoading, setOpenApiLoading] = useState<boolean>(false);
  const [toolChoice, setToolChoice] = useState<'auto' | 'none' | 'required'>('auto');

  /**
   * Charger la liste des schémas disponibles
   */
  useEffect(() => {
    const loadSchemas = async () => {
      try {
        const response = await fetch('/api/ui/openapi-schemas');
        const data = await response.json();
        if (data.success && data.schemas) {
          setAvailableSchemas(data.schemas);
        }
      } catch (error) {
        logger.error(LogCategory.AUDIO, '[VoiceConfigPanel] Erreur chargement schémas', undefined, error instanceof Error ? error : new Error(String(error)));
      }
    };
    loadSchemas();
  }, []);

  /**
   * Charger et parser un schéma OpenAPI sélectionné
   */
  useEffect(() => {
    if (!selectedSchemaId) {
      setOpenApiTools([]);
      setOpenApiError(null);
      return;
    }

    const loadSchema = async () => {
      setOpenApiLoading(true);
      setOpenApiError(null);
      
      try {
        const response = await fetch(`/api/ui/openapi-schemas/${selectedSchemaId}/content`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Erreur ${response.status}` }));
          throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.schema?.content) {
          throw new Error(data.error || 'Schéma non trouvé');
        }

        const tools = parseOpenApiToVoiceTools(data.schema.content);
        setOpenApiTools(tools);
        logger.info(LogCategory.AUDIO, '[VoiceConfigPanel] Schéma chargé et parsé', {
          schemaId: selectedSchemaId,
          schemaName: data.schema.name,
          toolsCount: tools.length
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur lors du chargement du schéma';
        setOpenApiError(errorMsg);
        setOpenApiTools([]);
        logger.error(LogCategory.AUDIO, '[VoiceConfigPanel] Erreur chargement schéma', undefined, error instanceof Error ? error : new Error(String(error)));
      } finally {
        setOpenApiLoading(false);
      }
    };

    loadSchema();
  }, [selectedSchemaId]);

  /**
   * Toggle un tool prédéfini
   */
  const togglePredefinedTool = useCallback((toolType: XAIVoicePredefinedToolType) => {
    setPredefinedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolType)) {
        next.delete(toolType);
      } else {
        next.add(toolType);
      }
      return next;
    });
  }, []);

  /**
   * Construire la config complète et notifier le parent
   */
  const buildAndNotifyConfig = useCallback(() => {
    const predefinedToolsArray: XAIVoiceTool[] = Array.from(predefinedTools).map(type => ({ type }));
    const allTools = [...predefinedToolsArray, ...openApiTools];

    onConfigChange({
      instructions,
      tools: allTools,
      tool_choice: toolChoice
    });
  }, [instructions, predefinedTools, openApiTools, toolChoice, onConfigChange]);

  // Notifier le parent quand la config change
  React.useEffect(() => {
    buildAndNotifyConfig();
  }, [instructions, predefinedTools, openApiTools, toolChoice, buildAndNotifyConfig]);

  return (
    <div className="voice-config-panel" style={{
      padding: '1.5rem',
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: '12px',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#e5e5e5', fontSize: '1.25rem' }}>
        Configuration Voice
      </h3>

      {/* Instructions */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.875rem' }}>
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.75rem',
            background: '#131313',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
          placeholder="You are a helpful AI assistant..."
        />
      </div>

      {/* Tools prédéfinis */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.875rem' }}>
          Tools prédéfinis
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {(['file_search', 'web_search', 'x_search'] as XAIVoicePredefinedToolType[]).map(toolType => (
            <label key={toolType} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#e5e5e5' }}>
              <input
                type="checkbox"
                checked={predefinedTools.has(toolType)}
                onChange={() => togglePredefinedTool(toolType)}
                style={{ cursor: 'pointer' }}
              />
              <span>{toolType}</span>
            </label>
          ))}
        </div>
      </div>

      {/* OpenAPI Schema Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.875rem' }}>
          OpenAPI Schema
        </label>
        <select
          value={selectedSchemaId}
          onChange={(e) => setSelectedSchemaId(e.target.value)}
          disabled={openApiLoading}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#131313',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            color: '#e5e5e5',
            fontSize: '0.875rem',
            cursor: openApiLoading ? 'wait' : 'pointer',
            opacity: openApiLoading ? 0.6 : 1
          }}
        >
          <option value="">Aucun schéma sélectionné</option>
          {availableSchemas.map(schema => (
            <option key={schema.id} value={schema.id}>
              {schema.name} {schema.version ? `(v${schema.version})` : ''}
              {schema.description ? ` - ${schema.description}` : ''}
            </option>
          ))}
        </select>
        {openApiLoading && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', color: '#a3a3a3', fontSize: '0.875rem' }}>
            Chargement du schéma...
          </div>
        )}
        {openApiError && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#3a1a1a', border: '1px solid #5a2a2a', borderRadius: '6px', color: '#ff6b6b', fontSize: '0.875rem' }}>
            {openApiError}
          </div>
        )}
        {openApiTools.length > 0 && !openApiError && !openApiLoading && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#1a3a1a', border: '1px solid #2a5a2a', borderRadius: '6px', color: '#6bff6b', fontSize: '0.875rem' }}>
            {openApiTools.length} tool(s) chargé(s) depuis le schéma
          </div>
        )}
      </div>

      {/* Tool choice */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.875rem' }}>
          Tool Choice
        </label>
        <select
          value={toolChoice}
          onChange={(e) => setToolChoice(e.target.value as 'auto' | 'none' | 'required')}
          style={{
            padding: '0.5rem',
            background: '#131313',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            color: '#e5e5e5',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option value="auto">Auto</option>
          <option value="none">None</option>
          <option value="required">Required</option>
        </select>
      </div>
    </div>
  );
}

