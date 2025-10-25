#!/usr/bin/env ts-node

/**
 * Script de Migration : Correction des Slugs Obsolètes
 * 
 * Ce script identifie et corrige tous les slugs qui ne correspondent plus
 * aux noms actuels des ressources (notes, classeurs, dossiers).
 * 
 * Utilisation :
 *   npm run fix-slugs
 *   npm run fix-slugs -- --dry-run    # Mode simulation
 *   npm run fix-slugs -- --user-id=xxx # Corriger pour un utilisateur spécifique
 */

import { createClient } from '@supabase/supabase-js';
import { SlugGenerator } from '../src/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationStats {
  notes: { checked: number; updated: number; errors: number };
  classeurs: { checked: number; updated: number; errors: number };
  folders: { checked: number; updated: number; errors: number };
  agents: { checked: number; updated: number; errors: number };
}

const stats: MigrationStats = {
  notes: { checked: 0, updated: 0, errors: 0 },
  classeurs: { checked: 0, updated: 0, errors: 0 },
  folders: { checked: 0, updated: 0, errors: 0 },
  agents: { checked: 0, updated: 0, errors: 0 }
};

/**
 * Normalise un slug pour comparaison
 */
function normalizeSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return 'untitled';
  }
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

/**
 * Vérifie si un slug correspond au nom actuel de la ressource
 */
function slugMatchesName(currentSlug: string, name: string): boolean {
  // Si le slug actuel commence par la version normalisée du nom, on le considère comme valide
  // (car il peut avoir un suffixe numérique pour l'unicité)
  const normalizedName = normalizeSlug(name);
  return currentSlug === normalizedName || currentSlug.startsWith(`${normalizedName}-`);
}

/**
 * Corrige les slugs des notes
 */
async function fixNotesSlugs(dryRun: boolean, userId?: string): Promise<void> {
  console.log('\n🔍 Vérification des notes...');
  
  let query = supabase
    .from('articles')
    .select('id, source_title, slug, user_id')
    .not('slug', 'is', null)
    .is('trashed_at', null);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: notes, error } = await query;
  
  if (error) {
    console.error('❌ Erreur récupération notes:', error);
    return;
  }
  
  console.log(`📝 ${notes.length} notes à vérifier`);
  
  for (const note of notes) {
    stats.notes.checked++;
    
    if (!slugMatchesName(note.slug, note.source_title)) {
      console.log(`\n🔧 Note obsolète détectée:`);
      console.log(`   ID: ${note.id}`);
      console.log(`   Titre: "${note.source_title}"`);
      console.log(`   Slug actuel: "${note.slug}"`);
      
      try {
        const newSlug = await SlugGenerator.generateSlug(
          note.source_title,
          'note',
          note.user_id,
          note.id,
          supabase
        );
        
        console.log(`   Nouveau slug: "${newSlug}"`);
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ 
              slug: newSlug,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);
          
          if (updateError) {
            console.error(`   ❌ Erreur mise à jour: ${updateError.message}`);
            stats.notes.errors++;
          } else {
            console.log(`   ✅ Mis à jour`);
            stats.notes.updated++;
          }
        } else {
          console.log(`   🔍 [DRY RUN] Serait mis à jour`);
          stats.notes.updated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur génération slug: ${error}`);
        stats.notes.errors++;
      }
    }
  }
}

/**
 * Corrige les slugs des classeurs
 */
async function fixClasseursSlugs(dryRun: boolean, userId?: string): Promise<void> {
  console.log('\n🔍 Vérification des classeurs...');
  
  let query = supabase
    .from('classeurs')
    .select('id, name, slug, user_id')
    .not('slug', 'is', null);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: classeurs, error } = await query;
  
  if (error) {
    console.error('❌ Erreur récupération classeurs:', error);
    return;
  }
  
  console.log(`📚 ${classeurs.length} classeurs à vérifier`);
  
  for (const classeur of classeurs) {
    stats.classeurs.checked++;
    
    if (!slugMatchesName(classeur.slug, classeur.name)) {
      console.log(`\n🔧 Classeur obsolète détecté:`);
      console.log(`   ID: ${classeur.id}`);
      console.log(`   Nom: "${classeur.name}"`);
      console.log(`   Slug actuel: "${classeur.slug}"`);
      
      try {
        const newSlug = await SlugGenerator.generateSlug(
          classeur.name,
          'classeur',
          classeur.user_id,
          classeur.id,
          supabase
        );
        
        console.log(`   Nouveau slug: "${newSlug}"`);
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('classeurs')
            .update({ 
              slug: newSlug,
              updated_at: new Date().toISOString()
            })
            .eq('id', classeur.id);
          
          if (updateError) {
            console.error(`   ❌ Erreur mise à jour: ${updateError.message}`);
            stats.classeurs.errors++;
          } else {
            console.log(`   ✅ Mis à jour`);
            stats.classeurs.updated++;
          }
        } else {
          console.log(`   🔍 [DRY RUN] Serait mis à jour`);
          stats.classeurs.updated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur génération slug: ${error}`);
        stats.classeurs.errors++;
      }
    }
  }
}

