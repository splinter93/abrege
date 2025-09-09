/**
 * Script de test pour vérifier l'extraction des canaux Harmony
 */

const testHarmonyExtraction = () => {
  console.log('🧪 Test d\'extraction des canaux Harmony...');
  
  // Simuler une réponse Harmony typique
  const mockHarmonyResponse = {
    content: "Voici ma réponse finale à votre question.",
    reasoning: `
      <|start|>assistant<|channel|>analysis<|message|>
      Je vais analyser votre question en détail. Il s'agit d'un problème complexe qui nécessite une approche méthodique.
      <|end|>
      
      <|start|>assistant<|channel|>commentary<|message|>
      Mon avis personnel est que cette approche est la plus efficace. J'ai observé que cette méthode fonctionne bien dans des cas similaires.
      <|end|>
      
      <|start|>assistant<|channel|>final<|message|>
      En conclusion, je recommande de procéder ainsi pour obtenir les meilleurs résultats.
      <|end|>
    `
  };
  
  // Simuler une réponse sans tokens Harmony
  const mockSimpleResponse = {
    content: "Voici ma réponse finale à votre question.",
    reasoning: `
      Analyse: Je vais analyser votre question en détail. Il s'agit d'un problème complexe.
      
      Commentaire: Mon avis personnel est que cette approche est la plus efficace.
      
      Réponse finale: En conclusion, je recommande de procéder ainsi.
    `
  };
  
  // Simuler une réponse avec seulement du contenu
  const mockContentOnlyResponse = {
    content: `
      Analyse: Je vais analyser votre question en détail. Il s'agit d'un problème complexe.
      
      Commentaire: Mon avis personnel est que cette approche est la plus efficace.
      
      Réponse finale: En conclusion, je recommande de procéder ainsi.
    `,
    reasoning: ""
  };
  
  console.log('✅ Tests de données mock créés');
  console.log('📝 Pour tester l\'extraction, utilisez le chat Harmony avec ces types de réponses');
  console.log('🔧 Activez FORCE_HARMONY_DISPLAY=true pour forcer l\'affichage des canaux');
  
  return {
    mockHarmonyResponse,
    mockSimpleResponse,
    mockContentOnlyResponse
  };
};

// Exporter pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testHarmonyExtraction };
} else {
  window.testHarmonyExtraction = testHarmonyExtraction;
}

// Exécuter le test
testHarmonyExtraction();

