// Test des politiques RLS pour identifier le problème realtime
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔐 Test des politiques RLS...');

async function testRLSPolicies() {
  try {
    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erreur auth:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️ Aucun utilisateur connecté');
    } else {
      console.log('✅ Utilisateur connecté:', user.id);
    }
    
    // 2. Tester l'accès aux tables
    console.log('\n📊 Test accès aux tables...');
    
    // Test articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('count')
      .limit(1);
    
    if (articlesError) {
      console.error('❌ Erreur accès articles:', articlesError);
    } else {
      console.log('✅ Accès articles OK');
    }
    
    // Test folders
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('count')
      .limit(1);
    
    if (foldersError) {
      console.error('❌ Erreur accès folders:', foldersError);
    } else {
      console.log('✅ Accès folders OK');
    }
    
    // Test classeurs
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('count')
      .limit(1);
    
    if (classeursError) {
      console.error('❌ Erreur accès classeurs:', classeursError);
    } else {
      console.log('✅ Accès classeurs OK');
    }
    
    // 3. Tester le realtime avec une table spécifique
    console.log('\n🔌 Test realtime avec articles...');
    
    const channel = supabase
      .channel('test-rls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('🎉 Event reçu!', payload.eventType);
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut realtime articles:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime articles OK');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur canal articles - probablement RLS');
        } else if (status === 'CLOSED') {
          console.log('❌ Canal articles fermé');
        }
      });
    
    // Attendre 3 secondes puis nettoyer
    setTimeout(() => {
      supabase.removeChannel(channel);
      console.log('🧹 Test terminé');
      process.exit(0);
    }, 3000);
    
  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

testRLSPolicies(); 