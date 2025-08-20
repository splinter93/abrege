#!/usr/bin/env tsx

/**
 * Script de test du système d'abonnements
 * =======================================
 * 
 * Ce script teste toutes les fonctionnalités du système
 * de quotas dynamiques basé sur les abonnements.
 */

import { createClient } from '@supabase/supabase-js';
import SubscriptionService from '../src/services/subscriptionService';
import { formatBytes } from '../src/config/storage';

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
// FONCTIONS DE TEST
// ==========================================================================

/**
 * Test 1: Récupération des plans disponibles
 */
async function testAvailablePlans(): Promise<void> {
  console.log('\n🧪 TEST 1: Plans d\'abonnement disponibles');
  console.log('='.repeat(50));
  
  try {
    const plans = await SubscriptionService.getAvailablePlans();
    
    if (plans.length === 0) {
      console.log('❌ Aucun plan trouvé');
      return;
    }
    
    console.log(`✅ ${plans.length} plans trouvés:`);
    
    for (const plan of plans) {
      console.log(`\n📋 ${plan.displayName} (${plan.type})`);
      console.log(`   Description: ${plan.description || 'Aucune'}`);
      console.log(`   Quota: ${formatBytes(plan.storageQuotaBytes)}`);
      console.log(`   Taille max fichier: ${formatBytes(plan.maxFileSizeBytes)}`);
      console.log(`   Fichiers max/upload: ${plan.maxFilesPerUpload}`);
      console.log(`   Prix mensuel: ${plan.priceMonthly ? `${plan.priceMonthly} ${plan.currency}` : 'Gratuit'}`);
      console.log(`   Fonctionnalités: ${Object.keys(plan.features).join(', ') || 'Aucune'}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur test plans:', error);
  }
}

/**
 * Test 2: Création d'un utilisateur de test
 */
async function testUserCreation(): Promise<string | null> {
  console.log('\n🧪 TEST 2: Création utilisateur de test');
  console.log('='.repeat(50));
  
  try {
    const testEmail = `test-subscription-${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (error || !user) {
      console.error('❌ Erreur création utilisateur:', error);
      return null;
    }
    
    console.log(`✅ Utilisateur créé: ${user.email} (ID: ${user.id})`);
    return user.id;
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    return null;
  }
}

/**
 * Test 3: Vérification du plan par défaut
 */
async function testDefaultPlan(userId: string): Promise<void> {
  console.log('\n🧪 TEST 3: Plan par défaut de l\'utilisateur');
  console.log('='.repeat(50));
  
  try {
    const plan = await SubscriptionService.getUserActivePlan(userId);
    
    if (!plan) {
      console.log('❌ Aucun plan trouvé');
      return;
    }
    
    console.log(`✅ Plan actif: ${plan.displayName} (${plan.type})`);
    console.log(`   Quota: ${formatBytes(plan.storageQuotaBytes)}`);
    console.log(`   Taille max fichier: ${formatBytes(plan.maxFileSizeBytes)}`);
    console.log(`   Fichiers max/upload: ${plan.maxFilesPerUpload}`);
    console.log(`   Par défaut: ${plan.isDefault ? 'Oui' : 'Non'}`);
    
  } catch (error) {
    console.error('❌ Erreur test plan par défaut:', error);
  }
}

/**
 * Test 4: Vérification du quota de stockage
 */
async function testStorageQuota(userId: string): Promise<void> {
  console.log('\n🧪 TEST 4: Quota de stockage de l\'utilisateur');
  console.log('='.repeat(50));
  
  try {
    const quota = await SubscriptionService.getUserStorageQuota(userId);
    
    if (!quota) {
      console.log('❌ Aucun quota trouvé');
      return;
    }
    
    console.log(`✅ Quota récupéré:`);
    console.log(`   Utilisé: ${formatBytes(quota.usedBytes)}`);
    console.log(`   Total: ${formatBytes(quota.quotaBytes)}`);
    console.log(`   Restant: ${formatBytes(quota.remainingBytes)}`);
    console.log(`   Pourcentage: ${quota.usagePercentage}%`);
    console.log(`   Niveau d'alerte: ${quota.alertLevel}`);
    
    if (quota.currentPlan) {
      console.log(`   Plan actuel: ${quota.currentPlan.displayName}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur test quota:', error);
  }
}

/**
 * Test 5: Changement de plan
 */
async function testPlanChange(userId: string): Promise<void> {
  console.log('\n🧪 TEST 5: Changement de plan d\'abonnement');
  console.log('='.repeat(50));
  
  try {
    // Récupérer le plan premium
    const plans = await SubscriptionService.getAvailablePlans();
    const premiumPlan = plans.find(p => p.type === 'premium');
    
    if (!premiumPlan) {
      console.log('❌ Plan premium non trouvé');
      return;
    }
    
    console.log(`🔄 Changement vers le plan: ${premiumPlan.displayName}`);
    
    const result = await SubscriptionService.changeUserPlan(
      userId, 
      premiumPlan.id,
      'test',
      'test-subscription-123'
    );
    
    if (result.success) {
      console.log(`✅ Plan changé avec succès:`);
      console.log(`   Ancien plan: ${result.oldPlan?.displayName || 'Aucun'}`);
      console.log(`   Nouveau plan: ${result.newPlan.displayName}`);
      console.log(`   Quota mis à jour: ${result.quotaUpdated ? 'Oui' : 'Non'}`);
      
      if (result.error) {
        console.log(`   ⚠️ Avertissement: ${result.error.message}`);
      }
    } else {
      console.log(`❌ Échec du changement de plan: ${result.error?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur test changement de plan:', error);
  }
}

/**
 * Test 6: Vérification des permissions d'upload
 */
async function testUploadPermissions(userId: string): Promise<void> {
  console.log('\n🧪 TEST 6: Permissions d\'upload selon le plan');
  console.log('='.repeat(50));
  
  try {
    const testCases = [
      { fileSize: 50 * 1024 * 1024, fileCount: 1, description: 'Fichier 50MB, 1 fichier' },
      { fileSize: 200 * 1024 * 1024, fileCount: 1, description: 'Fichier 200MB, 1 fichier' },
      { fileSize: 50 * 1024 * 1024, fileCount: 25, description: 'Fichier 50MB, 25 fichiers' },
      { fileSize: 50 * 1024 * 1024, fileCount: 1, description: 'Fichier 50MB, 1 fichier (après changement)' }
    ];
    
    for (const testCase of testCases) {
      const result = await SubscriptionService.canUserUploadFile(
        userId, 
        testCase.fileSize, 
        testCase.fileCount
      );
      
      console.log(`\n📁 ${testCase.description}:`);
      console.log(`   Peut uploader: ${result.canUpload ? '✅ Oui' : '❌ Non'}`);
      
      if (!result.canUpload && result.reason) {
        console.log(`   Raison: ${result.reason}`);
      }
      
      if (result.plan) {
        console.log(`   Plan actuel: ${result.plan.displayName}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur test permissions upload:', error);
  }
}

/**
 * Test 7: Historique des abonnements
 */
async function testSubscriptionHistory(userId: string): Promise<void> {
  console.log('\n🧪 TEST 7: Historique des abonnements');
  console.log('='.repeat(50));
  
  try {
    const history = await SubscriptionService.getUserSubscriptionHistory(userId);
    
    if (history.length === 0) {
      console.log('❌ Aucun historique trouvé');
      return;
    }
    
    console.log(`✅ ${history.length} abonnements dans l'historique:`);
    
    for (const sub of history) {
      console.log(`\n📅 Abonnement ${sub.id}:`);
      console.log(`   Statut: ${sub.status}`);
      console.log(`   Début: ${new Date(sub.startedAt).toLocaleDateString('fr-FR')}`);
      
      if (sub.expiresAt) {
        console.log(`   Expire: ${new Date(sub.expiresAt).toLocaleDateString('fr-FR')}`);
      }
      
      if (sub.canceledAt) {
        console.log(`   Annulé: ${new Date(sub.canceledAt).toLocaleDateString('fr-FR')}`);
      }
      
      if (sub.billingProvider) {
        console.log(`   Fournisseur: ${sub.billingProvider}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur test historique:', error);
  }
}

/**
 * Test 8: Retour au plan gratuit
 */
async function testReturnToFreePlan(userId: string): Promise<void> {
  console.log('\n🧪 TEST 8: Retour au plan gratuit');
  console.log('='.repeat(50));
  
  try {
    console.log('🔄 Annulation de l\'abonnement premium...');
    
    const success = await SubscriptionService.cancelUserSubscription(userId);
    
    if (success) {
      console.log('✅ Abonnement annulé avec succès');
      
      // Vérifier que l'utilisateur est revenu au plan gratuit
      const plan = await SubscriptionService.getUserActivePlan(userId);
      if (plan) {
        console.log(`✅ Plan actuel: ${plan.displayName} (${plan.type})`);
        console.log(`   Quota: ${formatBytes(plan.storageQuotaBytes)}`);
      }
    } else {
      console.log('❌ Échec de l\'annulation');
    }
    
  } catch (error) {
    console.error('❌ Erreur test retour plan gratuit:', error);
  }
}

/**
 * Test 9: Nettoyage
 */
async function testCleanup(userId: string): Promise<void> {
  console.log('\n🧪 TEST 9: Nettoyage');
  console.log('='.repeat(50));
  
  try {
    // Supprimer l'utilisateur de test
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.log(`⚠️ Erreur suppression utilisateur: ${error.message}`);
    } else {
      console.log('✅ Utilisateur de test supprimé');
    }
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

// ==========================================================================
// POINT D'ENTRÉE PRINCIPAL
// ==========================================================================

async function main() {
  console.log('🚀 DÉMARRAGE DES TESTS DU SYSTÈME D\'ABONNEMENTS');
  console.log('='.repeat(60));
  
  let testUserId: string | null = null;
  
  try {
    // Test 1: Plans disponibles
    await testAvailablePlans();
    
    // Test 2: Création utilisateur
    testUserId = await testUserCreation();
    if (!testUserId) {
      console.error('❌ Impossible de continuer sans utilisateur de test');
      return;
    }
    
    // Test 3: Plan par défaut
    await testDefaultPlan(testUserId);
    
    // Test 4: Quota de stockage
    await testStorageQuota(testUserId);
    
    // Test 5: Changement de plan
    await testPlanChange(testUserId);
    
    // Test 6: Permissions d'upload
    await testUploadPermissions(testUserId);
    
    // Test 7: Historique des abonnements
    await testSubscriptionHistory(testUserId);
    
    // Test 8: Retour au plan gratuit
    await testReturnToFreePlan(testUserId);
    
    // Test 9: Nettoyage
    await testCleanup(testUserId);
    
    console.log('\n🎉 TOUS LES TESTS TERMINÉS AVEC SUCCÈS !');
    
  } catch (error) {
    console.error('\n💥 ERREUR CRITIQUE DANS LES TESTS:', error);
  } finally {
    // Nettoyage final
    if (testUserId) {
      await testCleanup(testUserId);
    }
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
} 