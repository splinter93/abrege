#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSpecificArticle() {
  console.log('🚨 TEST ARTICLE SPÉCIFIQUE QUI ÉCHOUE');
  console.log('=====================================\n');

  const articleId = 'fce40443-4893-4e14-ba94-73d08020c722';
  console.log('📋 Article ID à tester:', articleId);

  try {
    // 1. Test d'authentification
    console.log('\n🔐 1. Test d\'authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Erreur authentification:', authError.message);
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }
    
    if (!user) {
      console.log('❌ Aucun utilisateur connecté');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }
    
    console.log('✅ Utilisateur connecté:', user.id);
    console.log('📧 Email:', user.email);

    // 2. Test direct de la requête qui échoue
    console.log('\n🔍 2. Test de la requête qui échoue...');
    console.log('Requête: SELECT user_id FROM articles WHERE id = ?', articleId);
    
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('user_id')
      .eq('id', articleId)
      .single();

    console.log('📊 Résultat:', { article, error: articleError });
    
    if (articleError) {
      console.log('❌ Erreur requête:', {
        message: articleError.message,
        code: articleError.code,
        details: articleError.details,
        hint: articleError.hint
      });
    } else if (article) {
      console.log('✅ Article trouvé:', article);
    }

    // 3. Test avec tous les champs
    console.log('\n🔍 3. Test avec tous les champs...');
    const { data: fullArticle, error: fullError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    console.log('📊 Résultat complet:', { fullArticle, error: fullError });

    // 4. Test de tous les articles de l'utilisateur
    console.log('\n🔍 4. Test des articles de l\'utilisateur...');
    const { data: userArticles, error: userArticlesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings')
      .eq('user_id', user.id)
      .limit(5);

    console.log('📊 Articles de l\'utilisateur:', { 
      count: userArticles?.length || 0, 
      articles: userArticles, 
      error: userArticlesError 
    });

    // 5. Test de recherche par slug
    console.log('\n🔍 5. Test de recherche par slug...');
    if (userArticles && userArticles.length > 0) {
      const firstArticle = userArticles[0];
      console.log('🔍 Test avec le premier article:', firstArticle.slug);
      
      const { data: slugArticle, error: slugError } = await supabase
        .from('articles')
        .select('id, source_title, user_id')
        .eq('slug', firstArticle.slug)
        .eq('user_id', user.id)
        .single();

      console.log('📊 Résultat recherche par slug:', { slugArticle, error: slugError });
    }

    // 6. Test des politiques RLS
    console.log('\n🔍 6. Test des politiques RLS...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              policyname,
              permissive,
              cmd,
              qual
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'articles'
          `
        });

      console.log('📊 Politiques RLS:', { policies, error: policiesError });
    } catch (rpcError) {
      console.log('❌ Fonction exec_sql non disponible, test direct...');
      
      // Test direct sans RPC
      const { data: directPolicies, error: directError } = await supabase
        .from('articles')
        .select('id')
        .limit(1);

      console.log('📊 Test direct (avec RLS):', { directPolicies, error: directError });
    }

  } catch (error) {
    console.log('❌ EXCEPTION GLOBALE:', error);
    console.log('Stack trace:', error.stack);
  }
}

// Exécuter le test
testSpecificArticle().catch(console.error); 