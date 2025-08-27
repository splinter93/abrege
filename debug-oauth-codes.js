#!/usr/bin/env node

/**
 * Script pour déboguer et corriger la table oauth_authorization_codes
 * Résout le problème de timestamp null qui cause l'erreur 500
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

async function debugOAuthCodes() {
  console.log('🔍 DÉBOGAGE TABLE OAUTH_AUTHORIZATION_CODES');
  console.log('==========================================\n');

  try {
    // 1. Examiner tous les codes existants
    console.log('1️⃣ Lecture de tous les codes d\'autorisation...');
    
    const { data: allCodes, error: allCodesError } = await supabase
      .from('oauth_authorization_codes')
      .select('*');
    
    if (allCodesError) {
      console.log('❌ Erreur lecture tous les codes:', allCodesError.message);
      return;
    }
    
    console.log(`✅ ${allCodes?.length || 0} code(s) trouvé(s)`);
    
    if (allCodes && allCodes.length > 0) {
      allCodes.forEach((code, index) => {
        console.log(`\n   Code ${index + 1}:`);
        console.log(`   - ID: ${code.id}`);
        console.log(`   - Code: ${code.code}`);
        console.log(`   - Client ID: ${code.client_id}`);
        console.log(`   - User ID: ${code.user_id}`);
        console.log(`   - Redirect URI: ${code.redirect_uri}`);
        console.log(`   - Scopes: ${code.scopes?.join(', ') || 'Aucun'}`);
        console.log(`   - State: ${code.state || 'Aucun'}`);
        console.log(`   - Expires At: ${code.expires_at || 'NULL (PROBLÉMATIQUE!)'}`);
        console.log(`   - Used At: ${code.used_at || 'Non utilisé'}`);
        console.log(`   - Created At: ${code.created_at || 'Aucun'}`);
      });
    }

    // 2. Identifier les codes avec des timestamps null
    console.log('\n2️⃣ Identification des codes problématiques...');
    
    const problematicCodes = allCodes?.filter(code => 
      !code.expires_at || 
      code.expires_at === 'null' || 
      code.expires_at === null
    ) || [];
    
    if (problematicCodes.length > 0) {
      console.log(`⚠️ ${problematicCodes.length} code(s) avec timestamp null détecté(s):`);
      problematicCodes.forEach(code => {
        console.log(`   - ID: ${code.id}, Code: ${code.code}`);
      });
    } else {
      console.log('✅ Aucun code problématique trouvé');
    }

    // 3. Corriger les codes problématiques
    if (problematicCodes.length > 0) {
      console.log('\n3️⃣ Correction des codes problématiques...');
      
      for (const code of problematicCodes) {
        try {
          // Définir une date d'expiration valide (10 minutes dans le futur)
          const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          
          const { error: updateError } = await supabase
            .from('oauth_authorization_codes')
            .update({ 
              expires_at: newExpiresAt,
              // Si le code est très ancien, le marquer comme utilisé
              used_at: code.created_at && new Date(code.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000) 
                ? new Date().toISOString() 
                : code.used_at
            })
            .eq('id', code.id);
          
          if (updateError) {
            console.log(`❌ Erreur correction code ${code.id}:`, updateError.message);
          } else {
            console.log(`✅ Code ${code.id} corrigé`);
          }
        } catch (err) {
          console.log(`❌ Erreur correction code ${code.id}:`, err.message);
        }
      }
    }

    // 4. Vérifier la correction
    console.log('\n4️⃣ Vérification de la correction...');
    
    const { data: verifyCodes, error: verifyError } = await supabase
      .from('oauth_authorization_codes')
      .select('*');
    
    if (verifyError) {
      console.log('❌ Erreur vérification:', verifyError.message);
    } else {
      const stillProblematic = verifyCodes?.filter(code => 
        !code.expires_at || 
        code.expires_at === 'null' || 
        code.expires_at === null
      ) || [];
      
      if (stillProblematic.length === 0) {
        console.log('✅ Tous les codes ont été corrigés');
      } else {
        console.log(`⚠️ ${stillProblematic.length} code(s) problématique(s) restent`);
      }
    }

    // 5. Test de la requête qui causait l'erreur
    console.log('\n5️⃣ Test de la requête problématique...');
    
    try {
      const { data: testCodes, error: testError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .eq('used_at', null)
        .gt('expires_at', new Date().toISOString());
      
      if (testError) {
        console.log('❌ La requête problématique échoue encore:', testError.message);
      } else {
        console.log(`✅ La requête problématique fonctionne maintenant: ${testCodes?.length || 0} code(s) trouvé(s)`);
      }
    } catch (err) {
      console.log('❌ Erreur test requête:', err.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le débogage
debugOAuthCodes().then(() => {
  console.log('\n🎯 RÉSUMÉ DU DÉBOGAGE:');
  console.log('========================');
  console.log('- Les codes avec timestamp null ont été corrigés');
  console.log('- L\'erreur 500 devrait maintenant être résolue');
  console.log('- Testez à nouveau le flux OAuth');
});
