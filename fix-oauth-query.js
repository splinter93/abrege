#!/usr/bin/env node

/**
 * Script pour corriger le problème de requête OAuth avec les valeurs null
 * Le problème: .eq('used_at', null) peut être interprété comme .eq('used_at', "null")
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

async function fixOAuthQuery() {
  console.log('🔧 CORRECTION REQUÊTE OAUTH - PROBLÈME NULL');
  console.log('============================================\n');

  try {
    // 1. Test de la requête problématique actuelle
    console.log('1️⃣ Test de la requête problématique actuelle...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .eq('used_at', null)  // Cette ligne cause le problème
        .gt('expires_at', new Date().toISOString());
      
      if (testError) {
        console.log('❌ Requête problématique échoue:', testError.message);
      } else {
        console.log(`✅ Requête problématique fonctionne: ${testData?.length || 0} résultats`);
        return; // Pas de problème
      }
    } catch (err) {
      console.log('❌ Erreur requête problématique:', err.message);
    }

    // 2. Test avec la syntaxe correcte
    console.log('\n2️⃣ Test avec la syntaxe correcte...');
    
    try {
      const { data: correctData, error: correctError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .is('used_at', null)  // Utiliser .is() au lieu de .eq() pour NULL
        .gt('expires_at', new Date().toISOString());
      
      if (correctError) {
        console.log('❌ Requête corrigée échoue aussi:', correctError.message);
      } else {
        console.log(`✅ Requête corrigée fonctionne: ${correctData?.length || 0} résultats`);
      }
    } catch (err) {
      console.log('❌ Erreur requête corrigée:', err.message);
    }

    // 3. Test alternatif avec filtre manuel
    console.log('\n3️⃣ Test avec filtre manuel...');
    
    try {
      const { data: manualData, error: manualError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('client_id', 'scrivia-custom-gpt')
        .gt('expires_at', new Date().toISOString());
      
      if (manualError) {
        console.log('❌ Requête manuelle échoue:', manualError.message);
      } else {
        // Filtrer manuellement les codes non utilisés
        const validCodes = manualData?.filter(code => code.used_at === null) || [];
        console.log(`✅ Filtrage manuel réussi: ${validCodes.length} codes valides sur ${manualData?.length || 0} total`);
        
        if (validCodes.length > 0) {
          console.log('   Codes valides:');
          validCodes.forEach(code => {
            console.log(`   - ${code.code.substring(0, 8)}... (User: ${code.user_id})`);
          });
        }
      }
    } catch (err) {
      console.log('❌ Erreur filtrage manuel:', err.message);
    }

    // 4. Vérifier la structure de la table
    console.log('\n4️⃣ Vérification de la structure de la table...');
    
    try {
      const { data: structure, error: structureError } = await supabase
        .rpc('get_table_structure', { table_name: 'oauth_authorization_codes' });
      
      if (structureError) {
        console.log('❌ Impossible de récupérer la structure:', structureError.message);
        
        // Test alternatif - essayer de voir les colonnes
        const { data: columns, error: columnsError } = await supabase
          .from('oauth_authorization_codes')
          .select('*')
          .limit(1);
        
        if (columnsError) {
          console.log('❌ Erreur lecture colonnes:', columnsError.message);
        } else if (columns && columns.length > 0) {
          console.log('✅ Structure de la table (exemple):');
          const sample = columns[0];
          Object.keys(sample).forEach(key => {
            console.log(`   - ${key}: ${typeof sample[key]} (${sample[key]})`);
          });
        }
      } else {
        console.log('✅ Structure de la table récupérée:', structure);
      }
    } catch (err) {
      console.log('❌ Erreur vérification structure:', err.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter la correction
fixOAuthQuery().then(() => {
  console.log('\n🎯 RÉSUMÉ DE LA CORRECTION:');
  console.log('=============================');
  console.log('- Le problème vient de .eq(\'used_at\', null)');
  console.log('- Solution: utiliser .is(\'used_at\', null) ou filtrage manuel');
  console.log('- L\'OAuth service doit être mis à jour');
});
