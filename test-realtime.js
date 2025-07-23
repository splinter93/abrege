// Test script pour vérifier le realtime Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Test Realtime Supabase...');

// Test 1: Vérifier la connexion
async function testConnection() {
  console.log('📡 Test de connexion...');
  try {
    const { data, error } = await supabase.from('articles').select('count').limit(1);
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      return false;
    }
    console.log('✅ Connexion réussie');
    return true;
  } catch (err) {
    console.error('❌ Erreur de connexion:', err);
    return false;
  }
}

// Test 2: Vérifier le realtime
async function testRealtime() {
  console.log('🔄 Test du realtime...');
  
  const channel = supabase
    .channel('test-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      (payload) => {
        console.log('📡 Event realtime reçu:', payload.eventType, payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Statut souscription:', status);
    });
  
  // Attendre un peu pour voir si la connexion s'établit
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return channel;
}

// Test 3: Vérifier l'authentification
async function testAuth() {
  console.log('🔐 Test de l\'authentification...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Erreur d\'authentification:', error);
      return false;
    }
    if (user) {
      console.log('✅ Utilisateur authentifié:', user.email);
      return true;
    } else {
      console.log('⚠️ Aucun utilisateur authentifié');
      return false;
    }
  } catch (err) {
    console.error('❌ Erreur d\'authentification:', err);
    return false;
  }
}

// Test principal
async function runTests() {
  console.log('🚀 Démarrage des tests...\n');
  
  // Test 1: Connexion
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('❌ Test de connexion échoué, arrêt des tests');
    return;
  }
  
  // Test 2: Authentification
  const authOk = await testAuth();
  if (!authOk) {
    console.log('⚠️ Utilisateur non authentifié - le realtime peut ne pas fonctionner');
  }
  
  // Test 3: Realtime
  const channel = await testRealtime();
  
  console.log('\n📊 Résumé des tests:');
  console.log('- Connexion:', connectionOk ? '✅' : '❌');
  console.log('- Authentification:', authOk ? '✅' : '⚠️');
  console.log('- Realtime:', channel ? '✅' : '❌');
  
  if (!authOk) {
    console.log('\n💡 Pour tester le realtime complet:');
    console.log('1. Connectez-vous via l\'interface Supabase');
    console.log('2. Relancez ce test');
  }
}

// Exécuter les tests
runTests().catch(console.error); 