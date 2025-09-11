'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningDropdownProps {
  reasoning: string;
  className?: string;
}

const ReasoningDropdown: React.FC<ReasoningDropdownProps> = ({ 
  reasoning, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning || reasoning.trim() === '') {
    return null;
  }

  return (
    <div className={`reasoning-dropdown ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="reasoning-dropdown-trigger"
        aria-expanded={isOpen}
        aria-label="Toggle reasoning details"
      >
        <div className="reasoning-dropdown-header">
          <div className="reasoning-dropdown-icon">
            🧠
          </div>
          <span className="reasoning-dropdown-title">Reasoning</span>
          <div className="reasoning-dropdown-chevron">
            {isOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="reasoning-dropdown-content"
          >
            <div className="reasoning-dropdown-body">
              <pre className="reasoning-dropdown-text">{reasoning}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReasoningDropdown;
