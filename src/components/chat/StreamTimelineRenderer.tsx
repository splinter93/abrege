'use client';
import React, { useState } from 'react';
import type { StreamTimeline, StreamTimelineItem } from '@/types/streamTimeline';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import { StreamingIndicator } from './StreamingIndicator';
import { simpleLogger as logger } from '@/utils/logger';

interface StreamTimelineRendererProps {
  timeline: StreamTimeline;
  className?: string;
  isActiveStreaming?: boolean; // ✅ NOUVEAU: Indique si le streaming est actif
}

/**
 * Composant qui rend la timeline chronologique exacte du streaming
 * Affiche les blocs de texte et les tool executions dans le bon ordre
 * ✅ MEMO: Évite le re-render et le clignotement à la fin du stream
 */
const StreamTimelineRenderer: React.FC<StreamTimelineRendererProps> = React.memo(({ timeline, className = '', isActiveStreaming = false }) => {
  // État pour gérer l'expansion des blocs d'exécution
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  
  // ✅ Logger ce qui est reçu (dev only)
  React.useEffect(() => {
    const toolExecutionBlocks = timeline.items.filter(i => i.type === 'tool_execution');
    const toolCallsWithSuccess = toolExecutionBlocks.flatMap(b => b.toolCalls).filter(tc => tc.success !== undefined);
    
    logger.dev('[StreamTimelineRenderer] 📊 Timeline reçue:', {
      totalItems: timeline.items.length,
      itemTypes: timeline.items.map(i => i.type),
      toolExecutionBlocks: toolExecutionBlocks.length,
      totalToolCalls: toolExecutionBlocks.flatMap(b => b.toolCalls).length,
      toolCallsWithSuccess: toolCallsWithSuccess.length,
      isActiveStreaming,
      sampleToolCall: toolExecutionBlocks[0]?.toolCalls[0]
    });
  }, [timeline, isActiveStreaming]);

  const toggleBlock = (index: number) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className={`stream-timeline ${className}`}>
      {timeline.items.map((item, index) => {
        switch (item.type) {
          case 'text':
            return (
              <div key={`text-${index}`} className="stream-timeline-text">
                <EnhancedMarkdownMessage content={item.content} />
              </div>
            );

          case 'tool_execution':
            // ✅ NOUVEAU: Les résultats sont maintenant DANS les toolCalls (tc.success)
            // Plus besoin de chercher les tool_result séparés (virés de la timeline)
            
            // ✅ Vérifier si TOUS les tools ont leur résultat (success !== undefined)
            const allToolsHaveResults = item.toolCalls.every(tc => tc.success !== undefined);
            
            // ✅ Un bloc est "en cours d'exécution" si on stream OU s'il n'a pas encore tous ses résultats
            const isExecuting = isActiveStreaming || !allToolsHaveResults;
            
            return (
              <div 
                key={`exec-${index}`} 
                className="stream-timeline-execution"
                style={{ marginTop: '12px', marginBottom: '12px', paddingLeft: 0, marginLeft: 0 }}
              >
                <StreamingIndicator
                  state={isExecuting ? "executing" : "completed"}
                  toolCount={item.toolCount}
                  roundNumber={item.roundNumber}
                  toolCalls={item.toolCalls.map(tc => ({
                    id: tc.id,
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                    result: tc.result, // ✅ Déjà dans tc (mis à jour par updateToolResult)
                    success: tc.success // ✅ Déjà dans tc
                  }))}
                  isExpanded={expandedBlocks.has(index)}
                  onToggle={() => toggleBlock(index)}
                />
              </div>
            );

          case 'tool_result':
            // Les tool results sont affichés dans le bloc tool_execution
            // On peut les skip ici ou les afficher séparément si nécessaire
            return null;

          default:
            return null;
        }
      })}
    </div>
  );
});

// ✅ Nom d'affichage pour le debugging
StreamTimelineRenderer.displayName = 'StreamTimelineRenderer';

export default StreamTimelineRenderer;

