#!/usr/bin/env node

/**
 * Test de l'API V2 avec authentification OAuth
 * Vérifie que l'API V2 accepte maintenant les tokens OAuth
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testOAuthV2() {
  console.log('🧪 Test de l\'API V2 avec authentification OAuth');
  
  try {
    // 1. Créer un client Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 2. Récupérer un token OAuth existant
    console.log('🔍 Récupération d\'un token OAuth existant...');
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_access_tokens')
      .select('id, token_hash, client_id, user_id, scopes, expires_at')
      .eq('client_id', 'scrivia-custom-gpt')
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);
    
    if (tokenError || !tokens || tokens.length === 0) {
      console.log('❌ Aucun token OAuth valide trouvé');
      return;
    }
    
    const token = tokens[0];
    console.log('✅ Token OAuth trouvé:', {
      id: token.id,
      userId: token.user_id,
      scopes: token.scopes,
      expiresAt: token.expires_at
    });
    
    // 3. Tester l'API V2 avec le token OAuth
    console.log('🧪 Test de l\'API V2 avec le token OAuth...');
    
    // Test de l'endpoint /api/v2/note/create
    const testResponse = await fetch('https://www.scrivia.app/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token_hash}`,
        'X-Client-Type': 'test-oauth-v2'
      },
      body: JSON.stringify({
        source_title: 'Test OAuth V2',
        markdown_content: 'Test de l\'API V2 avec authentification OAuth',
        notebook_id: 'test-notebook'
      })
    });
    
    console.log('📊 Status de l\'API V2:', testResponse.status);
    console.log('📊 Headers:', Object.fromEntries(testResponse.headers.entries()));
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ API V2 fonctionne avec OAuth !');
      console.log('📊 Réponse:', result);
    } else {
      const errorText = await testResponse.text();
      console.log('❌ API V2 retourne une erreur:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Lancer le test
testOAuthV2();
