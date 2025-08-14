'use client';

import React, { useState } from 'react';
import StreamingLineByLine from './StreamingLineByLine';
import './StreamingLineByLine.css';

export const StreamingLineByLineDemo: React.FC = () => {
  const [demoContent, setDemoContent] = useState<string>('');
  const [lineDelay, setLineDelay] = useState<number>(800);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedDemo, setSelectedDemo] = useState<'short' | 'medium' | 'long'>('medium');

  const demoContents = {
    short: `# Message court

Ceci est un message court pour tester l'effet.

- Point 1
- Point 2
- Point 3

**Fin du message.**`,

    medium: `# Message de taille moyenne

Ceci est un message de taille moyenne qui démontre l'effet de streaming ligne par ligne.

## Caractéristiques

- **Animation fluide** : Chaque ligne apparaît progressivement
- **Délai configurable** : Contrôle de la vitesse d'affichage
- **Markdown supporté** : Rendu complet du contenu
- **Responsive** : S'adapte à tous les écrans

## Code d'exemple

\`\`\`javascript
console.log("Hello, streaming world!");
\`\`\`

> Citation : "La patience est une vertu dans le streaming."

---

*Message de démonstration terminé.*`,

    long: `# Message long et détaillé

Ceci est un message beaucoup plus long qui va vraiment tester l'effet de streaming ligne par ligne sur un contenu substantiel.

## Introduction

L'objectif de ce composant est de créer une expérience utilisateur plus agréable en ralentissant l'affichage du contenu généré par le LLM. Au lieu d'avoir tout le texte qui apparaît d'un coup, chaque ligne apparaît progressivement avec un délai configurable.

## Avantages du streaming ligne par ligne

### 1. Meilleure lisibilité
- L'utilisateur peut lire chaque ligne à son rythme
- Pas de surcharge d'information soudaine
- Focus sur le contenu actuel

### 2. Expérience plus naturelle
- Simule une frappe humaine
- Donne le temps de traiter l'information
- Crée une sensation de "conversation"

### 3. Contrôle de la vitesse
- Délai configurable entre les lignes
- Adaptation selon le contexte
- Possibilité de pause/reprise

## Implémentation technique

Le composant utilise Framer Motion pour les animations et divise le contenu en lignes individuelles. Chaque ligne est affichée avec une animation d'entrée fluide.

\`\`\`typescript
interface StreamingLineByLineProps {
  content: string;
  lineDelay?: number; // Délai entre chaque ligne
  onComplete?: () => void;
}
\`\`\`

## Utilisation dans le chat

Ce composant peut être intégré dans le système de chat pour remplacer l'affichage instantané des réponses de l'assistant.

### Configuration recommandée
- **Messages courts** : 400-600ms de délai
- **Messages moyens** : 600-800ms de délai  
- **Messages longs** : 800-1200ms de délai

## Conclusion

Le streaming ligne par ligne améliore significativement l'expérience utilisateur en créant un rythme de lecture plus naturel et agréable.

---

*Fin du message de démonstration long.*`
  };

  const handleDemoSelect = (demo: 'short' | 'medium' | 'long') => {
    setSelectedDemo(demo);
    setDemoContent(demoContents[demo]);
    setIsPlaying(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setDemoContent('');
  };

  const handleComplete = () => {
    console.log('Streaming terminé !');
  };

  return (
    <div className="streaming-demo-container">
      <div className="demo-header">
        <h1>🎬 Démonstration Streaming Ligne par Ligne</h1>
        <p>Testez l'effet de streaming ligne par ligne pour ralentir l'affichage du LLM</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <label>Type de contenu :</label>
          <div className="demo-buttons">
            <button
              onClick={() => handleDemoSelect('short')}
              className={selectedDemo === 'short' ? 'active' : ''}
            >
              Court
            </button>
            <button
              onClick={() => handleDemoSelect('medium')}
              className={selectedDemo === 'medium' ? 'active' : ''}
            >
              Moyen
            </button>
            <button
              onClick={() => handleDemoSelect('long')}
              className={selectedDemo === 'long' ? 'active' : ''}
            >
              Long
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Délai entre lignes : {lineDelay}ms</label>
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={lineDelay}
            onChange={(e) => setLineDelay(Number(e.target.value))}
            className="delay-slider"
          />
        </div>

        <div className="control-group">
          <button onClick={handlePlay} disabled={isPlaying} className="play-button">
            ▶️ Démarrer le streaming
          </button>
          <button onClick={handleReset} className="reset-button">
            🔄 Réinitialiser
          </button>
        </div>
      </div>

      <div className="demo-content">
        <h3>Contenu en streaming :</h3>
        
        {isPlaying && demoContent ? (
          <div className="streaming-preview">
            <StreamingLineByLine
              content={demoContent}
              lineDelay={lineDelay}
              onComplete={handleComplete}
              className="demo-streaming"
            />
          </div>
        ) : (
          <div className="content-preview">
            <pre>{demoContent || 'Sélectionnez un type de contenu et cliquez sur "Démarrer"'}</pre>
          </div>
        )}
      </div>

      <div className="demo-info">
        <h4>ℹ️ Informations</h4>
        <ul>
          <li><strong>Délai actuel :</strong> {lineDelay}ms entre chaque ligne</li>
          <li><strong>Nombre de lignes :</strong> {demoContent ? demoContent.split('\n').filter(l => l.trim()).length : 0}</li>
          <li><strong>Statut :</strong> {isPlaying ? 'En cours...' : 'En attente'}</li>
        </ul>
      </div>
    </div>
  );
};

export default StreamingLineByLineDemo; 