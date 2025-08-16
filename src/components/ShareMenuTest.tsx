"use client";

import React, { useState } from 'react';
import ShareMenu from './ShareMenu';
import type { ShareSettings } from '@/types/sharing';

const ShareMenuTest: React.FC = () => {
  const [currentSettings, setCurrentSettings] = useState<ShareSettings>({
    visibility: 'private',
    invited_users: [],
    allow_edit: false,
    allow_comments: false
  });

  const handleSettingsChange = async (newSettings: ShareSettings) => {
    console.log('🔄 Nouveaux paramètres:', newSettings);
    setCurrentSettings(newSettings);
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Paramètres mis à jour avec succès');
  };

  return (
    <div className="share-menu-test">
      <h1>🧪 Test du Menu de Partage</h1>
      
      <div className="test-info">
        <h3>📋 Comment tester :</h3>
        <ol>
          <li>Dans l'éditeur, cliquez sur le menu "..." (kebab)</li>
          <li>Cliquez sur "Partager" dans le menu</li>
          <li>✅ Le menu de partage s'ouvre et reste ouvert</li>
          <li>Testez les options sans que le menu se ferme</li>
          <li>Fermez avec "Annuler" ou en cliquant à l'extérieur</li>
        </ol>
      </div>

      <div className="current-settings">
        <h3>⚙️ Paramètres actuels :</h3>
        <pre>{JSON.stringify(currentSettings, null, 2)}</pre>
      </div>

      <div className="test-note">
        <h3>📝 Note de test</h3>
        <p>Ceci est une note de test pour vérifier le comportement du menu de partage.</p>
        <p>Le menu doit s'ouvrir uniquement via le menu kebab de l'éditeur.</p>
      </div>

      <style jsx>{`
        .share-menu-test {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .test-info {
          margin: 2rem 0;
          padding: 1rem;
          background: #e7f3ff;
          border-left: 4px solid #007bff;
          border-radius: 4px;
        }
        
        .test-info ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        
        .test-info li {
          margin: 0.5rem 0;
          line-height: 1.5;
        }
        
        .current-settings {
          margin: 2rem 0;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .current-settings pre {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #ddd;
          overflow-x: auto;
          font-size: 14px;
        }
        
        .test-note {
          margin: 2rem 0;
          padding: 1rem;
          background: #f0f8ff;
          border-radius: 8px;
          border: 1px solid #cce7ff;
        }
        
        .test-note p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default ShareMenuTest; 