import React, { useState, RefObject } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onKeyPress?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function ChatInput({ onSend, loading, textareaRef, onKeyPress }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyPress) onKeyPress(e);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area-container">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Envoyez un message..."
          className="w-full bg-transparent placeholder:text-gray-400 focus:outline-none max-h-[120px]"
          disabled={loading}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="send-button"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 