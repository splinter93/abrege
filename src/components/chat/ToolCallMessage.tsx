'use client';
import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import LoadingSpinner from './LoadingSpinner';

interface ToolCallMessageProps {
  toolCalls: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolResults?: Array<{
    tool_call_id: string;
    name: string;
    content: string;
    success?: boolean;
  }>;
  className?: string;
}

const ToolCallMessage: React.FC<ToolCallMessageProps> = ({ toolCalls, toolResults = [], className = '' }) => {
  const [collapsed, setCollapsed] = React.useState(true);
  
  if (!toolCalls || toolCalls.length === 0) return null;

  const safeParse = (raw: unknown) => {
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  };

  const getToolResult = (toolCallId: string) => {
    return toolResults.find(result => result.tool_call_id === toolCallId);
  };

  // Compute status: 'success' | 'error' | 'pending'
  const getStatus = (toolCallId: string): 'success' | 'error' | 'pending' => {
    const result = getToolResult(toolCallId);
    if (!result) return 'pending';
    if (typeof result.success === 'boolean') return result.success ? 'success' : 'error';
    try {
      const parsed = JSON.parse(result.content || '{}');
      if (parsed && (parsed.success === false || parsed.error)) return 'error';
      if (parsed && (parsed.success === true)) return 'success';
    } catch {}
    return 'success';
  };

  // Auto-expand when any tool call is pending to improve visibility during execution
  const hasPending = toolCalls.some(tc => getStatus(tc.id) === 'pending');
  React.useEffect(() => {
    if (hasPending) setCollapsed(false);
  }, [hasPending]);

  // Get the main endpoint name (most common or first one)
  const getMainEndpointName = () => {
    if (toolCalls.length === 0) return 'Tool Call';
    
    // If all tool calls use the same function, show that name
    const firstFunctionName = toolCalls[0].function.name;
    const allSameFunction = toolCalls.every(tc => tc.function.name === firstFunctionName);
    
    if (allSameFunction) {
      return firstFunctionName;
    }
    
    // If multiple different functions, show the most common one
    const functionCounts = toolCalls.reduce((acc, tc) => {
      acc[tc.function.name] = (acc[tc.function.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonFunction = Object.entries(functionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    return mostCommonFunction;
  };

  const renderIndicator = (status: 'success' | 'error' | 'pending') => {
    if (status === 'pending') {
      return (
        <div className="tool-call-indicator pending" aria-label="En cours">
          <LoadingSpinner size={16} variant="spinner" />
        </div>
      );
    }
    if (status === 'success') {
      return (
        <div className="tool-call-indicator success" aria-label="Succès">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
      );
    }
    return (
      <div className="tool-call-indicator error" aria-label="Erreur">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>
    );
  };

  const mainEndpointName = getMainEndpointName();
  const hasMultipleFunctions = toolCalls.some(tc => tc.function.name !== mainEndpointName);

  return (
    <div className={`tool-call-message ${className}`}>
      <button
        className="tool-call-header"
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={!collapsed}
      >
        <div className="tool-call-title-group">
          <svg className="tool-call-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 00-2 2v2H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2z"/>
            <path d="M9 14h6"/>
          </svg>
          <span className="tool-call-title">
            {mainEndpointName}
            {hasMultipleFunctions && (
              <span className="tool-call-multiple-functions" title={`${toolCalls.length} tool calls`}>
                +{toolCalls.length - 1}
              </span>
            )}
            {toolCalls.length > 10 && (
              <span className="tool-call-count-warning" title="Beaucoup de tool calls - exécution par batch">
                ⚡
              </span>
            )}
          </span>
        </div>
        <div className="tool-call-status-indicators">
          {toolCalls.map((toolCall) => (
            <div key={toolCall.id}>
              {renderIndicator(getStatus(toolCall.id))}
            </div>
          ))}
        </div>
        <svg className="tool-call-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {!collapsed && (
        <div className="tool-call-content">
          {toolCalls.map((toolCall) => {
            const result = getToolResult(toolCall.id);
            return (
              <div key={toolCall.id} className="tool-call-item">
                <div className="tool-call-item-header">
                  <span className="tool-call-name">{toolCall.function.name}</span>
                </div>
                <div className="tool-call-arguments">
                  <div className="tool-call-arguments-header">Arguments</div>
                  <pre className="tool-call-arguments-content">{JSON.stringify(safeParse(toolCall.function.arguments), null, 2)}</pre>
                </div>
                {result && (
                  <div className="tool-call-result">
                    <div className="tool-call-result-header">Result</div>
                    <div className="tool-call-result-content">
                      <EnhancedMarkdownMessage content={result.content} />
                      {(() => {
                        try {
                          const parsed = JSON.parse(result.content || '{}');
                          if ((parsed && parsed.success === false) || parsed?.error) {
                            const errMsg = (parsed?.message || parsed?.error || 'Erreur').toString();
                            return (
                              <div className="tool-call-result-error-details">
                                ❌ {errMsg}
                              </div>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToolCallMessage;