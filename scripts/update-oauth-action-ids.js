#!/usr/bin/env node

// Script de mise à jour des action IDs OAuth ChatGPT
// Usage: node scripts/update-oauth-action-ids.js

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

// Configuration des action IDs
const ACTION_IDS = {
  OLD: 'g-011f24575c8d3b9d5d69e124bafa1364ae3badf9',
  NEW: 'g-369c00bd47b6f501275b414d19d5244ac411097b'
};

async function updateOAuthActionIds() {
  console.log('🔄 MISE À JOUR DES ACTION IDS OAUTH CHATGPT');
  console.log('==========================================\n');

  try {
    // 1. Vérifier que la table oauth_clients existe
    console.log('1️⃣ Vérification de la table oauth_clients...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'oauth_clients');

    if (tablesError || tables.length === 0) {
      console.error('❌ Table oauth_clients non trouvée');
      process.exit(1);
    }
    console.log('✅ Table oauth_clients trouvée');

    // 2. Récupérer le client OAuth ChatGPT
    console.log('\n2️⃣ Récupération du client OAuth ChatGPT...');
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();

    if (clientError || !client) {
      console.error('❌ Client OAuth ChatGPT non trouvé');
      process.exit(1);
    }

    console.log('✅ Client OAuth ChatGPT trouvé:');
    console.log('   ID:', client.id);
    console.log('   Nom:', client.name);
    console.log('   URLs actuelles:', client.redirect_uris.join(', '));

    // 3. Vérifier si les deux action IDs sont déjà configurés
    const hasOldActionId = client.redirect_uris.some(uri => uri.includes(ACTION_IDS.OLD));
    const hasNewActionId = client.redirect_uris.some(uri => uri.includes(ACTION_IDS.NEW));

    if (hasOldActionId && hasNewActionId) {
      console.log('\n✅ Les deux action IDs sont déjà configurés !');
      console.log('   Ancienne action ID:', ACTION_IDS.OLD);
      console.log('   Nouvelle action ID:', ACTION_IDS.NEW);
      return;
    }

    // 4. Mettre à jour les URLs pour inclure les deux action IDs
    console.log('\n3️⃣ Mise à jour des action IDs...');
    
    const updatedUris = [...client.redirect_uris];
    
    if (!hasOldActionId) {
      const oldActionUri = `https://chat.openai.com/aip/${ACTION_IDS.OLD}/oauth/callback`;
      updatedUris.push(oldActionUri);
      console.log('   ➕ Ajout ancienne action ID:', oldActionUri);
    }
    
    if (!hasNewActionId) {
      const newActionUri = `https://chat.openai.com/aip/${ACTION_IDS.NEW}/oauth/callback`;
      updatedUris.push(newActionUri);
      console.log('   ➕ Ajout nouvelle action ID:', newActionUri);
    }

    const { error: updateError } = await supabase
      .from('oauth_clients')
      .update({ 
        redirect_uris: updatedUris,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', 'scrivia-custom-gpt');

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Action IDs mis à jour avec succès !');
    console.log('   URLs finales:', updatedUris.join(', '));

    // 5. Vérification finale
    console.log('\n4️⃣ Vérification finale...');
    const { data: finalClient, error: finalError } = await supabase
      .from('oauth_clients')
      .select('redirect_uris')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();

    if (finalError || !finalClient) {
      console.error('❌ Erreur vérification finale:', finalError?.message);
      process.exit(1);
    }

    console.log('✅ Vérification réussie:');
    console.log('   URLs finales:', finalClient.redirect_uris.join(', '));

    // 6. Résumé des action IDs supportés
    console.log('\n🎯 ACTION IDS SUPPORTÉS:');
    console.log('================================');
    console.log('✅ Ancienne action ID:', ACTION_IDS.OLD);
    console.log('✅ Nouvelle action ID:', ACTION_IDS.NEW);
    console.log('✅ URLs de callback:');
    finalClient.redirect_uris.forEach(uri => {
      if (uri.includes('chat.openai.com')) {
        console.log('   -', uri);
      }
    });

    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Tester la configuration: node scripts/test-chatgpt-oauth.js');
    console.log('2. Vérifier que les deux action IDs fonctionnent');
    console.log('3. Tester le flux OAuth avec l\'ancienne et la nouvelle action ID');

    console.log('\n✅ Mise à jour des action IDs OAuth terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
updateOAuthActionIds().catch(console.error);
