import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNoteVisibilityAPI() {
  try {
    console.log('🧪 Test de l\'API de visibilité des notes...\n');

    // 1. Vérifier l'authentification
    console.log('1️⃣ Test d\'authentification...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }

    console.log('✅ Utilisateur authentifié:', user.id);
    console.log('');

    // 2. Récupérer le username
    console.log('2️⃣ Récupération du username...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.username) {
      console.error('❌ Erreur récupération username:', userError?.message);
      return;
    }

    const username = userData.username;
    console.log('✅ Username récupéré:', username);
    console.log('');

    // 3. Lister toutes les notes de l'utilisateur
    console.log('3️⃣ Récupération des notes de l\'utilisateur...');
    
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('❌ Erreur récupération notes:', notesError.message);
      return;
    }

    console.log(`📊 ${notes.length} note(s) trouvée(s)`);
    console.log('');

    // 4. Tester chaque note individuellement
    console.log('4️⃣ Test individuel de chaque note...\n');
    
    for (const note of notes) {
      console.log(`📝 Test de la note: "${note.source_title}"`);
      console.log(`   - ID: ${note.id}`);
      console.log(`   - Slug: ${note.slug || '❌ MANQUANT'}`);
      console.log(`   - Visibilité: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
      
      if (!note.slug) {
        console.log('   ❌ Impossible de tester - pas de slug');
        console.log('');
        continue;
      }

      // 5. Tester l'accès via l'API publique
      console.log('   5️⃣ Test de l\'API publique...');
      
      try {
        const publicUrl = `${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co')}/rest/v1/articles?select=id,source_title,html_content,header_image,created_at,updated_at,share_settings&slug=eq.${note.slug}&user_id=eq.${user.id}&not.share_settings->>visibility=eq.private`;
        
        console.log('   🔗 URL de test:', publicUrl);
        
        // Test avec l'API REST directe
        const response = await fetch(publicUrl, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            console.log('   ✅ API publique accessible - note trouvée');
            console.log('   📄 Données retournées:', {
              id: data[0].id,
              title: data[0].source_title,
              hasContent: !!data[0].html_content,
              visibility: data[0].share_settings?.visibility
            });
          } else {
            console.log('   ⚠️  API publique accessible mais note non trouvée');
          }
        } else {
          console.log(`   ❌ API publique inaccessible - Status: ${response.status}`);
          const errorText = await response.text();
          console.log(`   📄 Réponse d'erreur:`, errorText);
        }
        
      } catch (apiError) {
        console.log(`   💥 Erreur test API publique:`, apiError.message);
      }

      // 6. Tester la construction de l'URL
      console.log('   6️⃣ Test de construction d\'URL...');
      
      const constructedUrl = `https://scrivia.app/@${username}/${note.slug}`;
      console.log(`   🔗 URL construite: ${constructedUrl}`);
      
      // 7. Vérifier la logique de visibilité
      console.log('   7️⃣ Vérification de la logique de visibilité...');
      
      const isPrivate = note.share_settings?.visibility === 'private';
      const isAccessible = !isPrivate;
      
      console.log(`   🔒 Note privée: ${isPrivate ? 'OUI' : 'NON'}`);
      console.log(`   🌐 Note accessible: ${isAccessible ? 'OUI' : 'NON'}`);
      
      if (isAccessible) {
        console.log(`   ✅ Le bouton œil devrait fonctionner pour cette note`);
        console.log(`   🎯 URL finale: ${constructedUrl}`);
      } else {
        console.log(`   ❌ Le bouton œil ne devrait PAS fonctionner pour cette note (privée)`);
      }
      
      console.log('');
    }

    // 8. Résumé et recommandations
    console.log('8️⃣ Résumé et recommandations...\n');
    
    const accessibleNotes = notes.filter(note => 
      note.slug && note.share_settings?.visibility !== 'private'
    );
    
    const privateNotes = notes.filter(note => 
      note.share_settings?.visibility === 'private'
    );
    
    const notesWithoutSlug = notes.filter(note => !note.slug);
    
    console.log('📊 Statistiques:');
    console.log(`   - Notes totales: ${notes.length}`);
    console.log(`   - Notes accessibles: ${accessibleNotes.length}`);
    console.log(`   - Notes privées: ${privateNotes.length}`);
    console.log(`   - Notes sans slug: ${notesWithoutSlug.length}`);
    console.log('');
    
    if (accessibleNotes.length > 0) {
      console.log('✅ Notes testables avec le bouton œil:');
      accessibleNotes.forEach(note => {
        console.log(`   - "${note.source_title}" → /@${username}/${note.slug}`);
      });
    }
    
    if (privateNotes.length > 0) {
      console.log('🔒 Notes privées (bouton œil bloqué):');
      privateNotes.forEach(note => {
        console.log(`   - "${note.source_title}" (${note.share_settings.visibility})`);
      });
    }
    
    if (notesWithoutSlug.length > 0) {
      console.log('⚠️  Notes sans slug (bouton œil bloqué):');
      notesWithoutSlug.forEach(note => {
        console.log(`   - "${note.source_title}"`);
      });
    }
    
    console.log('\n🎯 Test terminé!');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le test
testNoteVisibilityAPI().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 