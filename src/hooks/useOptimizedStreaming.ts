import { useRef, useState, useCallback, useEffect } from 'react';

interface UseOptimizedStreamingOptions {
  onUpdate: (content: string) => void;
  batchSize?: number;
  throttleMs?: number;
}

interface UseOptimizedStreamingReturn {
  addToken: (token: string) => void;
  flushTokens: () => void;
  isProcessing: boolean;
  pendingCount: number;
}

/**
 * Hook optimisé pour le streaming de tokens
 * Utilise le batching et requestAnimationFrame pour un rendu fluide
 */
export function useOptimizedStreaming(options: UseOptimizedStreamingOptions): UseOptimizedStreamingReturn {
  const { onUpdate, batchSize = 3, throttleMs = 16 } = options;
  
  const [pendingTokens, setPendingTokens] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContent, setCurrentContent] = useState('');
  
  const processingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  // Fonction pour traiter les tokens en attente
  const processTokens = useCallback(() => {
    if (processingRef.current || pendingTokens.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);

    // Prendre les tokens en attente
    setPendingTokens(current => {
      const tokensToProcess = current.slice(0, batchSize);
      const remainingTokens = current.slice(batchSize);
      
      // Mettre à jour le contenu
      const newContent = currentContent + tokensToProcess.join('');
      setCurrentContent(newContent);
      
      // Appeler le callback de mise à jour
      onUpdate(newContent);
      
      // Si il reste des tokens, programmer la prochaine mise à jour
      if (remainingTokens.length > 0) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          processingRef.current = false;
          setIsProcessing(false);
          processTokens();
        });
      } else {
        processingRef.current = false;
        setIsProcessing(false);
      }
      
      return remainingTokens;
    });
  }, [pendingTokens, currentContent, batchSize, onUpdate]);

  // Fonction pour ajouter un token
  const addToken = useCallback((token: string) => {
    setPendingTokens(prev => [...prev, token]);
    
    // Programmer le traitement si pas déjà en cours
    if (!processingRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(processTokens);
      }, throttleMs);
    }
  }, [processTokens, throttleMs]);

  // Fonction pour forcer le traitement immédiat
  const flushTokens = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    processingRef.current = false;
    setIsProcessing(false);
    processTokens();
  }, [processTokens]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    addToken,
    flushTokens,
    isProcessing,
    pendingCount: pendingTokens.length
  };
} 