/**
 * Corrige les slugs des dossiers
 */
async function fixFoldersSlugs(dryRun: boolean, userId?: string): Promise<void> {
  console.log('\n🔍 Vérification des dossiers...');
  
  let query = supabase
    .from('folders')
    .select('id, name, slug, user_id')
    .not('slug', 'is', null);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: folders, error } = await query;
  
  if (error) {
    console.error('❌ Erreur récupération dossiers:', error);
    return;
  }
  
  console.log(`📁 ${folders.length} dossiers à vérifier`);
  
  for (const folder of folders) {
    stats.folders.checked++;
    
    if (!slugMatchesName(folder.slug, folder.name)) {
      console.log(`\n🔧 Dossier obsolète détecté:`);
      console.log(`   ID: ${folder.id}`);
      console.log(`   Nom: "${folder.name}"`);
      console.log(`   Slug actuel: "${folder.slug}"`);
      
      try {
        const newSlug = await SlugGenerator.generateSlug(
          folder.name,
          'folder',
          folder.user_id,
          folder.id,
          supabase
        );
        
        console.log(`   Nouveau slug: "${newSlug}"`);
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('folders')
            .update({ 
              slug: newSlug,
              updated_at: new Date().toISOString()
            })
            .eq('id', folder.id);
          
          if (updateError) {
            console.error(`   ❌ Erreur mise à jour: ${updateError.message}`);
            stats.folders.errors++;
          } else {
            console.log(`   ✅ Mis à jour`);
            stats.folders.updated++;
          }
        } else {
          console.log(`   🔍 [DRY RUN] Serait mis à jour`);
          stats.folders.updated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur génération slug: ${error}`);
        stats.folders.errors++;
      }
    }
  }
}

/**
 * Corrige les slugs des agents
 */
async function fixAgentsSlugs(dryRun: boolean): Promise<void> {
  console.log('\n🔍 Vérification des agents...');
  
  let query = supabase
    .from('agents')
    .select('id, name, display_name, slug')
    .not('slug', 'is', null)
    .eq('is_endpoint_agent', true);
  
  const { data: agents, error } = await query;
  
  if (error) {
    console.error('❌ Erreur récupération agents:', error);
    return;
  }
  
  console.log(`🤖 ${agents.length} agents à vérifier`);
  
  for (const agent of agents) {
    stats.agents.checked++;
    
    // Pour les agents, on vérifie si le slug correspond au display_name ou name
    const nameToCheck = agent.display_name || agent.name;
    
    if (!slugMatchesName(agent.slug, nameToCheck)) {
      console.log(`\n🔧 Agent obsolète détecté:`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Nom: "${nameToCheck}"`);
      console.log(`   Slug actuel: "${agent.slug}"`);
      
      try {
        // Pour les agents, on génère le slug manuellement (unicité globale, pas par utilisateur)
        const baseSlug = normalizeSlug(nameToCheck);
        let newSlug = baseSlug;
        let counter = 1;
        
        // Vérifier l'unicité (exclure l'ID actuel)
        while (true) {
          const { data: existingAgent, error: checkError } = await supabase
            .from('agents')
            .select('id')
            .eq('slug', newSlug)
            .not('id', 'eq', agent.id)
            .maybeSingle();
          
          if (checkError || !existingAgent) break;
          
          counter++;
          newSlug = `${baseSlug}-${counter}`;
        }
        
        console.log(`   Nouveau slug: "${newSlug}"`);
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('agents')
            .update({ 
              slug: newSlug,
              updated_at: new Date().toISOString()
            })
            .eq('id', agent.id);
          
          if (updateError) {
            console.error(`   ❌ Erreur mise à jour: ${updateError.message}`);
            stats.agents.errors++;
          } else {
            console.log(`   ✅ Mis à jour`);
            stats.agents.updated++;
          }
        } else {
          console.log(`   🔍 [DRY RUN] Serait mis à jour`);
          stats.agents.updated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur génération slug: ${error}`);
        stats.agents.errors++;
      }
    }
  }
}

/**
 * Affiche les statistiques finales
 */
function displayStats(dryRun: boolean): void {
  console.log('\n' + '='.repeat(60));
  console.log(dryRun ? '📊 STATISTIQUES (DRY RUN)' : '📊 STATISTIQUES');
  console.log('='.repeat(60));
  
  console.log('\n📝 Notes:');
  console.log(`   Vérifiées: ${stats.notes.checked}`);
  console.log(`   ${dryRun ? 'À mettre à jour' : 'Mises à jour'}: ${stats.notes.updated}`);
  if (stats.notes.errors > 0) {
    console.log(`   ❌ Erreurs: ${stats.notes.errors}`);
  }
  
  console.log('\n📚 Classeurs:');
  console.log(`   Vérifiés: ${stats.classeurs.checked}`);
  console.log(`   ${dryRun ? 'À mettre à jour' : 'Mis à jour'}: ${stats.classeurs.updated}`);
  if (stats.classeurs.errors > 0) {
    console.log(`   ❌ Erreurs: ${stats.classeurs.errors}`);
  }
  
  console.log('\n📁 Dossiers:');
  console.log(`   Vérifiés: ${stats.folders.checked}`);
  console.log(`   ${dryRun ? 'À mettre à jour' : 'Mis à jour'}: ${stats.folders.updated}`);
  if (stats.folders.errors > 0) {
    console.log(`   ❌ Erreurs: ${stats.folders.errors}`);
  }
  
  console.log('\n🤖 Agents:');
  console.log(`   Vérifiés: ${stats.agents.checked}`);
  console.log(`   ${dryRun ? 'À mettre à jour' : 'Mis à jour'}: ${stats.agents.updated}`);
  if (stats.agents.errors > 0) {
    console.log(`   ❌ Erreurs: ${stats.agents.errors}`);
  }
  
  const totalChecked = stats.notes.checked + stats.classeurs.checked + stats.folders.checked + stats.agents.checked;
  const totalUpdated = stats.notes.updated + stats.classeurs.updated + stats.folders.updated + stats.agents.updated;
  const totalErrors = stats.notes.errors + stats.classeurs.errors + stats.folders.errors + stats.agents.errors;
  
  console.log('\n' + '-'.repeat(60));
  console.log(`📊 TOTAL:`);
  console.log(`   Ressources vérifiées: ${totalChecked}`);
  console.log(`   ${dryRun ? 'À mettre à jour' : 'Mises à jour'}: ${totalUpdated}`);
  if (totalErrors > 0) {
    console.log(`   ❌ Erreurs totales: ${totalErrors}`);
  }
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n💡 Exécutez sans --dry-run pour appliquer les changements');
  }
}

/**
 * Point d'entrée principal
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const userIdArg = args.find(arg => arg.startsWith('--user-id='));
  const userId = userIdArg ? userIdArg.split('=')[1] : undefined;
  
  console.log('🚀 Script de correction des slugs obsolètes');
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('⚠️  MODE SIMULATION - Aucune modification ne sera apportée');
  } else {
    console.log('⚠️  MODE PRODUCTION - Les slugs seront modifiés');
  }
  
  if (userId) {
    console.log(`🎯 Utilisateur ciblé: ${userId}`);
  } else {
    console.log('🌍 Tous les utilisateurs');
  }
  
  console.log('='.repeat(60));
  
  try {
    await fixNotesSlugs(dryRun, userId);
    await fixClasseursSlugs(dryRun, userId);
    await fixFoldersSlugs(dryRun, userId);
    await fixAgentsSlugs(dryRun); // Agents n'ont pas de user_id
    
    displayStats(dryRun);
    
    console.log('\n✅ Migration terminée avec succès\n');
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();

