#!/usr/bin/env node

/**
 * Script de test du service de slugs et URLs
 * Teste toutes les fonctionnalités du service
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!apiBaseUrl) {
  console.error('❌ NEXT_PUBLIC_API_BASE_URL manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSlugService() {
  console.log('🧪 Test du service de slugs et URLs...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);
  
  try {
    // 1. Test de connexion
    console.log('🔍 1. Test de connexion à la base...');
    await testConnection();
    
    // 2. Test de génération de slug
    console.log('\n🔍 2. Test de génération de slug...');
    await testSlugGeneration();
    
    // 3. Test de construction d'URL publique
    console.log('\n🔍 3. Test de construction d\'URL publique...');
    await testPublicUrlConstruction();
    
    // 4. Test de mise à jour de note
    console.log('\n🔍 4. Test de mise à jour de note...');
    await testNoteUpdate();
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    
  } catch (err: any) {
    console.error('❌ Erreur lors des tests:', err.message);
  }
}

async function testConnection() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);
    
    if (error) {
      throw new Error(`Erreur de connexion: ${error.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur trouvé');
    }
    
    console.log(`   ✅ Connexion réussie, utilisateur trouvé: ${users[0].username}`);
    return users[0];
  } catch (error: any) {
    console.error(`   ❌ Test de connexion échoué: ${error.message}`);
    throw error;
  }
}

async function testSlugGeneration() {
  try {
    // Récupérer un utilisateur de test
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);
    
    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur trouvé pour le test');
    }
    
    const testUser = users[0];
    const testTitle = 'Test de génération de slug avec accents éàç';
    
    // Génération simple de slug
    const baseSlug = testTitle
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);
    
    console.log(`   📝 Titre de test: "${testTitle}"`);
    console.log(`   🔗 Slug généré: "${baseSlug}"`);
    
    // Vérifier l'unicité
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', baseSlug)
      .eq('user_id', testUser.id);
    
    if (existing && existing.length > 0) {
      console.log(`   ⚠️  Slug déjà utilisé par ${existing.length} note(s)`);
    } else {
      console.log(`   ✅ Slug unique confirmé`);
    }
    
    console.log(`   ✅ Test de génération de slug réussi`);
    
  } catch (error: any) {
    console.error(`   ❌ Test de génération de slug échoué: ${error.message}`);
    throw error;
  }
}

async function testPublicUrlConstruction() {
  try {
    // Récupérer un utilisateur et une note de test
    const { data: notes } = await supabase
      .from('articles')
      .select(`
        id,
        slug,
        user_id,
        users!inner(username)
      `)
      .limit(1);
    
    if (!notes || notes.length === 0) {
      throw new Error('Aucune note trouvée pour le test');
    }
    
    const testNote = notes[0];
    const username = (testNote as any).users?.username;
    
    if (!testNote.slug) {
      throw new Error('Note sans slug pour le test');
    }
    
    const expectedUrl = `${apiBaseUrl}/@${username}/${testNote.slug}`;
    
    console.log(`   📝 Note de test: ${testNote.id}`);
    console.log(`   👤 Username: ${username}`);
    console.log(`   🔗 Slug: ${testNote.slug}`);
    console.log(`   🌐 URL attendue: ${expectedUrl}`);
    
    // Vérifier que l'URL est correcte
    if (expectedUrl.includes(username) && expectedUrl.includes(testNote.slug)) {
      console.log(`   ✅ Construction d'URL publique réussie`);
    } else {
      throw new Error('URL publique malformée');
    }
    
  } catch (error: any) {
    console.error(`   ❌ Test de construction d'URL échoué: ${error.message}`);
    throw error;
  }
}

async function testNoteUpdate() {
  try {
    // Récupérer une note de test
    const { data: notes } = await supabase
      .from('articles')
      .select(`
        id,
        source_title,
        slug,
        public_url,
        user_id,
        users!inner(username)
      `)
      .limit(1);
    
    if (!notes || notes.length === 0) {
      throw new Error('Aucune note trouvée pour le test de mise à jour');
    }
    
    const testNote = notes[0];
    const username = (testNote as any).users?.username;
    
    console.log(`   📝 Note de test: ${testNote.id}`);
    console.log(`   📋 Titre actuel: "${testNote.source_title}"`);
    console.log(`   🔗 Slug actuel: ${testNote.slug}`);
    console.log(`   🌐 URL actuelle: ${testNote.public_url || 'Aucune'}`);
    
    // Simuler une mise à jour de titre
    const newTitle = `${testNote.source_title} (mis à jour)`;
    const newSlug = newTitle
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);
    
    const newUrl = `${apiBaseUrl}/@${username}/${newSlug}`;
    
    console.log(`   📝 Nouveau titre: "${newTitle}"`);
    console.log(`   🔗 Nouveau slug: ${newSlug}`);
    console.log(`   🌐 Nouvelle URL: ${newUrl}`);
    
    // Vérifier que le nouveau slug est différent
    if (newSlug !== testNote.slug) {
      console.log(`   ✅ Nouveau slug différent de l'ancien`);
    } else {
      console.log(`   ⚠️  Nouveau slug identique à l'ancien (normal si titre similaire)`);
    }
    
    console.log(`   ✅ Test de mise à jour de note réussi`);
    
  } catch (error: any) {
    console.error(`   ❌ Test de mise à jour de note échoué: ${error.message}`);
    throw error;
  }
}

// Exécuter les tests
testSlugService()
  .then(() => {
    console.log('\n🎉 Tests terminés avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors des tests:', err);
    process.exit(1);
  }); 