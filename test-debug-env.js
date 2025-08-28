// Script de debug pour tester l'API avec les variables d'environnement
const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      });
      
      return envVars;
    }
  } catch (error) {
    console.error('Erreur lecture .env.local:', error.message);
  }
  return {};
}

async function testAPI() {
  const env = loadEnv();
  
  console.log('🔍 Variables d\'environnement trouvées:');
  console.log('- SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('- SUPABASE_ANON_KEY:', env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('❌ Variables Supabase manquantes');
    return;
  }
  
  // Test de connexion Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    console.log('🧪 Test connexion Supabase...');
    const { data, error } = await supabase.from('articles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Erreur Supabase:', error.message);
      console.log('❌ Code:', error.code);
      console.log('❌ Détails:', error.details);
    } else {
      console.log('✅ Connexion Supabase réussie');
      console.log('📊 Nombre d\'articles:', data);
    }
  } catch (error) {
    console.error('💥 Erreur test Supabase:', error.message);
  }
}

testAPI();
