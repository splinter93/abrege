'use client';
import React, { useState } from 'react';
import type { StreamTimeline, StreamTimelineItem } from '@/types/streamTimeline';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import { StreamingIndicator } from './StreamingIndicator';

interface StreamTimelineRendererProps {
  timeline: StreamTimeline;
  className?: string;
  isActiveStreaming?: boolean; // ✅ NOUVEAU: Indique si le streaming est actif
}

/**
 * Composant qui rend la timeline chronologique exacte du streaming
 * Affiche les blocs de texte et les tool executions dans le bon ordre
 */
const StreamTimelineRenderer: React.FC<StreamTimelineRendererProps> = ({ timeline, className = '', isActiveStreaming = false }) => {
  // État pour gérer l'expansion des blocs d'exécution
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());

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
            // ✅ Chercher les résultats correspondants dans la timeline
            const toolResults = timeline.items.filter(
              (ti): ti is StreamTimelineItem & { type: 'tool_result' } => 
                ti.type === 'tool_result'
            );
            
            // ✅ Vérifier si TOUS les tools de ce bloc ont un résultat
            const allToolsHaveResults = item.toolCalls.every(tc => 
              toolResults.some(tr => tr.toolCallId === tc.id)
            );
            
            // ✅ Un bloc est "en cours d'exécution" si on stream OU s'il n'a pas encore tous ses résultats
            const isExecuting = isActiveStreaming || !allToolsHaveResults;
            
            console.log('[StreamTimelineRenderer] Tool execution:', {
              toolCount: item.toolCount,
              toolCalls: item.toolCalls,
              toolCallsLength: item.toolCalls?.length,
              isExecuting,
              allToolsHaveResults,
              isActiveStreaming,
              toolResultsCount: toolResults.length
            });
            
            return (
              <div 
                key={`exec-${index}`} 
                className="stream-timeline-execution"
                style={{ marginTop: '12px', marginBottom: '12px' }}
              >
                <StreamingIndicator
                  state={isExecuting ? "executing" : "completed"}
                  toolCount={item.toolCount}
                  roundNumber={item.roundNumber}
                  toolCalls={item.toolCalls.map(tc => {
                    // Trouver le résultat correspondant
                    const result = toolResults.find(tr => tr.toolCallId === tc.id);
                    return {
                      id: tc.id,
                      name: tc.function.name,
                      arguments: tc.function.arguments,
                      result: tc.result || (result ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result)) : undefined),
                      success: tc.success !== undefined ? tc.success : result?.success
                    };
                  })}
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
};

export default StreamTimelineRenderer;

