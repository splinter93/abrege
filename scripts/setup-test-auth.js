#!/usr/bin/env node

/**
 * Script de configuration de l'authentification de test
 * Génère des tokens valides pour tester l'API batch
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupTestAuth() {
  console.log('🔐 Configuration de l\'authentification de test...\n');

  // Vérifier les variables d'environnement
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nAjoutez ces variables dans votre fichier .env');
    process.exit(1);
  }

  try {
    // 1. Client avec service role pour créer un utilisateur de test
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Créer un utilisateur de test
    console.log('👤 Création d\'un utilisateur de test...');
    
    const testUserEmail = `test-user-${Date.now()}@abrege.test`;
    const testUserPassword = 'TestPassword123!';
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
      user_metadata: { 
        name: 'Test User',
        role: 'test'
      }
    });

    if (userError) {
      console.error('❌ Erreur création utilisateur:', userError.message);
      process.exit(1);
    }

    const testUserId = userData.user.id;
    console.log(`✅ Utilisateur de test créé: ${testUserId}`);

    // 3. Créer une session de test
    console.log('\n🔑 Création d\'une session de test...');
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: testUserEmail
    });

    if (sessionError) {
      console.error('❌ Erreur création session:', sessionError.message);
      process.exit(1);
    }

    // 4. Créer une session de chat de test
    console.log('\n💬 Création d\'une session de chat de test...');
    
    const { data: chatSession, error: chatError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        id: testUserId, // Utiliser l'ID utilisateur comme ID de session pour simplifier
        user_id: testUserId,
        name: 'Session de test Phase 1',
        thread: [],
        history_limit: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (chatError) {
      console.error('❌ Erreur création session chat:', chatError.message);
      process.exit(1);
    }

    console.log(`✅ Session de chat créée: ${chatSession.id}`);

    // 5. Générer un token JWT pour l'utilisateur de test
    console.log('\n🎫 Génération du token JWT de test...');
    
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: testUserEmail
    });

    if (tokenError) {
      console.error('❌ Erreur génération token:', tokenError.message);
      process.exit(1);
    }

    // 6. Créer le fichier de configuration de test
    const testConfig = {
      testUserId,
      testUserEmail,
      testUserPassword,
      testChatSessionId: chatSession.id,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      timestamp: new Date().toISOString()
    };

    const configPath = 'scripts/test-config.json';
    require('fs').writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    console.log('\n🎉 Configuration de test créée avec succès !');
    console.log('\n📋 Informations de test:');
    console.log(`   - Utilisateur ID: ${testUserId}`);
    console.log(`   - Email: ${testUserEmail}`);
    console.log(`   - Session Chat: ${chatSession.id}`);
    console.log(`   - Config sauvegardée: ${configPath}`);
    
    console.log('\n💡 Utilisez ces informations dans vos scripts de test:');
    console.log(`   const config = require('./test-config.json');`);
    console.log(`   const token = await getTestUserToken(config.testUserEmail, config.testUserPassword);`);

    return testConfig;

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

// Fonction utilitaire pour obtenir un token utilisateur de test
async function getTestUserToken(email, password) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Erreur authentification: ${error.message}`);
  }

  return data.session.access_token;
}

// Exécuter si appelé directement
if (require.main === module) {
  setupTestAuth();
}

module.exports = { setupTestAuth, getTestUserToken }; 