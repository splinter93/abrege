// Script de test pour l'API publique
const testPublicAPI = async () => {
  const username = 'user_3223651c-5580-4471-affb-b3f4456bd729';
  const slug = 'pipelines-premium-marie-jeffrey';
  
  console.log('Testing public API...');
  console.log(`URL: /api/v1/public/note/${username}/${slug}`);
  
  try {
    const res = await fetch(`http://localhost:3000/api/v1/public/note/${username}/${slug}`);
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    
    const data = await res.text();
    console.log('Response:', data);
    
    if (res.ok) {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    }
  } catch (err) {
    console.error('Error:', err);
  }
};

// Exécuter si appelé directement
if (typeof window === 'undefined') {
  testPublicAPI();
} 