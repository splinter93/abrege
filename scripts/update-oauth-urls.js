#!/usr/bin/env node

// Script de mise à jour des URLs OAuth ChatGPT
// Usage: node scripts/update-oauth-urls.js

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

// Ancienne et nouvelle URL
const OLD_URL = 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback';
const NEW_URL = 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback';

async function updateOAuthUrls() {
  console.log('🔄 MISE À JOUR DES URLS OAUTH CHATGPT');
  console.log('=====================================\n');

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
      console.error('Exécutez d\'abord la migration OAuth: supabase/migrations/20241220000000_create_oauth_system.sql');
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
      console.error('Exécutez d\'abord: node scripts/setup-chatgpt-oauth.js');
      process.exit(1);
    }

    console.log('✅ Client OAuth ChatGPT trouvé:');
    console.log('   ID:', client.id);
    console.log('   Nom:', client.name);
    console.log('   URLs actuelles:', client.redirect_uris.join(', '));

    // 3. Vérifier si la mise à jour est nécessaire
    if (client.redirect_uris.includes(NEW_URL)) {
      console.log('\n✅ URLs déjà à jour !');
      console.log('   Nouvelle URL:', NEW_URL);
      return;
    }

    // 4. Mettre à jour les URLs
    console.log('\n3️⃣ Mise à jour des URLs...');
    const updatedUris = client.redirect_uris.map(uri => 
      uri === OLD_URL ? NEW_URL : uri
    );

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

    console.log('✅ URLs mises à jour avec succès !');
    console.log('   Ancienne URL:', OLD_URL);
    console.log('   Nouvelle URL:', NEW_URL);
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

    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Tester la configuration: node scripts/test-chatgpt-oauth.js');
    console.log('2. Vérifier que ChatGPT utilise la nouvelle URL');
    console.log('3. Tester le flux OAuth complet');

    console.log('\n✅ Mise à jour des URLs OAuth terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
updateOAuthUrls().catch(console.error);
