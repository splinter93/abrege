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

async function testPermissionCheck() {
  try {
    console.log('🔍 TEST DE LA FONCTION CHECKUSERPERMISSION');
    console.log('==========================================\n');
    
    // 1. Vérifier l'authentification
    console.log('🔐 Test d\'authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
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
    
    // 3. Test direct de la requête qui échoue dans checkUserPermission
    console.log('\n🧪 Test de la requête qui échoue dans checkUserPermission...');
    
    try {
      const { data: directQuery, error: directError } = await supabase
        .from('articles')
        .select('user_id')
        .eq('id', testArticle.id)
        .single();
      
      if (directError) {
        console.log(`❌ Erreur requête directe: ${directError.message}`);
        console.log(`   Code: ${directError.code}`);
        console.log(`   Détails: ${directError.details}`);
        console.log(`   Hint: ${directError.hint}`);
      } else {
        console.log(`✅ Requête directe réussie: user_id = ${directQuery.user_id}`);
      }
    } catch (directErr) {
      console.log(`❌ Exception requête directe: ${directErr.message}`);
    }
    
    // 4. Test avec authentification explicite
    console.log('\n🔐 Test avec authentification explicite...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Session active trouvée');
        
        // Créer un client avec le token de session
        const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        });
        
        const { data: authQuery, error: authError } = await supabaseWithAuth
          .from('articles')
          .select('user_id')
          .eq('id', testArticle.id)
          .single();
        
        if (authError) {
          console.log(`❌ Erreur avec auth explicite: ${authError.message}`);
        } else {
          console.log(`✅ Requête avec auth réussie: user_id = ${authQuery.user_id}`);
        }
      } else {
        console.log('❌ Aucune session active');
      }
    } catch (sessionErr) {
      console.log(`❌ Erreur session: ${sessionErr.message}`);
    }
    
    // 5. Test de la table articles complète
    console.log('\n📊 Test de la table articles complète...');
    
    try {
      const { data: allArticles, error: allError } = await supabase
        .from('articles')
        .select('id, source_title, user_id')
        .limit(5);
      
      if (allError) {
        console.log(`❌ Erreur récupération tous articles: ${allError.message}`);
      } else {
        console.log(`✅ Récupération tous articles réussie: ${allArticles?.length || 0} articles`);
        allArticles?.forEach((article, index) => {
          console.log(`   ${index + 1}. ID: ${article.id} | Titre: "${article.source_title}" | User: ${article.user_id}`);
        });
      }
    } catch (allErr) {
      console.log(`❌ Exception récupération tous articles: ${allErr.message}`);
    }
    
    // 6. Vérification des politiques RLS
    console.log('\n🔒 Vérification des politiques RLS...');
    
    try {
      // Test de lecture avec filtre user_id
      const { data: filteredArticles, error: filteredError } = await supabase
        .from('articles')
        .select('id, source_title')
        .eq('user_id', user.id)
        .limit(3);
      
      if (filteredError) {
        console.log(`❌ Erreur filtre user_id: ${filteredError.message}`);
      } else {
        console.log(`✅ Filtre user_id réussi: ${filteredArticles?.length || 0} articles trouvés`);
      }
    } catch (filteredErr) {
      console.log(`❌ Exception filtre user_id: ${filteredErr.message}`);
    }
    
    // 7. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (testArticle) {
      console.log('✅ Vous avez un article de test valide');
      console.log('🔧 Le problème semble être dans les politiques RLS');
      console.log('📝 Appliquez le script SQL de correction RLS');
      console.log('🔍 Vérifiez que les politiques ont été créées correctement');
    } else {
      console.log('❌ Aucun article de test disponible');
      console.log('🔧 Créez d\'abord une note via l\'interface web');
    }
    
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Appliquer le script SQL de correction RLS');
    console.log('2. Vérifier les politiques dans Supabase Dashboard');
    console.log('3. Tester à nouveau la fonction checkUserPermission');
    console.log('4. Vérifier que l\'API V2 fonctionne');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testPermissionCheck().catch(console.error); 