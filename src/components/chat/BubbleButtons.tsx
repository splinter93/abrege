import React, { useState } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import './BubbleButtons.css';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { Volume2 } from 'lucide-react';

interface BubbleButtonsProps {
  content: string;
  messageId?: string;
  onCopy?: () => void;
  onVoice?: () => void;
  onEdit?: () => void;
  showVoiceButton?: boolean;
  showEditButton?: boolean;
  className?: string;
}

const BubbleButtons: React.FC<BubbleButtonsProps> = ({
  content,
  messageId,
  onCopy,
  onVoice,
  onEdit,
  showVoiceButton = false,
  showEditButton = false,
  className = ''
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  const handleVoice = () => {
    onVoice?.();
  };

  const handleEdit = () => {
    onEdit?.();
  };

  return (
    <>
      <div className={`bubble-buttons ${className}`}>
        <div className="bubble-buttons-container">
          <button
            className={`bubble-button copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copié !' : 'Copier le message'}
            aria-label={copied ? 'Message copié' : 'Copier le message'}
          >
            {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>

          {showVoiceButton && (
            <button
              className="bubble-button voice-button"
              onClick={handleVoice}
              title="Lire à haute voix"
              aria-label="Lire le message à haute voix"
            >
              <Volume2 size={14} />
            </button>
          )}

          {showEditButton && (
            <button
              className="bubble-button edit-button"
              onClick={handleEdit}
              title="Éditer le message"
              aria-label="Éditer le message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          )}

        </div>
      </div>
    </>
  );
};

export default BubbleButtons; 