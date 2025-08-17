#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEditorShareAPI() {
  try {
    console.log('🔍 TEST DE L\'API DE PARTAGE DE L\'ÉDITEUR');
    console.log('==========================================\n');
    
    // 1. Vérifier l'authentification
    console.log('🔐 Test d\'authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      console.log('🔧 Le problème de l\'éditeur nécessite une session active');
      return;
    }
    
    console.log(`✅ Utilisateur authentifié: ${user.id}`);
    
    // 2. Récupérer un article de l'utilisateur pour le test
    console.log('\n📝 Récupération d\'un article de test...');
    const { data: userArticles, error: articlesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, user_id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (articlesError || !userArticles || userArticles.length === 0) {
      console.log(`❌ Erreur récupération articles: ${articlesError?.message || 'Aucun article trouvé'}`);
      return;
    }
    
    const testArticle = userArticles[0];
    console.log(`✅ Article de test trouvé: "${testArticle.source_title}" (${testArticle.id})`);
    console.log(`   Slug: ${testArticle.slug}`);
    console.log(`   Share Settings: ${JSON.stringify(testArticle.share_settings)}`);
    
    // 3. Test de la fonction checkUserPermission (simulation)
    console.log('\n🧪 Test de la fonction checkUserPermission...');
    
    try {
      // Simuler exactement la requête de checkUserPermission
      const { data: permissionTest, error: permissionError } = await supabase
        .from('articles')
        .select('user_id')
        .eq('id', testArticle.id)
        .single();
      
      if (permissionError) {
        console.log(`❌ Erreur checkUserPermission: ${permissionError.message}`);
        console.log(`   Code: ${permissionError.code}`);
        console.log(`   Détails: ${permissionError.details}`);
        console.log(`   Hint: ${permissionError.hint}`);
      } else {
        console.log(`✅ checkUserPermission réussie: user_id = ${permissionTest.user_id}`);
      }
    } catch (permissionErr) {
      console.log(`❌ Exception checkUserPermission: ${permissionErr.message}`);
    }
    
    // 4. Test de l'API V2 /share (simulation)
    console.log('\n🌐 Test de l\'API V2 /share...');
    
    try {
      // Simuler l'appel à l'API V2 /share
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Aucune session active');
        return;
      }
      
      console.log('✅ Session active trouvée');
      
      // Créer un client avec le token de session
      const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      });
      
      // Test de la requête qui échoue dans l'API V2
      console.log('\n🔍 Test de la requête de l\'API V2...');
      
      // 1. Résolution de la référence (slug)
      console.log('   📍 Test 1: Résolution de la référence...');
      const { data: refTest, error: refError } = await supabaseWithAuth
        .from('articles')
        .select('id, user_id, share_settings')
        .eq('slug', testArticle.slug)
        .single();
      
      if (refError) {
        console.log(`   ❌ Erreur résolution référence: ${refError.message}`);
      } else {
        console.log(`   ✅ Référence résolue: ID = ${refTest.id}`);
      }
      
      // 2. Vérification des permissions
      console.log('   🔐 Test 2: Vérification des permissions...');
      if (refTest) {
        const { data: permTest, error: permError } = await supabaseWithAuth
          .from('articles')
          .select('user_id')
          .eq('id', refTest.id)
          .single();
        
        if (permError) {
          console.log(`   ❌ Erreur vérification permissions: ${permError.message}`);
        } else {
          console.log(`   ✅ Permissions vérifiées: user_id = ${permTest.user_id}`);
        }
      }
      
      // 3. Test de mise à jour
      console.log('   ✏️  Test 3: Test de mise à jour...');
      if (refTest) {
        const newSettings = {
          ...testArticle.share_settings,
          visibility: 'link-public'
        };
        
        const { data: updateTest, error: updateError } = await supabaseWithAuth
          .from('articles')
          .update({ 
            share_settings: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', refTest.id)
          .select('id, share_settings, updated_at')
          .single();
        
        if (updateError) {
          console.log(`   ❌ Erreur mise à jour: ${updateError.message}`);
        } else {
          console.log(`   ✅ Mise à jour réussie: ${JSON.stringify(updateTest.share_settings)}`);
        }
      }
      
    } catch (apiErr) {
      console.log(`❌ Erreur API V2: ${apiErr.message}`);
    }
    
    // 5. Diagnostic des politiques RLS
    console.log('\n🔒 Diagnostic des politiques RLS...');
    
    try {
      // Test avec l'utilisateur authentifié
      const { data: rlsTest, error: rlsError } = await supabase
        .from('articles')
        .select('id, source_title, user_id')
        .eq('user_id', user.id)
        .limit(3);
      
      if (rlsError) {
        console.log(`❌ Erreur RLS avec auth: ${rlsError.message}`);
      } else {
        console.log(`✅ RLS avec auth fonctionne: ${rlsTest?.length || 0} articles trouvés`);
      }
      
      // Test avec l'utilisateur non authentifié (client anon)
      const supabaseAnon = createClient(supabaseUrl, supabaseKey);
      const { data: anonTest, error: anonError } = await supabaseAnon
        .from('articles')
        .select('id, source_title, user_id')
        .limit(3);
      
      if (anonError) {
        console.log(`❌ Erreur RLS sans auth: ${anonError.message}`);
      } else {
        console.log(`✅ RLS sans auth fonctionne: ${anonTest?.length || 0} articles trouvés`);
      }
      
    } catch (rlsErr) {
      console.log(`❌ Exception diagnostic RLS: ${rlsErr.message}`);
    }
    
    // 6. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (testArticle) {
      console.log('✅ Vous avez un article de test valide');
      console.log('🔧 Le problème semble être dans l\'API V2 ou l\'authentification');
      console.log('📝 Vérifiez que l\'éditeur utilise le bon token d\'authentification');
      console.log('🔍 Vérifiez les logs de l\'API V2 dans la console du navigateur');
    } else {
      console.log('❌ Aucun article de test disponible');
      console.log('🔧 Créez d\'abord une note via l\'interface web');
    }
    
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Vérifier l\'authentification dans l\'éditeur');
    console.log('2. Vérifier les logs de l\'API V2 dans la console');
    console.log('3. Vérifier que le token est bien envoyé dans les headers');
    console.log('4. Tester l\'API V2 directement avec Postman/curl');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testEditorShareAPI().catch(console.error); 