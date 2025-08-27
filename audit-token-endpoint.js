#!/usr/bin/env node

/**
 * Script d'audit complet de l'endpoint /api/auth/token
 * Identifie la cause de l'erreur 500
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditTokenEndpoint() {
  console.log('🔍 AUDIT COMPLET - ENDPOINT /API/AUTH/TOKEN');
  console.log('============================================\n');

  try {
    // 1. Test de connexion à la base
    console.log('1️⃣ Test de connexion à la base de données...');
    const { data: testData, error: testError } = await supabase
      .from('oauth_clients')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur de connexion:', testError.message);
      return;
    }
    console.log('✅ Connexion à la base réussie');

    // 2. Vérifier l'existence des tables OAuth
    console.log('\n2️⃣ Vérification des tables OAuth...');
    
    const tables = [
      'oauth_clients',
      'oauth_authorization_codes', 
      'oauth_access_tokens',
      'oauth_refresh_tokens'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Existe (${data?.length || 0} lignes)`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: Erreur - ${err.message}`);
      }
    }

    // 3. Vérifier les données du client OAuth
    console.log('\n3️⃣ Vérification du client OAuth...');
    
    const { data: clients, error: clientsError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();
    
    if (clientsError) {
      console.log('❌ Erreur lecture client:', clientsError.message);
      return;
    }
    
    if (clients) {
      console.log('✅ Client OAuth trouvé:');
      console.log(`   - ID: ${clients.client_id}`);
      console.log(`   - Nom: ${clients.name}`);
      console.log(`   - Actif: ${clients.is_active ? 'Oui' : 'Non'}`);
      console.log(`   - Scopes: ${clients.scopes?.join(', ') || 'Aucun'}`);
      console.log(`   - Redirect URIs: ${clients.redirect_uris?.join(', ') || 'Aucun'}`);
    } else {
      console.log('❌ Client OAuth non trouvé');
      return;
    }

    // 4. Test de validation des credentials
    console.log('\n4️⃣ Test de validation des credentials...');
    
    try {
      // Simuler la validation des credentials
      const { data: client, error: validateError } = await supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .eq('is_active', true)
        .single();
      
      if (validateError) {
        console.log('❌ Erreur validation credentials:', validateError.message);
      } else {
        console.log('✅ Validation credentials réussie');
      }
    } catch (err) {
      console.log('❌ Erreur test validation:', err.message);
    }

    // 5. Vérifier les codes d'autorisation existants
    console.log('\n5️⃣ Vérification des codes d\'autorisation...');
    
    const { data: codes, error: codesError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt')
      .eq('used_at', null)
      .gt('expires_at', new Date().toISOString());
    
    if (codesError) {
      console.log('❌ Erreur lecture codes:', codesError.message);
    } else {
      console.log(`✅ ${codes?.length || 0} code(s) d'autorisation valide(s) trouvé(s)`);
      
      if (codes && codes.length > 0) {
        codes.forEach(code => {
          console.log(`   - Code: ${code.code.substring(0, 8)}...`);
          console.log(`     User ID: ${code.user_id}`);
          console.log(`     Expire: ${code.expires_at}`);
          console.log(`     Scopes: ${code.scopes?.join(', ') || 'Aucun'}`);
        });
      }
    }

    // 6. Test de création d'un code d'autorisation
    console.log('\n6️⃣ Test de création d\'un code d\'autorisation...');
    
    try {
      const testCode = 'test-audit-' + Date.now();
      const { data: newCode, error: createError } = await supabase
        .from('oauth_authorization_codes')
        .insert({
          code: testCode,
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001', // UUID de test
          redirect_uri: 'https://test.com/callback',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Erreur création code:', createError.message);
      } else {
        console.log('✅ Code d\'autorisation créé avec succès');
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
      console.log('❌ Erreur test création code:', err.message);
    }

    // 7. Test de la fonction exchangeCodeForToken
    console.log('\n7️⃣ Test de la logique d\'échange...');
    
    try {
      // Simuler l'échange en testant chaque étape
      const testCode = 'test-exchange-' + Date.now();
      
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
          token_hash: 'test-hash-' + Date.now(),
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 heure
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

// Exécuter l'audit
auditTokenEndpoint().then(() => {
  console.log('\n🎯 RÉSUMÉ DE L\'AUDIT:');
  console.log('========================');
  console.log('- Si toutes les étapes sont ✅, le problème est ailleurs');
  console.log('- Si des étapes échouent ❌, c\'est la cause de l\'erreur 500');
  console.log('- Vérifiez les logs serveur pour plus de détails');
});
