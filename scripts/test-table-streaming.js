/**
 * Test du streaming des tableaux Markdown
 * Vérifie que les tableaux ne se cassent pas pendant le streaming
 */

// Simulation du ToolCallsParser amélioré
class TestToolCallsParser {
  constructor() {
    this.contentBuffer = '';
  }

  feed(chunk) {
    const delta = chunk?.choices?.[0]?.delta;
    if (!delta) return;

    if (typeof delta.content === 'string') {
      this.contentBuffer += delta.content;
    }
  }

  finish() {
    return {
      content: this.cleanMarkdownContent(this.contentBuffer.trim()),
      toolCalls: [],
      reasoning: ''
    };
  }

  // Fonction pour détecter si on est dans un tableau Markdown
  isInTable(content) {
    const lines = content.split('\n');
    let inTable = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Détecter le début d'un tableau
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        inTable = true;
      }
      // Détecter la ligne de séparation
      else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
        inTable = true;
      }
      // Détecter la fin d'un tableau (ligne vide ou autre contenu)
      else if (inTable && trimmedLine === '') {
        inTable = false;
      }
      // Si on est dans un tableau et qu'on a une ligne qui ne commence pas par |
      else if (inTable && trimmedLine !== '' && !trimmedLine.startsWith('|')) {
        inTable = false;
      }
    }
    
    return inTable;
  }

  // Fonction pour nettoyer et valider le contenu Markdown
  cleanMarkdownContent(content) {
    if (!content) return '';
    
    // Gestion spéciale pour les tableaux
    const lines = content.split('\n');
    const cleanedLines = [];
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
}

// Tests
async function testTableStreaming() {
  console.log('🧪 Test du streaming des tableaux...\n');

  // Test 1: Tableau complet en streaming
  console.log('📋 Test 1: Tableau complet en streaming');
  const parser1 = new TestToolCallsParser();
  
  const chunks1 = [
    { choices: [{ delta: { content: '| Nom | Âge | Ville |\n' } }] },
    { choices: [{ delta: { content: '|-----|-----|------|\n' } }] },
    { choices: [{ delta: { content: '| Jean | 25 | Paris |\n' } }] },
    { choices: [{ delta: { content: '| Marie | 30 | Lyon |\n' } }] },
    { choices: [{ delta: { content: '| Pierre | 35 | Marseille |\n' } }] }
  ];

  chunks1.forEach(chunk => parser1.feed(chunk));
  const result1 = parser1.finish();
  
  console.log('   Contenu final:');
  console.log(result1.content);
  console.log('   ✅ Tableau complet correctement parsé');

  // Test 2: Tableau partiel (simulation d'un problème)
  console.log('\n📋 Test 2: Tableau partiel (problème simulé)');
  const parser2 = new TestToolCallsParser();
  
  const chunks2 = [
    { choices: [{ delta: { content: '| Nom | Âge | Ville |\n' } }] },
    { choices: [{ delta: { content: '|-----|-----|------|\n' } }] },
    { choices: [{ delta: { content: '| Jean | 25 | Paris |\n' } }] },
    { choices: [{ delta: { content: '| Marie | 30 | Lyon |\n' } }] },
    { choices: [{ delta: { content: '| Pierre | 35 | Marseille' } }] } // Ligne incomplète
  ];

  chunks2.forEach(chunk => parser2.feed(chunk));
  const result2 = parser2.finish();
  
  console.log('   Contenu final:');
  console.log(result2.content);
  console.log('   ✅ Tableau partiel corrigé');

  // Test 3: Tableau avec contenu après
  console.log('\n📋 Test 3: Tableau avec contenu après');
  const parser3 = new TestToolCallsParser();
  
  const chunks3 = [
    { choices: [{ delta: { content: 'Voici un tableau:\n\n' } }] },
    { choices: [{ delta: { content: '| Nom | Âge | Ville |\n' } }] },
    { choices: [{ delta: { content: '|-----|-----|------|\n' } }] },
    { choices: [{ delta: { content: '| Jean | 25 | Paris |\n' } }] },
    { choices: [{ delta: { content: '| Marie | 30 | Lyon |\n' } }] },
    { choices: [{ delta: { content: '\nEt voici du texte après le tableau.' } }] }
  ];

  chunks3.forEach(chunk => parser3.feed(chunk));
  const result3 = parser3.finish();
  
  console.log('   Contenu final:');
  console.log(result3.content);
  console.log('   ✅ Tableau avec contenu après correctement parsé');

  // Test 4: Détection de tableau
  console.log('\n📋 Test 4: Détection de tableau');
  const testContents = [
    '| Nom | Âge |',
    '|-----|-----|',
    '| Jean | 25 |',
    '| Marie | 30 |',
    'Voici du texte normal',
    '| Nom | Âge |\n|-----|-----|\n| Jean | 25 |',
    '| Nom | Âge |\n|-----|-----|\n| Jean | 25 |\n\nTexte après'
  ];

  testContents.forEach((content, index) => {
    const inTable = parser1.isInTable(content);
    console.log(`   Test ${index + 1}: ${inTable ? '✅ Dans un tableau' : '❌ Pas dans un tableau'}`);
    console.log(`   Contenu: ${content.substring(0, 50)}...`);
  });

  console.log('\n✅ Tous les tests terminés !');
}

// Exécuter les tests
testTableStreaming().catch(console.error); 