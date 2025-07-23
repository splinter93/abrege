// Test simple du realtime Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Test simple du realtime...');

// 1. S'abonner au realtime
const channel = supabase
  .channel('test-simple')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'articles' },
    (payload) => {
      console.log('🎉 Event reçu!', payload.eventType, payload.new?.source_title || payload.old?.source_title);
    }
  )
  .subscribe((status) => {
    console.log('📡 Statut:', status);
  });

// 2. Attendre 2 secondes puis créer une note
setTimeout(async () => {
  console.log('📝 Création d\'une note de test...');
  
  try {
    const { data, error } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test Realtime Simple ' + Date.now(),
        source_type: 'note',
        classeur_id: '75b35cbc-9de3-4b0e-abb1-d4970b2a24a9', // Utiliser un classeur existant
        markdown_content: '# Test\n\nNote de test pour vérifier le realtime.'
      })
      .select();
    
    if (error) {
      console.error('❌ Erreur création:', error);
    } else {
      console.log('✅ Note créée:', data[0].source_title);
      
      // 3. Supprimer la note après 3 secondes
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
        
        // 4. Nettoyer
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
}, 2000); 