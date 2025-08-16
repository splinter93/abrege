#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Test de connexion à la base de données...');
console.log('📡 Supabase URL:', supabaseUrl ? '✅ Définie' : '❌ Manquante');
console.log('🔑 Supabase Key:', supabaseAnonKey ? '✅ Définie' : '❌ Manquante');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n🔍 Test de lecture d\'une note...');
    
    const { data, error } = await supabase
      .from('articles')
      .select('id, public_url, slug')
      .eq('id', 'fc189652-e1b3-4c2a-982d-5649e0d7ecc5')
      .single();

    if (error) {
      console.error('❌ Erreur de lecture:', error);
      return;
    }

    console.log('✅ Note trouvée:');
    console.log('   ID:', data.id);
    console.log('   Slug:', data.slug);
    console.log('   Public URL:', data.public_url);

    // Test de mise à jour
    console.log('\n🔧 Test de mise à jour...');
    const newUrl = `https://scrivia.app/@Splinter/${data.slug}`;
    
    const { error: updateError } = await supabase
      .from('articles')
      .update({ public_url: newUrl })
      .eq('id', data.id);

    if (updateError) {
      console.error('❌ Erreur de mise à jour:', updateError);
    } else {
      console.log('✅ Mise à jour réussie');
      console.log('   Nouvelle URL:', newUrl);
    }

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

testConnection()
  .then(() => {
    console.log('\n🎉 Test terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 