require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseRealtime() {
  try {
    console.log('🔧 Diagnostic Realtime...');
    
    // 1. Test de lecture des articles
    console.log('📖 Test lecture articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (articlesError) {
      console.log('❌ Erreur lecture articles:', articlesError.message);
    } else {
      console.log('✅ Lecture articles OK, articles trouvés:', articles?.length || 0);
    }
    
    // 2. Test de lecture des dossiers
    console.log('📁 Test lecture dossiers...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .limit(1);
    
    if (foldersError) {
      console.log('❌ Erreur lecture dossiers:', foldersError.message);
    } else {
      console.log('✅ Lecture dossiers OK, dossiers trouvés:', folders?.length || 0);
    }
    
    // 3. Test de lecture des classeurs
    console.log('📚 Test lecture classeurs...');
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('*')
      .limit(1);
    
    if (classeursError) {
      console.log('❌ Erreur lecture classeurs:', classeursError.message);
    } else {
      console.log('✅ Lecture classeurs OK, classeurs trouvés:', classeurs?.length || 0);
    }
    
    // 4. Test de canal realtime pour articles
    console.log('📡 Test canal realtime articles...');
    const channel = supabase.channel('test-articles')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('📝 Événement realtime articles:', payload.eventType);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status canal articles:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal articles connecté');
          
          // Tester un événement en créant une note
          setTimeout(async () => {
            console.log('📝 Test création note pour realtime...');
            const { data: testNote, error: createError } = await supabase
              .from('articles')
              .insert({
                source_title: 'Test Realtime',
                markdown_content: '# Test',
                user_id: '3223651c-5580-4471-affb-b3f4456bd729',
                classeur_id: '75b35cbc-9de3-4b0e-abb1-d4970b2a24a9',
                slug: 'test-realtime-' + Date.now(),
                position: 0
              })
              .select();
            
            if (createError) {
              console.log('❌ Erreur création test:', createError.message);
            } else {
              console.log('✅ Note test créée:', testNote?.[0]?.id);
              
              // Supprimer la note de test
              if (testNote?.[0]?.id) {
                const { error: deleteError } = await supabase
                  .from('articles')
                  .delete()
                  .eq('id', testNote[0].id);
                
                if (deleteError) {
                  console.log('⚠️ Erreur suppression test:', deleteError.message);
                } else {
                  console.log('✅ Note test supprimée');
                }
              }
            }
            
            // Fermer le canal de test
            setTimeout(() => {
              supabase.removeChannel(channel);
              console.log('🔌 Canal de test fermé');
            }, 2000);
            
          }, 1000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur canal articles:', status);
        }
      });
    
    // 5. Test de canal realtime pour dossiers
    console.log('📡 Test canal realtime dossiers...');
    const folderChannel = supabase.channel('test-folders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'folders' },
        (payload) => {
          console.log('📁 Événement realtime dossiers:', payload.eventType);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status canal dossiers:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal dossiers connecté');
          
          // Fermer le canal de test après un délai
          setTimeout(() => {
            supabase.removeChannel(folderChannel);
            console.log('🔌 Canal dossiers de test fermé');
          }, 3000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Erreur canal dossiers:', status);
        }
      });
    
    console.log('🎯 Diagnostic realtime terminé');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

diagnoseRealtime(); 