'use client';

import React, { useState } from 'react';

interface ExportActionsProps {
  schema: object;
}

/**
 * Composant pour exporter le schéma OpenAPI
 * Permet de copier en JSON ou de télécharger un fichier
 */
export function ExportActions({ schema }: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleCopyToClipboard = async () => {
    try {
      setIsExporting(true);
      const jsonString = JSON.stringify(schema, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setExportMessage('Schéma copié dans le presse-papiers !');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      setExportMessage('Erreur lors de la copie');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFile = () => {
    try {
      setIsExporting(true);
      const jsonString = JSON.stringify(schema, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'openapi-schema.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportMessage('Fichier téléchargé !');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      setExportMessage('Erreur lors du téléchargement');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMinified = () => {
    try {
      setIsExporting(true);
      const jsonString = JSON.stringify(schema);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'openapi-schema.min.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportMessage('Fichier minifié téléchargé !');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      setExportMessage('Erreur lors du téléchargement');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-actions">
      <div className="export-actions-header">
        <h3>Exporter le schéma</h3>
        <p>Copiez ou téléchargez votre schéma OpenAPI modifié</p>
      </div>

      <div className="export-actions-buttons">
        <button
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          className="export-button copy-button"
        >
          {isExporting ? '⏳' : '📋'} Copier JSON
        </button>

        <button
          onClick={handleDownloadFile}
          disabled={isExporting}
          className="export-button download-button"
        >
          {isExporting ? '⏳' : '💾'} Télécharger JSON
        </button>

        <button
          onClick={handleDownloadMinified}
          disabled={isExporting}
          className="export-button download-minified-button"
        >
          {isExporting ? '⏳' : '📦'} Télécharger minifié
        </button>
      </div>

      {exportMessage && (
        <div className="export-message">
          {exportMessage}
        </div>
      )}

      <div className="export-info">
        <details>
          <summary>Informations sur l'export</summary>
          <ul>
            <li><strong>Copier JSON :</strong> Copie le schéma formaté dans le presse-papiers</li>
            <li><strong>Télécharger JSON :</strong> Télécharge un fichier .json formaté</li>
            <li><strong>Télécharger minifié :</strong> Télécharge un fichier .json compact</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
