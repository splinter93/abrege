const fetch = require('node-fetch');

async function testAuth() {
  console.log('🔍 Test d\'authentification API v2...');
  
  // Simuler un token JWT (remplace par un vrai token)
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbGludGVyOTMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU2NzIwMCwiZXhwIjoyMDUwMTQzMjAwfQ.EXAMPLE_TOKEN';
  
  const baseUrl = 'https://scrivia.app';
  
  try {
    // Test 1: Lister les classeurs
    console.log('\n📋 Test 1: Lister les classeurs');
    const response1 = await fetch(`${baseUrl}/api/v2/classeurs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    console.log('Status:', response1.status);
    console.log('Headers:', Object.fromEntries(response1.headers.entries()));
    
    const result1 = await response1.text();
    console.log('Response:', result1.substring(0, 200) + '...');
    
    // Test 2: Créer une note
    console.log('\n📝 Test 2: Créer une note');
    const response2 = await fetch(`${baseUrl}/api/v2/note/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        source_title: 'Test Note',
        markdown_content: '# Test\n\nCeci est un test.',
        notebook_id: 'test-notebook'
      })
    });
    
    console.log('Status:', response2.status);
    console.log('Headers:', Object.fromEntries(response2.headers.entries()));
    
    const result2 = await response2.text();
    console.log('Response:', result2.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAuth(); 