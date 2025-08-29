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

console.log('Test de détection Mermaid:');
console.log('Contenu de test:', testContent);

// Test de la regex directement
const mermaidRegex = /```mermaid(?::\w+)?\s*\n([\s\S]*?)(?:```|$)/g;
let match;
let blocks = [];

while ((match = mermaidRegex.exec(testContent)) !== null) {
  console.log('Match trouvé:', match);
  blocks.push({
    fullMatch: match[0],
    content: match[1],
    startIndex: match.index,
    endIndex: match.index + match[0].length
  });
}

console.log('Blocs détectés:', blocks);
