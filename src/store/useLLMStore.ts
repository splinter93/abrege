import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { simpleLogger as logger } from '@/utils/logger';

interface LLMStore {
  currentProvider: string;
  availableProviders: string[];
  setProvider: (providerId: string) => void;
  getCurrentProvider: () => string;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      currentProvider: 'synesia', // Provider par défaut
      availableProviders: ['synesia', 'deepseek'],
      
      setProvider: (providerId: string) => {
        set({ currentProvider: providerId });
        logger.dev(`[LLM Store] 🔄 Provider changé: ${providerId}`);
      },
      
      getCurrentProvider: () => {
        return get().currentProvider;
      },
    }),
    {
      name: 'llm-store', // Nom pour le localStorage
    }
  )
); 