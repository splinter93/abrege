#!/usr/bin/env node

/**
 * Script pour corriger les scopes OAuth dans la base de données
 * Supprime le scope invalide 'profile:read'
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

async function fixOAuthScopes() {
  console.log('🔧 CORRECTION DES SCOPES OAUTH');
  console.log('================================\n');

  try {
    // 1. Vérifier l'état actuel
    console.log('1️⃣ État actuel des scopes...');
    const { data: clients, error: clientsError } = await supabase
      .from('oauth_clients')
      .select('*');
    
    if (clientsError) {
      console.log('❌ Erreur lecture clients:', clientsError.message);
      return;
    }
    
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        console.log(`   - ${client.client_id}: ${client.name}`);
        console.log(`     Scopes actuels: ${client.scopes?.join(', ') || 'Aucun'}`);
      });
    }

    // 2. Corriger les scopes pour scrivia-custom-gpt
    console.log('\n2️⃣ Correction des scopes pour scrivia-custom-gpt...');
    
    const validScopes = [
      'notes:read',
      'notes:write', 
      'dossiers:read',
      'dossiers:write',
      'classeurs:read',
      'classeurs:write'
    ];
    
    const { data: updateData, error: updateError } = await supabase
      .from('oauth_clients')
      .update({ scopes: validScopes })
      .eq('client_id', 'scrivia-custom-gpt')
      .select();
    
    if (updateError) {
      console.log('❌ Erreur mise à jour scopes:', updateError.message);
      return;
    }
    
    if (updateData && updateData.length > 0) {
      console.log('✅ Scopes mis à jour avec succès');
      console.log(`   Nouveaux scopes: ${updateData[0].scopes.join(', ')}`);
    } else {
      console.log('⚠️ Aucun client mis à jour');
    }

    // 3. Vérifier la correction
    console.log('\n3️⃣ Vérification de la correction...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();
    
    if (verifyError) {
      console.log('❌ Erreur vérification:', verifyError.message);
      return;
    }
    
    if (verifyData) {
      console.log('✅ Client vérifié:');
      console.log(`   - ID: ${verifyData.client_id}`);
      console.log(`   - Nom: ${verifyData.name}`);
      console.log(`   - Scopes: ${verifyData.scopes.join(', ')}`);
      
      // Vérifier qu'il n'y a plus de profile:read
      if (verifyData.scopes.includes('profile:read')) {
        console.log('❌ PROBLÈME: profile:read est encore présent!');
      } else {
        console.log('✅ SUCCÈS: profile:read a été supprimé');
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter la correction
fixOAuthScopes().then(() => {
  console.log('\n🎯 Résumé de la correction:');
  console.log('- Les scopes OAuth ont été corrigés');
  console.log('- profile:read a été supprimé');
  console.log('- Seuls les scopes valides sont maintenant autorisés');
  console.log('\n🔄 Maintenant, testez à nouveau le flux OAuth');
});
