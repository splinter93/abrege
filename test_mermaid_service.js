// Test du service Mermaid
const testContent = `Voici un diagramme :

\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\`

Et du texte après.`;

// Fonction de détection simplifiée (copie du service)
function detectMermaidBlocks(content) {
  if (!content || typeof content !== 'string') {
    return [{ type: 'text', content: '', startIndex: 0, endIndex: 0 }];
  }

  const blocks = [];
  
  // Regex amélioré pour détecter les blocs Mermaid (avec ou sans fermeture)
  const mermaidRegex = /```mermaid(?::\w+)?\s*\n([\s\S]*?)(?:```|$)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const [fullMatch, mermaidContent] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Ajouter le texte avant le bloc Mermaid
    if (startIndex > lastIndex) {
      const textContent = content.slice(lastIndex, startIndex);
      if (textContent.trim()) {
        blocks.push({
          type: 'text',
          content: textContent,
          startIndex: lastIndex,
          endIndex: startIndex
        });
      }
    }

    // Ajouter le bloc Mermaid
    if (mermaidContent && mermaidContent.trim()) {
      blocks.push({
        type: 'mermaid',
        content: mermaidContent.trim(),
        startIndex,
        endIndex
      });
    }

    lastIndex = endIndex;
  }

  // Ajouter le texte restant après le dernier bloc Mermaid
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent.trim()) {
      blocks.push({
        type: 'text',
        content: remainingContent,
        startIndex: lastIndex,
        endIndex: content.length
      });
    }
  }

  // Si aucun bloc trouvé, retourner le contenu entier comme texte
  if (blocks.length === 0) {
    blocks.push({
      type: 'text',
      content: content,
      startIndex: 0,
      endIndex: content.length
    });
  }

  return blocks;
}

console.log('Test du service Mermaid:');
const blocks = detectMermaidBlocks(testContent);
console.log('Blocs détectés:', JSON.stringify(blocks, null, 2));

// Test avec différents formats
const testCases = [
  '```mermaid\nflowchart TD\nA --> B\n```',
  '```mermaid:test\nflowchart TD\nA --> B\n```',
  '```mermaid\nflowchart TD\nA --> B',
  'Pas de mermaid ici',
  '```python\nprint("hello")\n```'
];

console.log('\nTest de différents formats:');
testCases.forEach((testCase, index) => {
  const result = detectMermaidBlocks(testCase);
  console.log(`\nTest ${index + 1}: "${testCase}"`);
  console.log('Résultat:', result);
});
