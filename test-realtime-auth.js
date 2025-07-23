// Test realtime avec authentification
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔐 Test realtime avec authentification...');

async function testRealtimeWithAuth() {
  try {
    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erreur auth:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️ Aucun utilisateur connecté - test sans auth');
    } else {
      console.log('✅ Utilisateur connecté:', user.id);
    }
    
    // 2. S'abonner au realtime
    console.log('📡 S\'abonnement au realtime...');
    const channel = supabase
      .channel('test-auth')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('🎉 Event reçu!', payload.eventType, payload.new?.source_title || payload.old?.source_title);
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut souscription:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Souscription réussie!');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur de canal - probablement problème d\'auth ou RLS');
        } else if (status === 'TIMED_OUT') {
          console.log('⏰ Timeout - canal expiré');
        }
      });
    
    // 3. Attendre 3 secondes puis créer une note
    setTimeout(async () => {
      console.log('📝 Création d\'une note de test...');
      
      try {
        const { data, error } = await supabase
          .from('articles')
          .insert({
            source_title: 'Test Auth Realtime ' + Date.now(),
            source_type: 'note',
            classeur_id: '75b35cbc-9de3-4b0e-abb1-d4970b2a24a9',
            markdown_content: '# Test Auth\n\nNote de test avec authentification.'
          })
          .select();
        
        if (error) {
          console.error('❌ Erreur création:', error);
        } else {
          console.log('✅ Note créée:', data[0].source_title);
          
          // 4. Supprimer la note après 3 secondes
          setTimeout(async () => {
            console.log('🗑️ Suppression de la note...');
            const { error: deleteError } = await supabase
              .from('articles')
              .delete()
              .eq('id', data[0].id);
            
            if (deleteError) {
              console.error('❌ Erreur suppression:', deleteError);
            } else {
              console.log('✅ Note supprimée');
            }
            
            // 5. Nettoyer
            setTimeout(() => {
              supabase.removeChannel(channel);
              console.log('🧹 Test terminé');
              process.exit(0);
            }, 1000);
            
          }, 3000);
        }
      } catch (err) {
        console.error('❌ Erreur:', err);
      }
    }, 3000);
    
  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

testRealtimeWithAuth(); 