#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

console.log('🚨 TEST AUTH DEBUG');
console.log('==================\n');

console.log('📋 Variables d\'environnement:');
console.log('- URL:', supabaseUrl);
console.log('- Clé anon:', supabaseAnonKey ? 'PRÉSENTE' : 'ABSENTE');
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    // 1. Test de connexion basique
    console.log('🔍 1. Test de connexion basique...');
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    console.log('📊 Résultat test basique:', { 
      data: testData?.length || 0, 
      error: testError?.message || 'Aucune erreur' 
    });

    // 2. Test d'authentification
    console.log('\n🔍 2. Test d\'authentification...');
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

    // 3. Test de l'article spécifique
    console.log('\n🔍 3. Test de l\'article spécifique...');
    const articleId = 'fce40443-4893-4e14-ba94-73d08020c722';
    
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('user_id, source_title')
      .eq('id', articleId)
      .single();

    console.log('📊 Résultat article spécifique:', { 
      article, 
      error: articleError?.message || 'Aucune erreur',
      code: articleError?.code || 'Aucun code'
    });

    // 4. Test avec session
    console.log('\n🔍 4. Test avec session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Session trouvée');
      console.log('🔑 Token présent:', !!session.access_token);
      console.log('📅 Expire le:', session.expires_at);
      
      // Test avec le token de session
      const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      });
      
      const { data: authArticle, error: authArticleError } = await supabaseWithAuth
        .from('articles')
        .select('user_id, source_title')
        .eq('id', articleId)
        .single();

      console.log('📊 Résultat avec auth:', { 
        authArticle, 
        error: authArticleError?.message || 'Aucune erreur',
        code: authArticleError?.code || 'Aucun code'
      });
    } else {
      console.log('❌ Aucune session trouvée');
    }

  } catch (error) {
    console.log('❌ EXCEPTION GLOBALE:', error);
    console.log('Stack trace:', error.stack);
  }
}

testAuth().catch(console.error); 