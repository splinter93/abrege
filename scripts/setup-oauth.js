#!/usr/bin/env node

/**
 * Script de configuration du système OAuth Scrivia
 * Usage: node scripts/setup-oauth.js
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOAuth() {
  console.log('🚀 Configuration du système OAuth Scrivia...\n');

  try {
    // 1. Vérifier la connexion à la base
    console.log('1️⃣ Vérification de la connexion à la base...');
    const { data: testData, error: testError } = await supabase
      .from('oauth_clients')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('   ⚠️  Tables OAuth non trouvées, exécution de la migration...');
      await runMigration();
    } else {
      console.log('   ✅ Tables OAuth déjà présentes');
    }

    // 2. Configuration des clients OAuth
    console.log('\n2️⃣ Configuration des clients OAuth...');
    await setupOAuthClients();

    // 3. Vérification finale
    console.log('\n3️⃣ Vérification finale...');
    await verifySetup();

    console.log('\n🎉 Configuration OAuth terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Redémarrer votre application');
    console.log('   2. Tester le flux OAuth avec ChatGPT');
    console.log('   3. Vérifier les logs pour détecter d\'éventuelles erreurs');

  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

async function runMigration() {
  console.log('   📝 Exécution de la migration OAuth...');
  
  // Note: En production, utilisez Supabase CLI ou l'interface web
  // pour exécuter les migrations
  console.log('   ℹ️  Veuillez exécuter la migration SQL manuellement:');
  console.log('      - Allez dans votre dashboard Supabase');
  console.log('      - Onglet SQL Editor');
  console.log('      - Exécutez le fichier: supabase/migrations/20241220000000_create_oauth_system.sql');
  
  // Attendre la confirmation de l'utilisateur
  console.log('\n   ⏳ Appuyez sur Entrée une fois la migration exécutée...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
}

async function setupOAuthClients() {
  console.log('   🔑 Configuration du client ChatGPT...');

  // Générer le hash du secret
  const clientSecret = 'scrivia-gpt-secret-2024';
  const saltRounds = 12;
  const hashedSecret = await bcrypt.hash(clientSecret, saltRounds);

  // Vérifier si le client existe déjà
  const { data: existingClient } = await supabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', 'scrivia-custom-gpt')
    .single();

  if (existingClient) {
    console.log('   ✅ Client ChatGPT déjà configuré');
    
    // Mettre à jour le secret si nécessaire
    if (existingClient.client_secret_hash !== hashedSecret) {
      console.log('   🔄 Mise à jour du secret client...');
      await supabase
        .from('oauth_clients')
        .update({ client_secret_hash: hashedSecret })
        .eq('client_id', 'scrivia-custom-gpt');
      console.log('   ✅ Secret client mis à jour');
    }
  } else {
    console.log('   ➕ Création du client ChatGPT...');
    
    const { error: insertError } = await supabase
      .from('oauth_clients')
      .insert({
        client_id: 'scrivia-custom-gpt',
        client_secret_hash: hashedSecret,
        name: 'Scrivia ChatGPT Action',
        description: 'Action personnalisée ChatGPT pour interagir avec l\'API Scrivia',
        redirect_uris: [
          'https://chat.openai.com/auth/callback',
          'https://scrivia.app/auth/callback'
        ],
        scopes: [
          'notes:read',
          'notes:write',
          'dossiers:read',
          'dossiers:write',
          'classeurs:read',
          'classeurs:write'
        ],
        is_active: true
      });

    if (insertError) {
      throw new Error(`Erreur création client: ${insertError.message}`);
    }
    
    console.log('   ✅ Client ChatGPT créé');
  }

  console.log('\n   📋 Informations de configuration ChatGPT:');
  console.log(`      Client ID: scrivia-custom-gpt`);
  console.log(`      Client Secret: ${clientSecret}`);
  console.log(`      Authorization URL: https://scrivia.app/api/auth/authorize`);
  console.log(`      Token URL: https://scrivia.app/api/auth/token`);
  console.log(`      Redirect URI: https://chat.openai.com/auth/callback`);
}

async function verifySetup() {
  console.log('   🔍 Vérification de la configuration...');

  // Vérifier que le client est actif
  const { data: client, error: clientError } = await supabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', 'scrivia-custom-gpt')
    .eq('is_active', true)
    .single();

  if (clientError || !client) {
    throw new Error('Client OAuth non trouvé ou inactif');
  }

  console.log('   ✅ Client OAuth actif et configuré');
  console.log(`   ✅ Scopes disponibles: ${client.scopes.join(', ')}`);
  console.log(`   ✅ Redirect URIs: ${client.redirect_uris.join(', ')}`);

  // Vérifier que les tables existent
  const tables = ['oauth_authorization_codes', 'oauth_access_tokens', 'oauth_refresh_tokens'];
  for (const table of tables) {
    const { error: tableError } = await supabase
      .from(table)
      .select('count')
      .limit(1);
    
    if (tableError) {
      throw new Error(`Table ${table} non accessible: ${tableError.message}`);
    }
  }

  console.log('   ✅ Toutes les tables OAuth sont accessibles');
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Exécuter la configuration
setupOAuth().catch(console.error);
