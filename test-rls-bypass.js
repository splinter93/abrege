async function testRLSBypass() {
  console.log('🔍 Test de la correction RLS avec token simulé');
  
  // Simuler un token JWT valide (remplace par un vrai token si disponible)
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';
  
  try {
    console.log('🧪 Test de l\'API v2 avec token simulé...');
    
    const response = await fetch('http://localhost:3000/api/v2/classeur/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        name: 'Test Classeur RLS Bypass',
        description: 'Test de la correction RLS avec token simulé'
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📊 Réponse:', result);

    if (response.ok) {
      console.log('✅ API v2 fonctionne avec la correction RLS !');
    } else {
      console.log('❌ API v2 retourne une erreur:', result.error);
      
      // Analyser l'erreur pour comprendre le problème
      if (result.error && result.error.includes('row-level security')) {
        console.log('🔍 Problème RLS détecté - la correction n\'a pas fonctionné');
      } else if (result.error && result.error.includes('Token')) {
        console.log('🔍 Problème d\'authentification - token invalide');
      } else {
        console.log('🔍 Autre problème détecté');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }
}

testRLSBypass(); 