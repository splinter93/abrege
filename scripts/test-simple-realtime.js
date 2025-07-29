require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleRealtime() {
  try {
    console.log('🔧 Test simple realtime...');
    
    // Test d'un canal qui reste ouvert
    console.log('📡 Création d\'un canal persistant...');
    const channel = supabase.channel('test-persistent')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('📝 Événement reçu:', payload.eventType);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status canal:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal connecté - va rester ouvert 30 secondes');
          
          // Garder le canal ouvert pendant 30 secondes
          setTimeout(() => {
            console.log('⏰ 30 secondes écoulées, fermeture du canal');
            supabase.removeChannel(channel);
            process.exit(0);
          }, 30000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur canal:', status);
          process.exit(1);
        } else if (status === 'CLOSED') {
          console.log('🔌 Canal fermé inopinément');
        }
      });
    
    console.log('⏳ Attente des événements...');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testSimpleRealtime(); 