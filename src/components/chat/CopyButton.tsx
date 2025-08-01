"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <button disabled={isCopied} onClick={copy} className="copy-button" aria-label="Copy code">
      {isCopied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
} 