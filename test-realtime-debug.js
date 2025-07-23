// Test script pour débugger le realtime Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Test Realtime Supabase - Debug...');

// Test 1: Vérifier la connexion et les données
async function testConnection() {
  console.log('📡 Test de connexion...');
  try {
    const { data, error } = await supabase.from('articles').select('*').limit(5);
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      return false;
    }
    console.log('✅ Connexion OK, articles trouvés:', data.length);
    return true;
  } catch (err) {
    console.error('❌ Erreur:', err);
    return false;
  }
}

// Test 2: Vérifier les permissions RLS
async function testRLS() {
  console.log('🔐 Test des permissions RLS...');
  try {
    const { data, error } = await supabase.from('articles').select('count');
    if (error) {
      console.error('❌ Erreur RLS:', error);
      return false;
    }
    console.log('✅ Permissions RLS OK');
    return true;
  } catch (err) {
    console.error('❌ Erreur RLS:', err);
    return false;
  }
}

// Test 3: Tester le realtime
async function testRealtime() {
  console.log('🔌 Test du realtime...');
  
  const channel = supabase
    .channel('test-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'articles' },
      (payload) => {
        console.log('🎉 Event realtime reçu!', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Statut souscription:', status);
    });
  
  // Attendre 5 secondes pour voir si des événements arrivent
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Se désabonner
  supabase.removeChannel(channel);
  console.log('✅ Test realtime terminé');
}

// Test 4: Créer une note de test
async function createTestNote() {
  console.log('📝 Création d\'une note de test...');
  try {
    const { data, error } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test Realtime ' + Date.now(),
        source_type: 'note',
        classeur_id: 'test-classeur',
        markdown_content: '# Test\n\nNote de test pour vérifier le realtime.'
      })
      .select();
    
    if (error) {
      console.error('❌ Erreur création note:', error);
      return null;
    }
    
    console.log('✅ Note de test créée:', data[0]);
    return data[0];
  } catch (err) {
    console.error('❌ Erreur:', err);
    return null;
  }
}

// Test 5: Supprimer la note de test
async function deleteTestNote(noteId) {
  if (!noteId) return;
  
  console.log('🗑️ Suppression de la note de test...');
  try {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      console.error('❌ Erreur suppression:', error);
    } else {
      console.log('✅ Note de test supprimée');
    }
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests...\n');
  
  // Test 1: Connexion
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('❌ Arrêt des tests - connexion échouée');
    return;
  }
  
  // Test 2: RLS
  const rlsOk = await testRLS();
  if (!rlsOk) {
    console.log('❌ Arrêt des tests - RLS échoué');
    return;
  }
  
  // Test 3: Realtime
  console.log('\n--- Test Realtime ---');
  await testRealtime();
  
  // Test 4: Créer une note
  console.log('\n--- Test Création Note ---');
  const testNote = await createTestNote();
  
  // Test 5: Supprimer la note
  if (testNote) {
    console.log('\n--- Test Suppression Note ---');
    await deleteTestNote(testNote.id);
  }
  
  console.log('\n✅ Tous les tests terminés');
}

runAllTests().catch(console.error); 