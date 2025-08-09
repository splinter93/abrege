'use client';
import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';

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

  const isSuccess = (toolCallId: string) => {
    const result = getToolResult(toolCallId);
    if (typeof result?.success === 'boolean') return result.success;
    return true; // default to success only when success is not provided
  };

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
          <span className="tool-call-title">Tool Calls</span>
        </div>
        <div className="tool-call-status-indicators">
          {toolCalls.map((toolCall) => (
            <div key={toolCall.id} className={`tool-call-indicator ${isSuccess(toolCall.id) ? 'success' : 'error'}`}>
              {isSuccess(toolCall.id) ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              )}
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