import { useState, useCallback, useRef } from 'react';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success?: boolean;
}

interface UseToolCallDebuggerReturn {
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  isDebuggerVisible: boolean;
  addToolCalls: (toolCalls: ToolCall[]) => void;
  addToolResult: (result: ToolResult) => void;
  clearToolCalls: () => void;
  toggleDebugger: () => void;
  hideDebugger: () => void;
  showDebugger: () => void;
}

export function useToolCallDebugger(): UseToolCallDebuggerReturn {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [isDebuggerVisible, setIsDebuggerVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToolCalls = useCallback((newToolCalls: ToolCall[]) => {
    setToolCalls(prev => {
      // Éviter les doublons
      const existingIds = new Set(prev.map(tc => tc.id));
      const uniqueNewCalls = newToolCalls.filter(tc => !existingIds.has(tc.id));
      return [...prev, ...uniqueNewCalls];
    });
    
    // Afficher automatiquement le debugger quand des tool calls sont détectés
    setIsDebuggerVisible(true);
    
    // Masquer automatiquement après 10 secondes si aucun tool call en cours
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const hasPending = toolCalls.some(tc => 
        !toolResults.some(tr => tr.tool_call_id === tc.id)
      );
      
      if (!hasPending) {
        setIsDebuggerVisible(false);
      }
    }, 10000);
  }, [toolCalls, toolResults]);

  const addToolResult = useCallback((result: ToolResult) => {
    setToolResults(prev => {
      // Remplacer si existe déjà, sinon ajouter
      const existingIndex = prev.findIndex(tr => tr.tool_call_id === result.tool_call_id);
      if (existingIndex >= 0) {
        const newResults = [...prev];
        newResults[existingIndex] = result;
        return newResults;
      }
      return [...prev, result];
    });
    
    // Garder le debugger visible si il y a encore des tool calls en cours
    const hasPending = toolCalls.some(tc => 
      !toolResults.some(tr => tr.tool_call_id === tc.id)
    );
    
    if (!hasPending) {
      // Masquer après 3 secondes si tous les tool calls sont terminés
      setTimeout(() => {
        setIsDebuggerVisible(false);
      }, 3000);
    }
  }, [toolCalls, toolResults]);

  const clearToolCalls = useCallback(() => {
    setToolCalls([]);
    setToolResults([]);
    setIsDebuggerVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const toggleDebugger = useCallback(() => {
    setIsDebuggerVisible(prev => !prev);
  }, []);

  const hideDebugger = useCallback(() => {
    setIsDebuggerVisible(false);
  }, []);

  const showDebugger = useCallback(() => {
    setIsDebuggerVisible(true);
  }, []);

  return {
    toolCalls,
    toolResults,
    isDebuggerVisible,
    addToolCalls,
    addToolResult,
    clearToolCalls,
    toggleDebugger,
    hideDebugger,
    showDebugger
  };
} 