'use client';
import React, { useState, useEffect } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';

interface TableRenderingDebugProps {
  content: string;
  isStreaming?: boolean;
}

const TableRenderingDebug: React.FC<TableRenderingDebugProps> = ({ content, isStreaming = false }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { html } = useMarkdownRender({ content });

  useEffect(() => {
    // Analyser le contenu pour détecter les problèmes de tableaux
    const lines = content.split('\n');
    let inTable = false;
    let tableStartIndex = -1;
    let tableLines: string[] = [];
    let issues: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Détecter le début d'un tableau
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableStartIndex = i;
          tableLines = [];
        }
        tableLines.push(line);
      }
      // Détecter la ligne de séparation
      else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
        tableLines.push(line);
      }
      // Détecter la fin d'un tableau
      else if (inTable && (trimmedLine === '' || (!trimmedLine.startsWith('|') && trimmedLine !== ''))) {
        inTable = false;
        
        // Analyser la structure du tableau
        if (tableLines.length > 0) {
          const tableStructure = analyzeTableStructure(tableLines);
          if (tableStructure.issues.length > 0) {
            issues.push(`Tableau lignes ${tableStartIndex + 1}-${i}: ${tableStructure.issues.join(', ')}`);
          }
        }
        
        tableLines = [];
        tableStartIndex = -1;
      }
    }

    // Vérifier si un tableau est encore ouvert à la fin
    if (inTable && tableLines.length > 0) {
      issues.push(`Tableau incomplet lignes ${tableStartIndex + 1}-${lines.length}: ${tableLines.length} lignes`);
    }

    setDebugInfo({
      totalLines: lines.length,
      tableCount: (content.match(/\|/g) || []).length,
      issues,
      isStreaming,
      contentLength: content.length,
      lastChar: content.slice(-1),
      hasIncompleteTable: content.includes('|') && !content.trim().endsWith('|'),
      tableLines: tableLines
    });
  }, [content, isStreaming]);

  const analyzeTableStructure = (tableLines: string[]): { issues: string[] } => {
    const issues: string[] = [];
    
    if (tableLines.length < 2) {
      issues.push('Tableau trop court (moins de 2 lignes)');
      return { issues };
    }

    // Vérifier la première ligne (en-têtes)
    const headerLine = tableLines[0];
    const headerColumns = headerLine.split('|').filter(cell => cell.trim() !== '');
    
    if (headerColumns.length < 2) {
      issues.push('En-têtes insuffisants');
    }

    // Vérifier la ligne de séparation
    const separatorLine = tableLines[1];
    if (!separatorLine.match(/^\|[\s\-:]+\|$/)) {
      issues.push('Ligne de séparation invalide');
    }

    // Vérifier les lignes de données
    for (let i = 2; i < tableLines.length; i++) {
      const dataLine = tableLines[i];
      const dataColumns = dataLine.split('|').filter(cell => cell.trim() !== '');
      
      if (dataColumns.length !== headerColumns.length) {
        issues.push(`Ligne ${i + 1}: nombre de colonnes incorrect (${dataColumns.length} vs ${headerColumns.length})`);
      }
    }

    return { issues };
  };

  return (
    <div className="table-debug-panel" style={{ 
      background: '#1a1a1a', 
      border: '1px solid #333', 
      padding: '10px', 
      margin: '10px 0',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>🐛 Debug Tableaux</h4>
      
      <div style={{ color: '#ccc', marginBottom: '10px' }}>
        <strong>Statut:</strong> {isStreaming ? '🔄 Streaming' : '✅ Terminé'}
      </div>
      
      <div style={{ color: '#ccc', marginBottom: '10px' }}>
        <strong>Longueur:</strong> {debugInfo.contentLength} caractères
      </div>
      
      <div style={{ color: '#ccc', marginBottom: '10px' }}>
        <strong>Dernier caractère:</strong> "{debugInfo.lastChar || 'N/A'}"
      </div>
      
      <div style={{ color: '#ccc', marginBottom: '10px' }}>
        <strong>Tableau incomplet:</strong> {debugInfo.hasIncompleteTable ? '⚠️ OUI' : '✅ Non'}
      </div>
      
      {debugInfo.issues && debugInfo.issues.length > 0 && (
        <div style={{ color: '#ff6b6b', marginBottom: '10px' }}>
          <strong>Problèmes détectés:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {debugInfo.issues.map((issue: string, index: number) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      
      {debugInfo.tableLines && debugInfo.tableLines.length > 0 && (
        <div style={{ color: '#ffd93d', marginBottom: '10px' }}>
          <strong>Lignes de tableau en cours:</strong>
          <pre style={{ 
            background: '#000', 
            padding: '5px', 
            margin: '5px 0',
            borderRadius: '3px',
            fontSize: '11px',
            overflow: 'auto'
          }}>
            {debugInfo.tableLines.join('\n')}
          </pre>
        </div>
      )}
      
      <div style={{ color: '#90EE90', marginBottom: '10px' }}>
        <strong>HTML généré:</strong>
        <details style={{ marginTop: '5px' }}>
          <summary style={{ cursor: 'pointer' }}>Voir le HTML</summary>
          <pre style={{ 
            background: '#000', 
            padding: '5px', 
            margin: '5px 0',
            borderRadius: '3px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {html}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default TableRenderingDebug; 