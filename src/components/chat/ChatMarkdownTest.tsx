'use client';
import React from 'react';

const ChatMarkdownTest: React.FC = () => {
  const testContent = `
# Titre Principal - Test Font Inter

Voici un **paragraphe** avec du texte normal et du *texte en italique*. Tous les éléments devraient utiliser la police Inter.

## Liste à Puces - Test Font

- Premier élément avec Inter
- Deuxième élément avec Inter
  - Sous-élément 1 avec Inter
  - Sous-élément 2 avec Inter
- Troisième élément avec Inter

## Liste Numérotée - Test Font

1. Premier point avec Inter
2. Deuxième point avec Inter
3. Troisième point avec Inter

## Citation - Test Font

> Voici une citation importante qui devrait être bien stylée avec une bordure gauche grise et utiliser Inter.

## Code Inline - Test Font

Voici du \`code inline\` dans le texte. Le code utilise JetBrains Mono.

## Code Block - Test Unified Blocks

\`\`\`javascript
function hello() {
  console.log("Hello World!");
  return "success";
}
\`\`\`

## Tableau - Test Font

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |
| Donnée 4  | Donnée 5  | Donnée 6  |

## Lien - Test Font

Voici un [lien vers Google](https://google.com) pour tester le style avec Inter.

## Checkbox - Test Font

- [x] Tâche terminée avec Inter
- [ ] Tâche en cours avec Inter
- [ ] Tâche à faire avec Inter

## Texte avec Formatage - Test Font

Voici du **texte en gras**, du *texte en italique*, du ~~texte barré~~, et du \`code inline\`. Tout devrait utiliser Inter sauf le code.

### Sous-titre - Test Font

Voici un sous-titre de niveau 3 avec Inter.

#### Sous-sous-titre - Test Font

Et un sous-titre de niveau 4 avec Inter.
`;

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Test des Styles Markdown Chat</h1>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <EnhancedMarkdownMessage content={testContent} />
        </div>
      </div>
    </div>
  );
};

export default ChatMarkdownTest;