#!/usr/bin/env node

// Script simple pour ajouter l'ancienne action ID
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addOldActionId() {
  console.log('🔄 Ajout de l\'ancienne action ID...');
  
  try {
    // Récupérer le client actuel
    const { data: client, error } = await supabase
      .from('oauth_clients')
      .select('redirect_uris')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();

    if (error || !client) {
      console.error('❌ Client non trouvé:', error?.message);
      return;
    }

    console.log('✅ Client trouvé, URLs actuelles:', client.redirect_uris);

    // Ajouter l'ancienne action ID si elle n'existe pas
    const oldActionUri = 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback';
    
    if (!client.redirect_uris.includes(oldActionUri)) {
      const updatedUris = [...client.redirect_uris, oldActionUri];
      
      const { error: updateError } = await supabase
        .from('oauth_clients')
        .update({ redirect_uris: updatedUris })
        .eq('client_id', 'scrivia-custom-gpt');

      if (updateError) {
        console.error('❌ Erreur mise à jour:', updateError.message);
        return;
      }

      console.log('✅ Ancienne action ID ajoutée !');
      console.log('   URLs finales:', updatedUris);
    } else {
      console.log('✅ Ancienne action ID déjà présente');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

addOldActionId();
