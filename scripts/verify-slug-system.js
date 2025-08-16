import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySlugSystem() {
  console.log('🔍 Vérification complète du système de slugs...\n');
  
  try {
    // 1. Vérifier qu'il n'y a pas de notes sans slug
    console.log('1️⃣ Vérification des notes sans slug...');
    const { data: notesWithoutSlug, error: slugError } = await supabase
      .from('articles')
      .select('id, source_title, created_at')
      .is('slug', null);
    
    if (slugError) {
      console.error('❌ Erreur lors de la vérification:', slugError);
      return;
    }
    
    if (notesWithoutSlug && notesWithoutSlug.length > 0) {
      console.error(`❌ PROBLÈME: ${notesWithoutSlug.length} notes sans slug trouvées!`);
      notesWithoutSlug.forEach(note => {
        console.error(`   - ${note.source_title} (${note.id}) - ${new Date(note.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('✅ Aucune note sans slug trouvée');
    }
    
    // 2. Vérifier qu'il n'y a pas de notes sans URL publique
    console.log('\n2️⃣ Vérification des notes sans URL publique...');
    const { data: notesWithoutUrl, error: urlError } = await supabase
      .from('articles')
      .select('id, source_title, slug, created_at')
      .is('public_url', null);
    
    if (urlError) {
      console.error('❌ Erreur lors de la vérification:', urlError);
      return;
    }
    
    if (notesWithoutUrl && notesWithoutUrl.length > 0) {
      console.warn(`⚠️ ${notesWithoutUrl.length} notes sans URL publique trouvées:`);
      notesWithoutUrl.forEach(note => {
        console.warn(`   - ${note.source_title} (${note.slug || 'PAS DE SLUG!'}) - ${new Date(note.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('✅ Toutes les notes ont une URL publique');
    }
    
    // 3. Statistiques générales
    console.log('\n3️⃣ Statistiques générales...');
    const { data: allNotes, error: statsError } = await supabase
      .from('articles')
      .select('id, slug, public_url, created_at');
    
    if (statsError) {
      console.error('❌ Erreur lors de la récupération des statistiques:', statsError);
      return;
    }
    
    const totalNotes = allNotes?.length || 0;
    const notesWithSlug = allNotes?.filter(note => note.slug).length || 0;
    const notesWithUrl = allNotes?.filter(note => note.public_url).length || 0;
    
    console.log(`📊 Total des notes: ${totalNotes}`);
    console.log(`✅ Notes avec slug: ${notesWithSlug}/${totalNotes} (${Math.round(notesWithSlug/totalNotes*100)}%)`);
    console.log(`✅ Notes avec URL publique: ${notesWithUrl}/${totalNotes} (${Math.round(notesWithUrl/totalNotes*100)}%)`);
    
    // 4. Vérifier la qualité des slugs
    console.log('\n4️⃣ Vérification de la qualité des slugs...');
    const { data: sampleNotes, error: sampleError } = await supabase
      .from('articles')
      .select('source_title, slug, public_url')
      .not('slug', 'is', null)
      .limit(10);
    
    if (sampleError) {
      console.error('❌ Erreur lors de la récupération des exemples:', sampleError);
      return;
    }
    
    console.log('📋 Exemples de slugs générés:');
    sampleNotes?.forEach((note, index) => {
      const slugQuality = note.slug && note.slug.length > 0 && !note.slug.includes(' ') ? '✅' : '❌';
      const urlQuality = note.public_url && note.public_url.includes('@') ? '✅' : '❌';
      
      console.log(`${index + 1}. "${note.source_title}"`);
      console.log(`   - Slug: ${slugQuality} ${note.slug}`);
      console.log(`   - URL: ${urlQuality} ${note.public_url}`);
      console.log('');
    });
    
    // 5. Résumé final
    console.log('\n5️⃣ Résumé final...');
    if (notesWithoutSlug && notesWithoutSlug.length > 0) {
      console.error('❌ SYSTÈME NON CONFORME: Il y a des notes sans slug');
      console.error('   Cela peut causer l\'erreur "Cette note n\'a pas de slug"');
    } else if (notesWithoutUrl && notesWithoutUrl.length > 0) {
      console.warn('⚠️ SYSTÈME PARTIELLEMENT CONFORME: Toutes les notes ont un slug mais certaines n\'ont pas d\'URL publique');
    } else {
      console.log('🎉 SYSTÈME PARFAITEMENT CONFORME: Toutes les notes ont un slug et une URL publique');
      console.log('   L\'erreur "Cette note n\'a pas de slug" ne devrait plus apparaître');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale lors de la vérification:', error);
  }
}

// Exécuter la vérification
verifySlugSystem().catch(console.error); 