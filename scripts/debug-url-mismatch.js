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

async function debugUrlMismatch() {
  try {
    console.log('🔍 Debug du décalage d\'URL...\n');

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

    // 3. Rechercher la note par le slug de l'URL
    console.log('3️⃣ Recherche de la note par slug...');
    
    const targetSlug = 'article-sur-le-lbo-2';
    console.log(`🎯 Slug recherché: "${targetSlug}"`);
    
    const { data: noteBySlug, error: slugError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, user_id')
      .eq('slug', targetSlug)
      .eq('user_id', user.id)
      .single();

    if (slugError) {
      console.log('❌ Note non trouvée par slug:', slugError.message);
    } else {
      console.log('✅ Note trouvée par slug:');
      console.log(`   - ID: ${noteBySlug.id}`);
      console.log(`   - Titre: "${noteBySlug.source_title}"`);
      console.log(`   - Slug: ${noteBySlug.slug}`);
      console.log(`   - Visibilité: ${noteBySlug.share_settings?.visibility}`);
      console.log(`   - User ID: ${noteBySlug.user_id}`);
    }
    console.log('');

    // 4. Lister toutes les notes de l'utilisateur pour comparaison
    console.log('4️⃣ Liste de toutes les notes de l\'utilisateur...');
    
    const { data: allNotes, error: allNotesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (allNotesError) {
      console.error('❌ Erreur récupération notes:', allNotesError.message);
      return;
    }

    console.log(`📊 ${allNotes.length} note(s) trouvée(s):`);
    allNotes.forEach((note, index) => {
      console.log(`   ${index + 1}. "${note.source_title}"`);
      console.log(`      - Slug: ${note.slug || '❌ MANQUANT'}`);
      console.log(`      - Visibilité: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
      console.log(`      - Créée: ${new Date(note.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // 5. Rechercher des notes similaires
    console.log('5️⃣ Recherche de notes similaires...');
    
    const similarNotes = allNotes.filter(note => 
      note.slug && (
        note.slug.includes('lbo') || 
        note.slug.includes('article') ||
        note.source_title.toLowerCase().includes('lbo')
      )
    );

    if (similarNotes.length > 0) {
      console.log(`🔍 ${similarNotes.length} note(s) similaire(s) trouvée(s):`);
      similarNotes.forEach(note => {
        console.log(`   - "${note.source_title}"`);
        console.log(`     Slug: ${note.slug}`);
        console.log(`     URL: /@${username}/${note.slug}`);
        console.log('');
      });
    } else {
      console.log('🔍 Aucune note similaire trouvée');
    }

    // 6. Tester l'URL complète
    console.log('6️⃣ Test de l\'URL complète...');
    
    const testUrl = `https://www.scrivia.app/@${username}/${targetSlug}`;
    console.log(`🔗 URL testée: ${testUrl}`);
    
    // Vérifier si cette URL correspond à une note existante
    const matchingNote = allNotes.find(note => 
      note.slug === targetSlug && note.share_settings?.visibility !== 'private'
    );

    if (matchingNote) {
      console.log('✅ URL valide - note trouvée et accessible');
      console.log(`   - Titre: "${matchingNote.source_title}"`);
      console.log(`   - Visibilité: ${matchingNote.share_settings.visibility}`);
    } else {
      console.log('❌ URL invalide - note non trouvée ou non accessible');
      
      // Vérifier pourquoi
      const noteExists = allNotes.find(note => note.slug === targetSlug);
      if (noteExists) {
        console.log('   💡 Note existe mais problème de visibilité:');
        console.log(`      - Visibilité: ${noteExists.share_settings?.visibility || 'undefined'}`);
        console.log(`      - Privée: ${noteExists.share_settings?.visibility === 'private' ? 'OUI' : 'NON'}`);
      } else {
        console.log('   💡 Note n\'existe pas avec ce slug');
      }
    }
    console.log('');

    // 7. Recommandations
    console.log('7️⃣ Recommandations...\n');
    
    if (matchingNote) {
      console.log('✅ L\'URL devrait fonctionner');
      console.log('💡 Vérifiez:');
      console.log('   1. Que vous êtes bien connecté');
      console.log('   2. Que la note n\'est pas en cours de chargement');
      console.log('   3. Les logs de la console pour d\'autres erreurs');
    } else {
      console.log('⚠️  L\'URL ne correspond à aucune note accessible');
      console.log('💡 Solutions:');
      console.log('   1. Vérifiez le slug dans l\'URL');
      console.log('   2. Changez la visibilité de la note si elle est privée');
      console.log('   3. Utilisez une des URLs valides listées ci-dessus');
    }

    console.log('\n🎯 Debug terminé!');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le debug
debugUrlMismatch().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 