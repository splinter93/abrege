#!/usr/bin/env tsx

/**
 * Script de mise à jour des quotas de stockage
 * ============================================
 * 
 * Ce script permet de modifier facilement les quotas de stockage
 * pour tous les utilisateurs ou pour des utilisateurs spécifiques.
 * 
 * Usage:
 * npm run update-quotas -- --quota=5GB --user=user_id
 * npm run update-quotas -- --quota=10GB --all
 */

import { createClient } from '@supabase/supabase-js';
import { STORAGE_CONFIG } from '../src/config/storage';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ==========================================================================
// FONCTIONS UTILITAIRES
// ==========================================================================

/**
 * Convertit une taille lisible en octets
 */
function parseSize(sizeStr: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
  if (!match) {
    throw new Error(`Format de taille invalide: ${sizeStr}. Utilisez: 1GB, 500MB, etc.`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return Math.floor(value * units[unit]);
}

/**
 * Met à jour le quota d'un utilisateur spécifique
 */
async function updateUserQuota(userId: string, quotaBytes: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('storage_usage')
      .upsert({
        user_id: userId,
        quota_bytes: quotaBytes,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Quota mis à jour pour l'utilisateur ${userId}: ${formatBytes(quotaBytes)}`);
  } catch (error) {
    console.error(`❌ Erreur mise à jour quota utilisateur ${userId}:`, error);
    throw error;
  }
}

/**
 * Met à jour le quota pour tous les utilisateurs
 */
async function updateAllUsersQuota(quotaBytes: number): Promise<void> {
  try {
    // Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      throw usersError;
    }

    console.log(`📊 Mise à jour du quota pour ${users.users.length} utilisateurs...`);

    // Mettre à jour chaque utilisateur
    for (const user of users.users) {
      await updateUserQuota(user.id, quotaBytes);
    }

    console.log(`✅ Quota mis à jour pour tous les utilisateurs: ${formatBytes(quotaBytes)}`);
  } catch (error) {
    console.error('❌ Erreur mise à jour quota global:', error);
    throw error;
  }
}

/**
 * Affiche les quotas actuels
 */
async function showCurrentQuotas(): Promise<void> {
  try {
    const { data: quotas, error } = await supabase
      .from('storage_usage')
      .select('user_id, used_bytes, quota_bytes, updated_at')
      .order('quota_bytes', { ascending: false });

    if (error) {
      throw error;
    }

    console.log('\n📊 QUOTAS ACTUELS:');
    console.log('='.repeat(80));
    console.log('USER ID'.padEnd(36) + 'UTILISÉ'.padEnd(15) + 'QUOTA'.padEnd(15) + 'DERNIÈRE MAJ');
    console.log('='.repeat(80));

    for (const quota of quotas || []) {
      const used = formatBytes(quota.used_bytes);
      const total = formatBytes(quota.quota_bytes);
      const percentage = Math.round((quota.used_bytes / quota.quota_bytes) * 100);
      const date = new Date(quota.updated_at).toLocaleDateString('fr-FR');
      
      console.log(
        quota.user_id.padEnd(36) + 
        `${used} (${percentage}%)`.padEnd(15) + 
        total.padEnd(15) + 
        date
      );
    }
  } catch (error) {
    console.error('❌ Erreur affichage quotas:', error);
  }
}

/**
 * Formate les octets en taille lisible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==========================================================================
// POINT D'ENTRÉE PRINCIPAL
// ==========================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Afficher l'aide
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📁 SCRIPT DE MISE À JOUR DES QUOTAS DE STOCKAGE

Usage:
  npm run update-quotas -- --quota=5GB --user=user_id
  npm run update-quotas -- --quota=10GB --all
  npm run update-quotas -- --show

Options:
  --quota=SIZE     Nouveau quota (ex: 1GB, 500MB, 2TB)
  --user=ID        ID de l'utilisateur spécifique
  --all            Appliquer à tous les utilisateurs
  --show           Afficher les quotas actuels
  --help, -h       Afficher cette aide

Exemples:
  npm run update-quotas -- --quota=5GB --user=123e4567-e89b-12d3-a456-426614174000
  npm run update-quotas -- --quota=10GB --all
  npm run update-quotas -- --show
    `);
    return;
  }

  // Afficher les quotas actuels
  if (args.includes('--show')) {
    await showCurrentQuotas();
    return;
  }

  // Vérifier les arguments
  const quotaArg = args.find(arg => arg.startsWith('--quota='));
  const userArg = args.find(arg => arg.startsWith('--user='));
  const allUsers = args.includes('--all');

  if (!quotaArg) {
    console.error('❌ Argument --quota requis');
    process.exit(1);
  }

  if (!userArg && !allUsers) {
    console.error('❌ Spécifiez --user=ID ou --all');
    process.exit(1);
  }

  // Parser le quota
  const quotaSize = quotaArg.replace('--quota=', '');
  let quotaBytes: number;
  
  try {
    quotaBytes = parseSize(quotaSize);
  } catch (error) {
    console.error('❌ Taille invalide:', error.message);
    process.exit(1);
  }

  console.log(`🚀 Mise à jour des quotas vers: ${formatBytes(quotaBytes)}`);

  try {
    if (allUsers) {
      // Mettre à jour tous les utilisateurs
      await updateAllUsersQuota(quotaBytes);
    } else {
      // Mettre à jour un utilisateur spécifique
      const userId = userArg!.replace('--user=', '');
      await updateUserQuota(userId, quotaBytes);
    }

    console.log('\n✅ Mise à jour terminée avec succès !');
    
    // Afficher les nouveaux quotas
    await showCurrentQuotas();
    
  } catch (error) {
    console.error('\n❌ Échec de la mise à jour:', error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
} 