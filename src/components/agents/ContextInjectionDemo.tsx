/**
 * Composant de démonstration de l'injection de contexte UI
 * Permet de tester le système d'injection de contexte dans les agents
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUIContext } from '@/hooks/useUIContext';
import { agentTemplateService, AgentTemplateConfig } from '@/services/llm/agentTemplateService';
import { contextCollector, UIContext } from '@/services/llm/ContextCollector';

export default function ContextInjectionDemo() {
  const [agentConfig, setAgentConfig] = useState<AgentTemplateConfig>({
    system_instructions: 'Tu es Harvey, l\'assistant en chef sur l\'application Scrivia. Tu es empathique, humain et motivant.',
    personality: 'Assistant IA professionnel et serviable',
    expertise: ['assistance générale', 'gestion de notes'],
    capabilities: ['text', 'function_calling']
  });

  const [renderedTemplate, setRenderedTemplate] = useState<string>('');
  const [uiContext, setUIContext] = useState<UIContext | null>(null);

  // Collecter le contexte UI actuel
  const currentUIContext = useUIContext({
    activeNote: {
      id: 'demo-note-123',
      slug: 'demo-note',
      name: 'Note de démonstration'
    },
    activeClasseur: {
      id: 'demo-classeur-456',
      name: 'Classeur de démonstration'
    }
  });

  useEffect(() => {
    if (currentUIContext) {
      setUIContext(currentUIContext);
      renderTemplate(currentUIContext);
    }
  }, [currentUIContext]);

  const renderTemplate = async (context: UIContext) => {
    try {
      const rendered = await agentTemplateService.renderAgentTemplateWithUIContext(
        agentConfig,
        context,
        'Tu es un assistant IA utile et bienveillant.'
      );
      setRenderedTemplate(rendered.content);
    } catch (error) {
      console.error('Erreur lors du rendu du template:', error);
    }
  };

  const handleConfigChange = (field: keyof AgentTemplateConfig, value: unknown) => {
    const newConfig = { ...agentConfig, [field]: value };
    setAgentConfig(newConfig);
    if (uiContext) {
      renderTemplate(uiContext);
    }
  };

  const generateContextSection = () => {
    if (!uiContext) return '';
    const result = contextCollector.generateContextSection(uiContext);
    return result.contextSection;
  };

  return (
    <div className="context-injection-demo">
      <h2>🧪 Démonstration de l'Injection de Contexte UI</h2>
      
      <div className="demo-sections">
        {/* Configuration de l'agent */}
        <div className="demo-section">
          <h3>⚙️ Configuration de l'Agent</h3>
          <div className="config-fields">
            <div className="field">
              <label>Instructions système:</label>
              <textarea
                value={agentConfig.system_instructions || ''}
                onChange={(e) => handleConfigChange('system_instructions', e.target.value)}
                rows={3}
                placeholder="Instructions système de l'agent..."
              />
            </div>
            
            <div className="field">
              <label>Personnalité:</label>
              <input
                type="text"
                value={agentConfig.personality || ''}
                onChange={(e) => handleConfigChange('personality', e.target.value)}
                placeholder="Personnalité de l'agent..."
              />
            </div>
          </div>
        </div>

        {/* Contexte UI actuel */}
        <div className="demo-section">
          <h3>🖥️ Contexte UI Actuel</h3>
          <div className="context-info">
            <pre>{JSON.stringify(uiContext, null, 2)}</pre>
          </div>
        </div>

        {/* Section de contexte générée */}
        <div className="demo-section">
          <h3>📝 Section de Contexte Générée</h3>
          <div className="context-section">
            <pre>{generateContextSection()}</pre>
          </div>
        </div>

        {/* Template final rendu */}
        <div className="demo-section">
          <h3>🎯 Template Final Rendu</h3>
          <div className="rendered-template">
            <pre>{renderedTemplate}</pre>
          </div>
        </div>
      </div>

      <style jsx>{`
        .context-injection-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Noto Sans', sans-serif;
        }

        .demo-sections {
          display: grid;
          gap: 20px;
        }

        .demo-section {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          background: #f9f9f9;
        }

        .demo-section h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .config-fields {
          display: grid;
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field label {
          font-weight: 500;
          color: #555;
        }

        .field input,
        .field textarea {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
        }

        .field textarea {
          resize: vertical;
          min-height: 60px;
        }

        .context-info,
        .context-section,
        .rendered-template {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          max-height: 300px;
          overflow-y: auto;
        }

        .context-info pre,
        .context-section pre,
        .rendered-template pre {
          margin: 0;
          white-space: pre-wrap;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

