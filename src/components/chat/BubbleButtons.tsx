import React from 'react';
import { FiCopy, FiCheck, FiEdit3 } from 'react-icons/fi';

interface BubbleButtonsProps {
  content: string;
  messageId?: string;
  onCopy?: () => void;
  onEdit?: () => void;
  className?: string;
}

const BubbleButtons: React.FC<BubbleButtonsProps> = ({
  content,
  messageId,
  onCopy,
  onEdit,
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
      console.error('Failed to copy text: ', err);
    }
  };

  const handleEdit = () => {
    onEdit?.();
  };

  return (
    <div className={`bubble-buttons ${className}`}>
      <div className="bubble-buttons-container">
        <button
          className={`bubble-button copy-button ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copié !' : 'Copier le message'}
          aria-label={copied ? 'Message copié' : 'Copier le message'}
        >
          {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
        </button>

        <button
          className="bubble-button edit-button"
          onClick={handleEdit}
          title="Éditer le message"
          aria-label="Éditer le message"
        >
          <FiEdit3 size={16} />
        </button>
      </div>
    </div>
  );
};

export default BubbleButtons; 