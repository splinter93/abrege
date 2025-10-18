/**
 * Script pour ajouter automatiquement le scope .public-note-container .markdown-body
 * dans les fichiers CSS pour que les styles s'appliquent aussi aux pages publiques
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/styles/unified-blocks.css',
  'src/styles/mermaid.css',
  'src/styles/syntax-highlighting.css',
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé : ${file}`);
    return;
  }
  
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modifications = 0;
  
  // Pattern pour trouver les sélecteurs avec .markdown-body
  // On cherche : ".markdown-body quelque-chose {"
  const pattern = /(\.markdown-body\s+[^,{]+)([,{])/g;
  
  content = content.replace(pattern, (match, selector, delimiter) => {
    // Vérifier si le sélecteur contient déjà .public-note-container
    if (selector.includes('.public-note-container')) {
      return match; // Déjà présent, ne pas modifier
    }
    
    modifications++;
    
    // Si c'est une virgule, ajouter le scope public après
    if (delimiter === ',') {
      return `${selector},\n.public-note-container ${selector}${delimiter}`;
    }
    
    // Si c'est une accolade, ajouter le scope public avant
    return `${selector},\n.public-note-container ${selector}${delimiter}`;
  });
  
  // Sauvegarder le fichier modifié
  fs.writeFileSync(filePath, content, 'utf-8');
  
  console.log(`✅ ${modifications} sélecteurs modifiés dans ${file}`);
});

console.log('\n🎉 Terminé ! Les styles devraient maintenant s\'appliquer aux pages publiques.');

