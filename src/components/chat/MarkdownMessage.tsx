import React from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import '@/styles/markdown.css';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  const { html } = useMarkdownRender({ content, debounceDelay: 0 });

  return (
    <div 
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownMessage; 