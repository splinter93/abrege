'use client';

import React, { useState } from 'react';

interface DebugInfoProps {
  onSchemaLoad: (input: string | File) => void;
}

/**
 * Composant de débogage pour tester le chargement de schémas
 * Affiche des informations détaillées sur le processus de parsing
 */
export function DebugInfo({ onSchemaLoad }: DebugInfoProps) {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  const testWithExampleSchema = async () => {
    setDebugInfo('🔄 Test avec le schéma d\'exemple...\n');
    
    try {
      // Charger le schéma d'exemple
      const response = await fetch('/example-openapi.json');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const text = await response.text();
      setDebugInfo(prev => prev + `📁 Fichier chargé: ${text.length} caractères\n`);
      
      // Tester le parsing
      const cleanedText = text.trim();
      setDebugInfo(prev => prev + `🧹 Texte nettoyé: ${cleanedText.length} caractères\n`);
      
      // Vérifier les caractères de début/fin
      const startsWithBrace = cleanedText.startsWith('{');
      const endsWithBrace = cleanedText.endsWith('}');
      setDebugInfo(prev => prev + `🔍 Commence par {: ${startsWithBrace}\n`);
      setDebugInfo(prev => prev + `🔍 Finit par }: ${endsWithBrace}\n`);
      
      // Afficher les premiers et derniers caractères
      const firstChars = cleanedText.substring(0, 50);
      const lastChars = cleanedText.substring(cleanedText.length - 50);
      setDebugInfo(prev => prev + `📝 Début: "${firstChars}..."\n`);
      setDebugInfo(prev => prev + `📝 Fin: "...${lastChars}"\n`);
      
      // Essayer de parser
      try {
        const data = JSON.parse(cleanedText);
        setDebugInfo(prev => prev + `✅ JSON parsé avec succès !\n`);
        setDebugInfo(prev => prev + `📊 Type: ${typeof data}\n`);
        setDebugInfo(prev => prev + `🔑 Propriétés: ${Object.keys(data).join(', ')}\n`);
        
        if (data.openapi || data.swagger) {
          setDebugInfo(prev => prev + `🚀 Schéma OpenAPI valide !\n`);
          setDebugInfo(prev => prev + `📋 Version: ${data.openapi || data.swagger}\n`);
          setDebugInfo(prev => prev + `📝 Titre: ${data.info?.title || 'N/A'}\n`);
        }
        
        // Charger dans l'éditeur
        onSchemaLoad(text);
        setDebugInfo(prev => prev + `🎯 Schéma chargé dans l'éditeur !\n`);
        
      } catch (parseError) {
        const error = parseError as Error;
        setDebugInfo(prev => prev + `❌ Erreur de parsing: ${error.message}\n`);
        
        if (error.message.includes('position')) {
          const match = error.message.match(/position (\d+)/);
          if (match) {
            const position = parseInt(match[1]);
            const context = cleanedText.substring(Math.max(0, position - 50), position + 50);
            setDebugInfo(prev => prev + `📍 Position: ${position}\n`);
            setDebugInfo(prev => prev + `🔍 Contexte: "${context}"\n`);
          }
        }
      }
      
    } catch (error) {
      setDebugInfo(prev => prev + `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n`);
    }
  };

  const testWithOpenAPISchema = async () => {
    setDebugInfo('🔄 Test avec le schéma OpenAPI V2...\n');
    
    try {
      // Charger le schéma OpenAPI V2
      const response = await fetch('/openapi-v2-schema.json');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const text = await response.text();
      setDebugInfo(prev => prev + `📁 Fichier chargé: ${text.length} caractères\n`);
      
      // Tester le parsing
      const cleanedText = text.trim();
      setDebugInfo(prev => prev + `🧹 Texte nettoyé: ${cleanedText.length} caractères\n`);
      
      // Vérifier les caractères de début/fin
      const startsWithBrace = cleanedText.startsWith('{');
      const endsWithBrace = cleanedText.endsWith('}');
      setDebugInfo(prev => prev + `🔍 Commence par {: ${startsWithBrace}\n`);
      setDebugInfo(prev => prev + `🔍 Finit par }: ${endsWithBrace}\n`);
      
      // Afficher les premiers et derniers caractères
      const firstChars = cleanedText.substring(0, 50);
      const lastChars = cleanedText.substring(cleanedText.length - 50);
      setDebugInfo(prev => prev + `📝 Début: "${firstChars}..."\n`);
      setDebugInfo(prev => prev + `📝 Fin: "...${lastChars}"\n`);
      
      // Essayer de parser
      try {
        const data = JSON.parse(cleanedText);
        setDebugInfo(prev => prev + `✅ JSON parsé avec succès !\n`);
        setDebugInfo(prev => prev + `📊 Type: ${typeof data}\n`);
        setDebugInfo(prev => prev + `🔑 Propriétés: ${Object.keys(data).join(', ')}\n`);
        
        if (data.openapi || data.swagger) {
          setDebugInfo(prev => prev + `🚀 Schéma OpenAPI valide !\n`);
          setDebugInfo(prev => prev + `📋 Version: ${data.openapi || data.swagger}\n`);
          setDebugInfo(prev => prev + `📝 Titre: ${data.info?.title || 'N/A'}\n`);
        }
        
        // Charger dans l'éditeur
        onSchemaLoad(text);
        setDebugInfo(prev => prev + `🎯 Schéma chargé dans l'éditeur !\n`);
        
      } catch (parseError) {
        const error = parseError as Error;
        setDebugInfo(prev => prev + `❌ Erreur de parsing: ${error.message}\n`);
        
        if (error.message.includes('position')) {
          const match = error.message.match(/position (\d+)/);
          if (match) {
            const position = parseInt(match[1]);
            const context = cleanedText.substring(Math.max(0, position - 50), position + 50);
            setDebugInfo(prev => prev + `📍 Position: ${position}\n`);
            setDebugInfo(prev => prev + `🔍 Contexte: "${context}"\n`);
          }
        }
      }
      
    } catch (error) {
      setDebugInfo(prev => prev + `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n`);
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo('');
  };

  return (
    <div className="debug-info">
      <div className="debug-info-header">
        <h4>🔧 Outils de débogage</h4>
        <div className="debug-info-actions">
          <button
            onClick={testWithExampleSchema}
            className="debug-button"
          >
            Test Exemple
          </button>
          <button
            onClick={testWithOpenAPISchema}
            className="debug-button"
          >
            Test OpenAPI V2
          </button>
          <button
            onClick={clearDebugInfo}
            className="debug-button"
          >
            Effacer
          </button>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="debug-button"
          >
            {isVisible ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </div>
      
      {isVisible && (
        <div className="debug-info-content">
          <pre className="debug-info-output">
            {debugInfo || 'Cliquez sur un bouton de test pour commencer...'}
          </pre>
        </div>
      )}
    </div>
  );
}
