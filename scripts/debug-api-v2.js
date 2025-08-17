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

async function debugApiV2() {
  try {
    console.log('🔍 DIAGNOSTIC COMPLET DE L\'API V2');
    console.log('==================================\n');
    
    // 1. Vérifier l'authentification
    console.log('🔐 Test d\'authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }
    
    console.log(`✅ Utilisateur authentifié: ${user.id}`);
    
    // 2. Vérifier les articles de l'utilisateur
    console.log('\n📝 Vérification des articles de l\'utilisateur...');
    const { data: userArticles, error: articlesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, user_id')
      .eq('user_id', user.id);
    
    if (articlesError) {
      console.log(`❌ Erreur récupération articles: ${articlesError.message}`);
    } else {
      console.log(`✅ Articles trouvés: ${userArticles?.length || 0}`);
      if (userArticles && userArticles.length > 0) {
        userArticles.forEach((article, index) => {
          console.log(`   ${index + 1}. ID: ${article.id} | Titre: "${article.source_title}" | Slug: ${article.slug || 'NULL'}`);
        });
      }
    }
    
    // 3. Tester la résolution de référence avec un ID valide
    if (userArticles && userArticles.length > 0) {
      const testArticle = userArticles[0];
      console.log(`\n🧪 Test de résolution de référence pour: ${testArticle.id}`);
      
      // Test direct de l'API V2
      try {
        const response = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/api/v2/note/${testArticle.id}/metadata`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📡 Réponse API V2: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API V2 fonctionne:', JSON.stringify(data, null, 2));
        } else {
          const errorData = await response.text();
          console.log('❌ Erreur API V2:', errorData);
        }
      } catch (fetchError) {
        console.log(`❌ Erreur fetch: ${fetchError.message}`);
      }
    }
    
    // 4. Vérifier les politiques RLS spécifiquement
    console.log('\n🔒 Vérification des politiques RLS...');
    
    try {
      // Test de lecture directe
      const { data: directRead, error: readError } = await supabase
        .from('articles')
        .select('id, source_title')
        .eq('user_id', user.id)
        .limit(1);
      
      if (readError) {
        console.log(`❌ Erreur lecture directe: ${readError.message}`);
      } else {
        console.log(`✅ Lecture directe OK: ${directRead?.length || 0} articles`);
      }
      
      // Test avec authentification explicite
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Session active trouvée');
        
        // Test avec le token de session
        const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        });
        
        const { data: authRead, error: authReadError } = await supabaseWithAuth
          .from('articles')
          .select('id, source_title')
          .eq('user_id', user.id)
          .limit(1);
        
        if (authReadError) {
          console.log(`❌ Erreur lecture avec auth: ${authReadError.message}`);
        } else {
          console.log(`✅ Lecture avec auth OK: ${authRead?.length || 0} articles`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Erreur test RLS: ${error.message}`);
    }
    
    // 5. Vérifier la structure de la base
    console.log('\n🏗️  Vérification de la structure de la base...');
    
    try {
      // Vérifier si la table articles existe et est accessible
      const { data: tableInfo, error: tableError } = await supabase
        .from('articles')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.log(`❌ Erreur accès table articles: ${tableError.message}`);
        
        // Vérifier les politiques RLS
        console.log('\n🔍 Vérification des politiques RLS...');
        try {
          const { data: policies, error: policiesError } = await supabase
            .rpc('exec_sql', { 
              sql: "SELECT schemaname, tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'articles';" 
            });
          
          if (policiesError) {
            console.log(`❌ Impossible de vérifier les politiques: ${policiesError.message}`);
          } else {
            console.log('📋 Politiques RLS trouvées:');
            policies?.forEach(policy => {
              console.log(`   - ${policy.policyname}: ${policy.cmd}`);
            });
          }
        } catch (rpcError) {
          console.log(`❌ Fonction RPC non disponible: ${rpcError.message}`);
        }
      } else {
        console.log('✅ Table articles accessible');
      }
      
    } catch (error) {
      console.log(`❌ Erreur vérification structure: ${error.message}`);
    }
    
    // 6. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (userArticles && userArticles.length > 0) {
      console.log('✅ Vous avez des articles dans votre base');
      console.log('🔧 Le problème semble être dans l\'API V2 ou les politiques RLS');
      console.log('📝 Vérifiez les logs de l\'API V2 pour plus de détails');
    } else {
      console.log('❌ Aucun article trouvé pour votre utilisateur');
      console.log('🔧 Créez d\'abord une note via l\'interface web');
    }
    
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Vérifiez que l\'application web fonctionne');
    console.log('2. Créez une note via l\'interface web');
    console.log('3. Testez l\'API V2 avec cette nouvelle note');
    console.log('4. Vérifiez les politiques RLS dans Supabase Dashboard');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

// Exécuter le diagnostic
debugApiV2().catch(console.error); 