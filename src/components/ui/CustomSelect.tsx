'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Libellé + zone chevron en bouton séparé (alignement type réglages). */
  splitTrigger?: boolean;
}

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Sélectionner...',
  className = '',
  splitTrigger = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const inputBase =
    'input-block w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between cursor-pointer';

  const splitShellClass =
    'flex min-h-[2.125rem] w-full min-w-0 overflow-hidden rounded-md border border-[var(--color-border-block)] bg-[var(--color-bg-content)] text-sm text-[var(--color-text-primary)] transition-[border-color,background-color] focus-within:border-[var(--color-border-focus)] focus-within:bg-[var(--chat-bg-input-focus)]';

  return (
    <div className={`relative w-full min-w-0 ${className}`} ref={containerRef}>
      {splitTrigger ? (
        <div className={`${splitShellClass} ${disabled ? 'opacity-50' : ''}`}>
          <button
            id={id}
            type="button"
            className="min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left outline-none"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            {selectedOption ? selectedOption.label : <span className="text-zinc-500">{placeholder}</span>}
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            className="inline-flex min-h-[2.125rem] w-9 shrink-0 cursor-pointer items-center justify-center border-l border-[var(--color-border-block)] bg-transparent text-zinc-500 transition-colors hover:text-zinc-300"
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) setIsOpen((o) => !o);
            }}
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          className={`${inputBase} min-w-0 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.label : <span className="text-zinc-500">{placeholder}</span>}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="section-block absolute top-full left-0 right-0 z-[100] mt-2 w-full max-h-[300px] overflow-y-auto rounded-xl shadow-2xl backdrop-blur-xl p-1.5 space-y-0.5"
            role="listbox"
          >
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                  value === option.value 
                    ? 'bg-[var(--color-bg-content)] text-white font-medium' 
                    : 'text-zinc-400 hover:bg-[var(--color-bg-content)] hover:text-zinc-200'
                }`}
                onClick={() => handleSelect(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <div className="w-1 h-1 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
