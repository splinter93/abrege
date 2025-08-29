'use client';
import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';

const MermaidTest: React.FC = () => {
  const testContent = `Voici un diagramme de flux simple :

\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\`

Et voici un diagramme de séquence :

\`\`\`mermaid
sequenceDiagram
    participant U as Utilisateur
    participant S as Système
    participant A as API
    
    U->>S: Demande de données
    S->>A: Requête API
    A-->>S: Réponse
    S-->>U: Affichage des données
\`\`\`

Et du texte normal après.`;

  return (
    <div className="mermaid-test-page">
      <h1>Test Mermaid dans le Chat</h1>
      <p>Ce composant teste le rendu Mermaid dans EnhancedMarkdownMessage</p>
      
      <div className="test-content">
        <h2>Contenu de test :</h2>
        <EnhancedMarkdownMessage content={testContent} />
      </div>
    </div>
  );
};

export default MermaidTest;
