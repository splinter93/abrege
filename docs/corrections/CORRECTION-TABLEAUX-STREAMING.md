# Correction du problème des tableaux Markdown pendant le streaming

## Problème identifié

Quand GPT-OSS génère un tableau pendant le streaming, le tableau peut se casser en fin de stream. Le problème vient de plusieurs facteurs :

1. **Batching des tokens** : Le système utilisait un batching de 2 tokens (`BATCH_SIZE = 2`), ce qui pouvait couper un tableau au milieu
2. **Parsing final** : Le `ToolCallsParser` accumulait le contenu mais ne gérait pas bien les tableaux partiels
3. **Reconstruction du contenu** : Plusieurs endroits où le contenu était reconstruit, causant des incohérences

## Solutions implémentées

### 1. Batching intelligent avec détection de tableaux

**Fichier modifié** : `src/app/api/chat/llm/route.ts`

- **BATCH_SIZE** optimisé à 10 tokens pour la performance
- **Fonction `isInTable()`** ajoutée pour détecter si on est dans un tableau Markdown
- **Gestion intelligente** : 
  - Si on est dans un tableau → envoi immédiat des tokens (pas de batching)
  - Sinon → batching normal de 10 tokens pour la performance

```typescript
const BATCH_SIZE = 10; // 🔧 OPTIMISATION: Batch de 10 tokens pour performance, mais gestion spéciale pour les tableaux

// 🔧 NOUVEAU: Fonction pour détecter si on est dans un tableau
const isInTable = (content: string): boolean => {
  const lines = content.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    // Détecter le début d'un tableau
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
    }
    // Détecter la ligne de séparation
    else if (inTable && line.trim().match(/^\|[\s\-:]+\|$/)) {
      inTable = true;
    }
    // Détecter la fin d'un tableau
    else if (inTable && line.trim() === '') {
      inTable = false;
    }
    // Si on est dans un tableau et qu'on a une ligne qui ne commence pas par |
    else if (inTable && line.trim() !== '' && !line.trim().startsWith('|')) {
      inTable = false;
    }
  }
  
  return inTable;
};

// 🔧 AMÉLIORATION: Gestion spéciale pour les tableaux
const currentContent = accumulatedContent;
const inTable = isInTable(currentContent);

// Si on est dans un tableau, envoyer immédiatement pour éviter les coupures
if (inTable) {
  await flushTokenBuffer();
}
// Sinon, utiliser le batching normal (10 tokens)
else if (bufferSize >= BATCH_SIZE) {
  await flushTokenBuffer();
}
```

### 2. Amélioration du ToolCallsParser

**Fichier modifié** : `src/utils/ToolCallsParser.ts`

- **Fonction `cleanMarkdownContent()`** ajoutée pour nettoyer et valider le contenu Markdown
- **Gestion spéciale des tableaux** : S'assure que les tableaux se terminent proprement
- **Nettoyage automatique** : Appliqué avant de retourner le contenu final

```typescript
function cleanMarkdownContent(content: string): string {
  if (!content) return '';
  
  // Gestion spéciale pour les tableaux
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;
  let tableStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
      }
      cleanedLines.push(line);
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      cleanedLines.push(line);
    }
    // Détecter la fin d'un tableau
    else if (inTable && (trimmedLine === '' || (!trimmedLine.startsWith('|') && trimmedLine !== ''))) {
      inTable = false;
      // S'assurer que le tableau se termine proprement
      if (trimmedLine === '') {
        cleanedLines.push(line);
      } else {
        // Ajouter une ligne vide avant le contenu suivant
        cleanedLines.push('');
        cleanedLines.push(line);
      }
    }
    // Contenu normal
    else {
      cleanedLines.push(line);
    }
  }
  
  // S'assurer qu'un tableau ouvert se termine proprement
  if (inTable && tableStartIndex !== -1) {
    // Chercher la dernière ligne du tableau
    for (let i = cleanedLines.length - 1; i >= tableStartIndex; i--) {
      if (cleanedLines[i].trim() !== '') {
        // Ajouter une ligne vide après le tableau
        cleanedLines.splice(i + 1, 0, '');
        break;
      }
    }
  }
  
  return cleanedLines.join('\n');
}
```

### 3. Amélioration du rendu Markdown

**Fichier modifié** : `src/hooks/editor/useMarkdownRender.ts`

- **Fonction `cleanPartialMarkdown()`** ajoutée pour nettoyer le contenu partiel
- **Gestion des tableaux partiels** : Complète automatiquement les tableaux incomplets
- **Détection de tableau** : Évite les erreurs de rendu sur les tableaux partiels

```typescript
// Si on est dans un tableau partiel, essayer de le compléter
if (inTable) {
  const lines = cleanedContent.split('\n');
  const lastLine = lines[lines.length - 1];
  
  // Si la dernière ligne est incomplète (pas de | à la fin), l'ajouter
  if (lastLine.trim() !== '' && !lastLine.trim().endsWith('|')) {
    contentToRender = cleanedContent + '|';
  }
}
```

## Tests de validation

Un script de test a été créé (`scripts/test-table-streaming.js`) qui valide :

1. **Tableau complet** : Vérifie qu'un tableau complet est correctement parsé
2. **Tableau partiel** : Vérifie qu'un tableau partiel est corrigé
3. **Tableau avec contenu après** : Vérifie la gestion du contenu après un tableau
4. **Détection de tableau** : Vérifie que la détection fonctionne correctement

## Résultats

✅ **Tableau complet** : Correctement parsé avec structure propre
✅ **Tableau partiel** : Corrigé automatiquement
✅ **Tableau avec contenu** : Séparation correcte entre tableau et contenu
✅ **Détection** : Fonctionne pour tous les cas de test
✅ **Performance** : Batching de 10 tokens pour la fluidité, mais envoi immédiat pour les tableaux

## Impact

- **Streaming fluide** : Batching de 10 tokens pour la performance
- **Tableaux préservés** : Envoi immédiat quand on détecte un tableau
- **Rendu stable** : Moins d'erreurs de parsing Markdown
- **Expérience utilisateur optimale** : Performance + qualité du rendu

## Notes techniques

- **Batching intelligent** : 10 tokens par défaut, mais envoi immédiat pour les tableaux
- **Détection précise** : Basée sur la syntaxe Markdown standard
- **Rétrocompatibilité** : N'affecte pas les autres types de contenu
- **Performance optimisée** : Meilleur équilibre entre fluidité et qualité 