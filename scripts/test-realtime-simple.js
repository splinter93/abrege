require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  try {
    console.log('🧪 Test simple du realtime Supabase...');
    
    // Test 1: Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('⚠️ Erreur authentification:', authError.message);
    } else if (user) {
      console.log('✅ Utilisateur authentifié:', user.id);
    } else {
      console.log('⚠️ Aucun utilisateur authentifié');
    }
    
    // Test 2: Créer un canal simple
    console.log('📡 Création d\'un canal de test...');
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('📝 Événement reçu:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut du canal de test:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de test connecté avec succès');
          
          // Tester en créant une note
          setTimeout(async () => {
            console.log('📝 Création d\'une note de test...');
            const { data, error } = await supabase
              .from('articles')
              .insert({
                source_title: 'Test Realtime',
                markdown_content: '# Test',
                user_id: user?.id || '3223651c-5580-4471-affb-b3f4456bd729' // UUID valide
              })
              .select();
            
            if (error) {
              console.log('❌ Erreur création note:', error.message);
            } else {
              console.log('✅ Note de test créée:', data);
            }
          }, 2000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur canal de test - Problème de configuration');
        } else if (status === 'CLOSED') {
          console.log('❌ Canal de test fermé');
        }
      });
    
    // Attendre 10 secondes puis nettoyer
    setTimeout(() => {
      console.log('🧹 Nettoyage du canal de test...');
      supabase.removeAllChannels();
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testRealtime(); 