'use client';

import { EnhancedMarkdownMessage } from '../../components/chat';
import { testContent } from '../../components/chat/mermaidExamples';

export default function TestMermaidPage() {
  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1>Test Mermaid</h1>
      <p>Cette page teste le rendu des diagrammes Mermaid dans le chat.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <EnhancedMarkdownMessage content={testContent} />
      </div>
    </div>
  );
} 