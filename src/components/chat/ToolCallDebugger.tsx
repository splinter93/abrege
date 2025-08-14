'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolCallDebuggerProps {
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
  isVisible?: boolean;
  onToggle?: () => void;
}

const ToolCallDebugger: React.FC<ToolCallDebuggerProps> = ({
  toolCalls,
  toolResults = [],
  isVisible = false,
  onToggle
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  const getStatus = (toolCallId: string): 'pending' | 'success' | 'error' => {
    const result = toolResults.find(r => r.tool_call_id === toolCallId);
    if (!result) return 'pending';
    return result.success ? 'success' : 'error';
  };

  const pendingCount = toolCalls.filter(tc => getStatus(tc.id) === 'pending').length;
  const successCount = toolCalls.filter(tc => getStatus(tc.id) === 'success').length;
  const errorCount = toolCalls.filter(tc => getStatus(tc.id) === 'error').length;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="tool-call-debugger"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '400px',
            minWidth: '300px',
            backdropFilter: 'blur(10px)',
            color: 'white',
            fontSize: '14px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: pendingCount > 0 ? '#fbbf24' : '#10b981',
                animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none'
              }} />
              <span style={{ fontWeight: '600' }}>
                Tool Calls ({toolCalls.length})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {pendingCount > 0 && (
                <span style={{ color: '#fbbf24', fontSize: '12px' }}>⏳ {pendingCount}</span>
              )}
              {successCount > 0 && (
                <span style={{ color: '#10b981', fontSize: '12px' }}>✅ {successCount}</span>
              )}
              {errorCount > 0 && (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>❌ {errorCount}</span>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                ▼
              </button>
              {onToggle && (
                <button
                  onClick={onToggle}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '12px' }}>
                  {toolCalls.map((toolCall, index) => {
                    const status = getStatus(toolCall.id);
                    const result = toolResults.find(r => r.tool_call_id === toolCall.id);
                    
                    return (
                      <div key={toolCall.id} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ 
                            fontSize: '12px',
                            color: status === 'pending' ? '#fbbf24' : 
                                   status === 'success' ? '#10b981' : '#ef4444'
                          }}>
                            {status === 'pending' ? '⏳' : status === 'success' ? '✅' : '❌'}
                          </span>
                          <span style={{ fontWeight: '500', fontSize: '13px' }}>
                            {toolCall.function.name}
                          </span>
                        </div>
                        
                        {result && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginLeft: '20px',
                            wordBreak: 'break-word'
                          }}>
                            {result.content.length > 100 
                              ? `${result.content.substring(0, 100)}...` 
                              : result.content
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToolCallDebugger; 