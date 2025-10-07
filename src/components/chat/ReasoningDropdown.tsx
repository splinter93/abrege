'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

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
          <Lightbulb className="reasoning-dropdown-icon" size={12} />
          <span className="reasoning-dropdown-title">Reasoning</span>
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
