'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { GROQ_MODELS_BY_CATEGORY, getModelInfo } from '@/constants/groqModels';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedModel = useMemo(() => getModelInfo(value), [value]);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  const inputBase =
    'w-full px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-100 text-sm focus:border-zinc-600 focus:bg-zinc-800/20 transition-colors flex items-center justify-between cursor-pointer';

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id="agent-model-trigger"
        type="button"
        className={`${inputBase} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedModel ? selectedModel.name : <span className="text-zinc-500">Choisir un modèle...</span>}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[100] mt-2 w-full max-h-[400px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0C0C0E] shadow-2xl backdrop-blur-xl"
            role="listbox"
          >
            <div className="p-1.5 space-y-1">
              {Object.entries(GROQ_MODELS_BY_CATEGORY).map(([category, models]) => (
                <div key={category} className="space-y-0.5">
                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {category}
                  </div>
                  {models.map(model => (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={value === model.id}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                        value === model.id 
                          ? 'bg-zinc-800 text-white font-medium' 
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                      onClick={() => handleSelect(model.id)}
                    >
                      <span className="truncate">{model.name}</span>
                      {value === model.id && (
                        <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
