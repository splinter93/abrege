import React from 'react';

/**
 * Composant de test pour la typographie markdown du chat
 * Permet de valider la hiérarchie Noto Sans (titres) / Inter (texte)
 */
const ChatMarkdownTest: React.FC = () => {
  const markdownContent = `# Titre Principal (H1) - Noto Sans

Ceci est un paragraphe de texte normal utilisant **Inter** pour une excellente lisibilité. Le texte est optimisé pour la lecture avec un line-height approprié et un letter-spacing subtil.

## Sous-titre Principal (H2) - Noto Sans

Voici un autre paragraphe avec du texte en *italique* et du **texte en gras** pour tester la hiérarchie typographique.

### Titre de Section (H3) - Noto Sans

#### Titre de Sous-section (H4) - Noto Sans

##### Titre Mineur (H5) - Noto Sans

###### Titre Minimal (H6) - Noto Sans

---

## Code et Citations

Voici du \`code inline\` utilisant **JetBrains Mono** pour une excellente lisibilité du code.

\`\`\`typescript
// Bloc de code avec syntaxe highlighting
interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  author: 'user' | 'assistant';
}

const message: ChatMessage = {
  id: '1',
  content: 'Hello World!',
  timestamp: new Date(),
  author: 'user'
};
\`\`\`

> **Citation importante** : Cette citation utilise Inter pour le texte et respecte la hiérarchie typographique avec un style italique subtil.

## Tableaux

| Fonctionnalité | Police | Taille | Poids |
|----------------|--------|--------|-------|
| Titres H1-H6 | Noto Sans | Variable | 700-800 |
| Texte normal | Inter | 16px | 400 |
| Code | JetBrains Mono | 14px | 400 |
| Citations | Inter | 18px | 400 |

## Listes

### Liste à puces
- Premier élément utilisant **Inter**
- Deuxième élément avec du *texte en italique*
- Troisième élément avec du \`code inline\`

### Liste numérotée
1. Premier point important
2. Deuxième point avec **texte en gras**
3. Troisième point avec [lien externe](https://example.com)

## Liens et Formatage

Voici un [lien vers un exemple](https://example.com) qui utilise la police **Inter** avec un style de survol optimisé.

**Texte en gras** et *texte en italique* pour tester les différents poids de police.

---

*Test de la typographie markdown du chat - Hiérarchie optimisée pour la production*`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 p-6 bg-glass-subtle rounded-lg border border-glass-border-soft">
        <h2 className="text-2xl font-bold mb-4 text-white">Test Typographie Markdown Chat</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong>Hiérarchie des polices :</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Titres (H1-H6) :</strong> Noto Sans - Poids variables (700-800)</li>
            <li><strong>Texte normal :</strong> Inter - 16px, poids 400</li>
            <li><strong>Code :</strong> JetBrains Mono - 14px, poids 400</li>
            <li><strong>Citations :</strong> Inter - 18px, poids 400, italique</li>
          </ul>
        </div>
      </div>
      
      <div className="chat-markdown bg-glass-base p-8 rounded-lg border border-glass-border-soft">
        <div dangerouslySetInnerHTML={{ __html: markdownContent.replace(/\n/g, '<br>') }} />
      </div>
    </div>
  );
};

export default ChatMarkdownTest;
