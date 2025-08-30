// Utilise fetch natif (Node.js 18+)

async function listClasseurs() {
  try {
    console.log('📚 Liste des classeurs existants...');
    
    const response = await fetch('http://localhost:3000/api/ui/classeurs');
    
    if (!response.ok) {
      throw new Error(`Erreur: ${response.statusText}`);
    }
    
    const classeurs = await response.json();
    
    console.log(`\n✅ ${classeurs.length} classeur(s) trouvé(s):`);
    classeurs.forEach((classeur, index) => {
      console.log(`${index + 1}. ${classeur.name} (ID: ${classeur.id})`);
      console.log(`   Emoji: ${classeur.emoji}`);
      console.log(`   Couleur: ${classeur.color}`);
      console.log(`   Position: ${classeur.position}`);
      console.log('');
    });
    
    if (classeurs.length > 0) {
      console.log('🎯 Utilisez le premier ID pour les tests:');
      console.log(`ID: ${classeurs[0].id}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des classeurs:', error);
  }
}

listClasseurs(); 