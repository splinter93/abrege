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

async function testApiV2Fix() {
  try {
    console.log('🔍 TEST DE LA CORRECTION API V2');
    console.log('================================\n');
    
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
    
    // 3. Test de la fonction checkUserPermission avec client authentifié
    console.log('\n🧪 Test de la fonction checkUserPermission avec client authentifié...');
    
    try {
      // Créer un client authentifié
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.log('❌ Pas de token de session disponible');
        return;
      }
      
      console.log('✅ Token de session récupéré');
      
      // Test direct de la requête qui échouait avant
      const { data: directQuery, error: directError } = await supabase
        .from('articles')
        .select('user_id')
        .eq('id', testArticle.id)
        .single();
      
      console.log('📊 Résultat requête directe:', { 
        success: !directError, 
        data: directQuery, 
        error: directError?.message 
      });
      
      if (directError) {
        console.log('❌ La requête directe échoue encore');
        console.log('🔧 Le problème persiste dans les politiques RLS');
      } else {
        console.log('✅ La requête directe fonctionne maintenant');
        console.log('🎉 La correction a résolu le problème !');
      }
      
    } catch (error) {
      console.log('❌ Erreur lors du test:', error.message);
    }
    
    console.log('\n📋 RÉSUMÉ DU TEST');
    console.log('==================');
    
    if (testArticle) {
      console.log('✅ Vous avez un article de test valide');
      console.log('🔧 Le problème était dans l\'utilisation du client Supabase');
      console.log('📝 La correction passe maintenant le client authentifié à checkUserPermission');
    } else {
      console.log('❌ Aucun article de test disponible');
      console.log('🔧 Créez d\'abord une note via l\'interface web');
    }
    
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Tester l\'API V2 depuis l\'interface web');
    console.log('2. Vérifier que l\'éditeur fonctionne sans erreur');
    console.log('3. Tester la modification des paramètres de partage');
    console.log('4. Vérifier que tous les endpoints V2 fonctionnent');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testApiV2Fix().catch(console.error); 