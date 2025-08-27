#!/usr/bin/env node

/**
 * Script de test pour vérifier l'existence des tables OAuth
 * et la connectivité de la base de données
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

async function testOAuthTables() {
  console.log('🔍 TEST DES TABLES OAUTH');
  console.log('========================\n');

  try {
    // 1. Test de connexion générale
    console.log('1️⃣ Test de connexion à la base...');
    const { data: testData, error: testError } = await supabase
      .from('oauth_clients')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur de connexion:', testError.message);
      
      // Essayer de lister toutes les tables pour voir ce qui existe
      console.log('\n🔍 Tentative de lister les tables existantes...');
      const { data: tables, error: tablesError } = await supabase
        .rpc('list_tables');
      
      if (tablesError) {
        console.log('❌ Impossible de lister les tables:', tablesError.message);
      } else {
        console.log('✅ Tables trouvées:', tables);
      }
      
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

    // 3. Test des données OAuth
    console.log('\n3️⃣ Test des données OAuth...');
    
    const { data: clients, error: clientsError } = await supabase
      .from('oauth_clients')
      .select('*');
    
    if (clientsError) {
      console.log('❌ Erreur lecture clients:', clientsError.message);
    } else {
      console.log(`✅ ${clients?.length || 0} client(s) OAuth trouvé(s)`);
      
      if (clients && clients.length > 0) {
        clients.forEach(client => {
          console.log(`   - ${client.client_id}: ${client.name} (${client.is_active ? 'Actif' : 'Inactif'})`);
          console.log(`     Scopes: ${client.scopes?.join(', ') || 'Aucun'}`);
        });
      }
    }

    // 4. Test de création d'un code d'autorisation
    console.log('\n4️⃣ Test de création d\'un code d\'autorisation...');
    
    try {
      const { data: codeData, error: codeError } = await supabase
        .from('oauth_authorization_codes')
        .insert({
          code: 'test-code-' + Date.now(),
          client_id: 'scrivia-custom-gpt',
          user_id: '00000000-0000-0000-0000-000000000001', // UUID de test
          redirect_uri: 'https://test.com/callback',
          scopes: ['notes:read'],
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })
        .select()
        .single();
      
      if (codeError) {
        console.log('❌ Erreur création code:', codeError.message);
      } else {
        console.log('✅ Code d\'autorisation créé avec succès');
        
        // Nettoyer le code de test
        await supabase
          .from('oauth_authorization_codes')
          .delete()
          .eq('id', codeData.id);
        console.log('🧹 Code de test supprimé');
      }
    } catch (err) {
      console.log('❌ Erreur test création code:', err.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le test
testOAuthTables().then(() => {
  console.log('\n🎯 Résumé du test:');
  console.log('- Si toutes les tables existent, le problème est ailleurs');
  console.log('- Si des tables manquent, il faut les créer manuellement');
  console.log('- Si la connexion échoue, vérifier les variables d\'environnement');
});
