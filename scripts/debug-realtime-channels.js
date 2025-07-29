require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRealtimeChannels() {
  try {
    console.log('🔧 Diagnostic détaillé des canaux realtime...');
    
    // 1. Test de connexion de base
    console.log('📡 Test de connexion Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', authError ? 'Erreur' : 'OK', user ? 'User ID: ' + user.id : 'Pas d\'utilisateur');
    
    // 2. Test de lecture des tables
    console.log('📖 Test lecture tables...');
    const tables = ['articles', 'folders', 'classeurs'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Erreur lecture ${table}:`, error.message);
      } else {
        console.log(`✅ Lecture ${table} OK, ${data?.length || 0} éléments`);
      }
    }
    
    // 3. Test de canaux avec différents noms
    console.log('📡 Test canaux avec différents noms...');
    const channelNames = [
      'public:articles',
      'articles',
      'test-articles',
      'public:folders', 
      'folders',
      'test-folders'
    ];
    
    for (const channelName of channelNames) {
      console.log(`\n🔍 Test canal: ${channelName}`);
      
      const channel = supabase.channel(channelName)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'articles' },
          (payload) => {
            console.log(`📝 Événement sur ${channelName}:`, payload.eventType);
          }
        )
        .subscribe((status) => {
          console.log(`📡 Status ${channelName}:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ ${channelName} connecté`);
            
            // Fermer le canal après 2 secondes
            setTimeout(() => {
              supabase.removeChannel(channel);
              console.log(`🔌 ${channelName} fermé`);
            }, 2000);
            
          } else if (status === 'CHANNEL_ERROR') {
            console.log(`❌ ${channelName} erreur:`, status);
            
            // Fermer le canal immédiatement en cas d'erreur
            setTimeout(() => {
              supabase.removeChannel(channel);
              console.log(`🔌 ${channelName} fermé après erreur`);
            }, 1000);
          }
        });
      
      // Attendre un peu entre les tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n🎯 Diagnostic terminé');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

debugRealtimeChannels(); 