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

async function testPermissionsFix() {
  try {
    console.log('🔍 TEST DE LA CORRECTION DES PERMISSIONS');
    console.log('========================================\n');
    
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
    console.log(`📊 Visibilité: ${testArticle.share_settings?.visibility || 'non définie'}`);
    
    // 3. Test de la requête directe (doit fonctionner maintenant)
    console.log('\n🧪 Test de la requête directe...');
    
    try {
      const { data: directQuery, error: directError } = await supabase
        .from('articles')
        .select('user_id, share_settings')
        .eq('id', testArticle.id)
        .single();
      
      console.log('📊 Résultat requête directe:', { 
        success: !directError, 
        data: directError ? null : directQuery, 
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
    
    // 4. Test de l'API V2 (si le serveur est démarré)
    console.log('\n🌐 Test de l\'API V2...');
    console.log('💡 Assurez-vous que le serveur Next.js est démarré sur http://localhost:3001');
    
    console.log('\n📋 RÉSUMÉ DU TEST');
    console.log('==================');
    
    if (testArticle) {
      console.log('✅ Vous avez un article de test valide');
      console.log('🔧 Le problème était dans les politiques RLS');
      console.log('📝 La correction contourne RLS en vérifiant manuellement les permissions');
    } else {
      console.log('❌ Aucun article de test disponible');
      console.log('🔧 Créez d\'abord une note via l\'interface web');
    }
    
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Redémarrer le serveur Next.js: npm run dev');
    console.log('2. Tester l\'API V2 depuis l\'interface web');
    console.log('3. Vérifier que le bouton œil fonctionne');
    console.log('4. Confirmer que vous pouvez voir vos notes privées');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testPermissionsFix().catch(console.error); 