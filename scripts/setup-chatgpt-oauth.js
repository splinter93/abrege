#!/usr/bin/env node

// Script de configuration OAuth ChatGPT
// Usage: node scripts/setup-chatgpt-oauth.js

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

async function setupChatGPTOAuth() {
  console.log('🤖 CONFIGURATION OAUTH CHATGPT');
  console.log('================================\n');

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

    // 2. Configurer le client OAuth ChatGPT
    console.log('\n2️⃣ Configuration du client OAuth ChatGPT...');
    
    const clientId = 'scrivia-custom-gpt';
    const clientSecret = 'scrivia-gpt-secret-2024';
    const clientSecretHash = await bcrypt.hash(clientSecret, 10);
    
    const { data: existingClient, error: checkError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erreur vérification client existant:', checkError.message);
      process.exit(1);
    }

    if (existingClient) {
      console.log('✅ Client OAuth ChatGPT existe déjà');
      console.log('   ID:', existingClient.id);
      console.log('   Nom:', existingClient.name);
      console.log('   Actif:', existingClient.is_active ? 'Oui' : 'Non');
      
      // Mettre à jour les redirect_uris si nécessaire
      const expectedUris = [
        'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
        'https://scrivia.app/auth/callback'
      ];
      
      const needsUpdate = !expectedUris.every(uri => 
        existingClient.redirect_uris.includes(uri)
      );
      
      if (needsUpdate) {
        console.log('\n🔄 Mise à jour des redirect_uris...');
        const { error: updateError } = await supabase
          .from('oauth_clients')
          .update({ 
            redirect_uris: expectedUris,
            scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write', 'profile:read'],
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);
        
        if (updateError) {
          console.error('❌ Erreur mise à jour:', updateError.message);
        } else {
          console.log('✅ Redirect URIs et scopes mis à jour');
        }
      }
    } else {
      console.log('🆕 Création du client OAuth ChatGPT...');
      
      const { data: newClient, error: createError } = await supabase
        .from('oauth_clients')
        .insert({
          client_id: clientId,
          client_secret_hash: clientSecretHash,
          name: 'Scrivia ChatGPT Action',
          description: 'Action personnalisée ChatGPT pour interagir avec l\'API Scrivia',
          redirect_uris: [
            'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
            'https://scrivia.app/auth/callback'
          ],
          scopes: [
            'notes:read',
            'notes:write', 
            'dossiers:read',
            'dossiers:write',
            'classeurs:read',
            'classeurs:write',
            'profile:read'
          ],
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création client:', createError.message);
        process.exit(1);
      }

      console.log('✅ Client OAuth ChatGPT créé avec succès');
      console.log('   ID:', newClient.id);
      console.log('   Client ID:', newClient.client_id);
      console.log('   Nom:', newClient.name);
    }

    // 3. Vérifier la configuration finale
    console.log('\n3️⃣ Vérification de la configuration finale...');
    const { data: finalClient, error: finalError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (finalError || !finalClient) {
      console.error('❌ Erreur récupération client final:', finalError?.message);
      process.exit(1);
    }

    console.log('✅ Configuration finale:');
    console.log('   Client ID:', finalClient.client_id);
    console.log('   Nom:', finalClient.name);
    console.log('   Actif:', finalClient.is_active ? 'Oui' : 'Non');
    console.log('   Redirect URIs:', finalClient.redirect_uris.join(', '));
    console.log('   Scopes:', finalClient.scopes.join(', '));

    // 4. Instructions pour ChatGPT
    console.log('\n🎯 INSTRUCTIONS POUR CHATGPT:');
    console.log('================================');
    console.log('1. Dans ChatGPT, utilisez ces paramètres OAuth:');
    console.log(`   - Client ID: ${clientId}`);
    console.log(`   - Client Secret: ${clientSecret}`);
    console.log(`   - Redirect URI: https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback`);
    console.log('2. Assurez-vous que l\'URL de callback est bien configurée dans Google Cloud Console');
    console.log('3. Testez la connexion OAuth depuis ChatGPT');

    console.log('\n✅ Configuration OAuth ChatGPT terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
setupChatGPTOAuth().catch(console.error);
