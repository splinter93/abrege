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

async function testUsernameResolution() {
  try {
    console.log('🧪 Test de résolution des usernames...\n');

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

    // 2. Récupérer le username de l'utilisateur connecté
    console.log('2️⃣ Récupération du username de l\'utilisateur connecté...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.username) {
      console.error('❌ Erreur récupération username:', userError?.message);
      return;
    }

    const actualUsername = userData.username;
    console.log('✅ Username réel en base:', actualUsername);
    console.log('');

    // 3. Tester différents formats d'username
    console.log('3️⃣ Test de différents formats d\'username...');
    
    const testUsernames = [
      actualUsername,
      actualUsername.toLowerCase(),
      actualUsername.toUpperCase(),
      'Splinter', // Username de l'URL que vous testez
      'splinter',
      'SPLINTER'
    ];

    console.log('🔍 Usernames testés:');
    testUsernames.forEach(testUsername => {
      console.log(`   - "${testUsername}"`);
    });
    console.log('');

    // 4. Tester la résolution de chaque username
    console.log('4️⃣ Test de résolution de chaque username...\n');
    
    for (const testUsername of testUsernames) {
      console.log(`🔍 Test avec username: "${testUsername}"`);
      
      try {
        // Simuler la logique de la route publique
        const { data: resolvedUser, error: resolveError } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', testUsername)
          .limit(1)
          .maybeSingle();

        if (resolveError) {
          console.log(`   ❌ Erreur de résolution: ${resolveError.message}`);
        } else if (!resolvedUser) {
          console.log(`   ❌ Username non trouvé`);
        } else {
          console.log(`   ✅ Username résolu: ${resolvedUser.username} (ID: ${resolvedUser.id})`);
          
          // Vérifier si c'est le bon utilisateur
          if (resolvedUser.id === user.id) {
            console.log(`   🎯 CORRECT: C'est bien votre utilisateur`);
          } else {
            console.log(`   ⚠️  ATTENTION: C'est un autre utilisateur!`);
          }
        }
        
      } catch (error) {
        console.log(`   💥 Erreur: ${error.message}`);
      }
      
      console.log('');
    }

    // 5. Tester la recherche de notes avec différents usernames
    console.log('5️⃣ Test de recherche de notes avec différents usernames...\n');
    
    const targetSlug = 'article-sur-le-lbo-2';
    
    for (const testUsername of testUsernames) {
      console.log(`🔍 Test de recherche de note avec username: "${testUsername}"`);
      
      try {
        // Simuler la logique complète de la route publique
        const { data: resolvedUser } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', testUsername)
          .limit(1)
          .maybeSingle();

        if (!resolvedUser) {
          console.log(`   ❌ Username non résolu`);
          console.log('');
          continue;
        }

        // Chercher la note
        const { data: note, error: noteError } = await supabase
          .from('articles')
          .select('id, source_title, slug, share_settings')
          .eq('slug', targetSlug)
          .eq('user_id', resolvedUser.id)
          .not('share_settings->>visibility', 'eq', 'private')
          .limit(1)
          .maybeSingle();

        if (noteError) {
          console.log(`   ❌ Erreur recherche note: ${noteError.message}`);
        } else if (!note) {
          console.log(`   ❌ Note non trouvée ou non accessible`);
          console.log(`      - Slug recherché: ${targetSlug}`);
          console.log(`      - User ID: ${resolvedUser.id}`);
        } else {
          console.log(`   ✅ Note trouvée!`);
          console.log(`      - Titre: "${note.source_title}"`);
          console.log(`      - Slug: ${note.slug}`);
          console.log(`      - Visibilité: ${note.share_settings.visibility}`);
          console.log(`      - URL: /@${testUsername}/${note.slug}`);
        }
        
      } catch (error) {
        console.log(`   💥 Erreur: ${error.message}`);
      }
      
      console.log('');
    }

    // 6. Résumé et recommandations
    console.log('6️⃣ Résumé et recommandations...\n');
    
    console.log('📊 Résultats:');
    console.log(`   - Username réel en base: "${actualUsername}"`);
    console.log(`   - Username dans l'URL testée: "Splinter"`);
    console.log(`   - Slug recherché: "${targetSlug}"`);
    console.log('');
    
    if (actualUsername.toLowerCase() === 'splinter') {
      console.log('✅ Les usernames correspondent (même casse)');
      console.log('💡 Le problème pourrait être:');
      console.log('   1. La note n\'existe pas avec ce slug');
      console.log('   2. La note est privée');
      console.log('   3. Problème de résolution de l\'URL');
    } else {
      console.log('⚠️  Les usernames ne correspondent pas');
      console.log('💡 Solutions:');
      console.log(`   1. Utiliser l'URL: /@${actualUsername}/${targetSlug}`);
      console.log(`   2. Ou vérifier que la note existe avec ce slug`);
    }
    
    console.log('\n🎯 Test terminé!');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le test
testUsernameResolution().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 