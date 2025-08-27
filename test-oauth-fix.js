#!/usr/bin/env node

/**
 * Script de test pour vérifier que la correction OAuth résout l'erreur 500
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOAuthFix() {
  console.log('🧪 TEST DE LA CORRECTION OAUTH');
  console.log('================================\n');

  try {
    // 1. Test de la requête qui causait l'erreur 500
    console.log('1️⃣ Test de la requête corrigée...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .is('used_at', null)  // Utiliser .is() au lieu de .eq() pour NULL
        .gt('expires_at', new Date().toISOString());
      
      if (testError) {
        console.log('❌ La correction n\'a pas résolu le problème:', testError.message);
        return;
      } else {
        console.log(`✅ La correction fonctionne ! ${testData?.length || 0} code(s) trouvé(s)`);
        
        if (testData && testData.length > 0) {
          console.log('\n   Codes valides:');
          testData.forEach((code, index) => {
            console.log(`   ${index + 1}. ${code.code.substring(0, 8)}... (User: ${code.user_id})`);
            console.log(`      Scopes: ${code.scopes?.join(', ') || 'Aucun'}`);
            console.log(`      Expire: ${code.expires_at}`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Erreur test correction:', err.message);
      return;
    }

    // 2. Test de création d'un nouveau code OAuth
    console.log('\n2️⃣ Test de création d\'un nouveau code OAuth...');
    
    try {
      const testCode = 'test-fix-' + Date.now();
      const { data: newCode, error: createError } = await supabase
        .from('oauth_authorization_codes')
        .insert({
          code: testCode,
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001',
          redirect_uri: 'https://test.com/callback',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Erreur création code:', createError.message);
      } else {
        console.log('✅ Code OAuth créé avec succès');
        console.log(`   - ID: ${newCode.id}`);
        console.log(`   - Code: ${newCode.code}`);
        
        // Nettoyer le code de test
        await supabase
          .from('oauth_authorization_codes')
          .delete()
          .eq('id', newCode.id);
        console.log('🧹 Code de test supprimé');
      }
    } catch (err) {
      console.log('❌ Erreur test création:', err.message);
    }

    // 3. Test de simulation de l'échange OAuth
    console.log('\n3️⃣ Test de simulation de l\'échange OAuth...');
    
    try {
      // Simuler l'échange en testant chaque étape
      const testCode = 'test-exchange-fix-' + Date.now();
      
      // Étape 1: Créer un code
      const { data: codeData, error: codeError } = await supabase
        .from('oauth_authorization_codes')
        .insert({
          code: testCode,
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001',
          redirect_uri: 'https://test.com/callback',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .select()
        .single();
      
      if (codeError) {
        console.log('❌ Étape 1 - Création code:', codeError.message);
        return;
      }
      console.log('✅ Étape 1 - Code créé');
      
      // Étape 2: Marquer comme utilisé
      const { error: updateError } = await supabase
        .from('oauth_authorization_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeData.id);
      
      if (updateError) {
        console.log('❌ Étape 2 - Marquer utilisé:', updateError.message);
      } else {
        console.log('✅ Étape 2 - Code marqué comme utilisé');
      }
      
      // Étape 3: Créer un access token
      const { data: tokenData, error: tokenError } = await supabase
        .from('oauth_access_tokens')
        .insert({
          token_hash: 'test-hash-fix-' + Date.now(),
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();
      
      if (tokenError) {
        console.log('❌ Étape 3 - Création token:', tokenError.message);
      } else {
        console.log('✅ Étape 3 - Access token créé');
        
        // Nettoyer les données de test
        await supabase.from('oauth_access_tokens').delete().eq('id', tokenData.id);
        await supabase.from('oauth_authorization_codes').delete().eq('id', codeData.id);
        console.log('🧹 Données de test supprimées');
      }
      
    } catch (err) {
      console.log('❌ Erreur test échange:', err.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le test
testOAuthFix().then(() => {
  console.log('\n🎯 RÉSUMÉ DU TEST:');
  console.log('====================');
  console.log('- Si tous les tests passent ✅, l\'erreur 500 est résolue');
  console.log('- L\'endpoint /api/auth/token devrait maintenant fonctionner');
  console.log('- Testez le flux OAuth complet');
});
