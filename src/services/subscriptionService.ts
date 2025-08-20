/**
 * Service de gestion des abonnements et quotas
 * ============================================
 * 
 * Ce service gère dynamiquement les quotas de stockage
 * basés sur les plans d'abonnement des utilisateurs.
 */

import { supabase } from '@/supabaseClient';
import { 
  SubscriptionPlan, 
  UserSubscription, 
  StorageQuota,
  SubscriptionPlanType,
  formatBytes,
  calculateUsagePercentage,
  getUsageAlertLevel
} from '@/config/storage';
import { simpleLogger as logger } from '@/utils/logger';

// ==========================================================================
// TYPES ET INTERFACES
// ==========================================================================

export interface SubscriptionServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PlanChangeResult {
  success: boolean;
  oldPlan?: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  quotaUpdated: boolean;
  error?: SubscriptionServiceError;
}

// ==========================================================================
// SERVICE PRINCIPAL
// ==========================================================================

export class SubscriptionService {
  
  /**
   * Récupère le plan d'abonnement actif d'un utilisateur
   */
  static async getUserActivePlan(userId: string): Promise<SubscriptionPlan | null> {
    try {
      // Utiliser la fonction SQL pour obtenir le plan actif
      const { data, error } = await supabase
        .rpc('get_user_active_plan', { user_uuid: userId });

      if (error) {
        logger.warn('⚠️ Erreur récupération plan utilisateur:', { userId, error });
        return null;
      }

      if (!data || data.length === 0) {
        logger.info('ℹ️ Aucun plan actif trouvé pour l\'utilisateur:', { userId });
        return null;
      }

      const planData = data[0];
      
      return {
        id: planData.plan_id,
        name: planData.plan_name,
        type: planData.plan_type as SubscriptionPlanType,
        displayName: planData.plan_name, // Fallback
        storageQuotaBytes: planData.storage_quota_bytes,
        maxFileSizeBytes: planData.max_file_size_bytes,
        maxFilesPerUpload: planData.max_files_per_upload,
        features: planData.features || {},
        priceMonthly: undefined, // Non disponible depuis la fonction SQL
        priceYearly: undefined,  // Non disponible depuis la fonction SQL
        currency: 'EUR',         // Valeur par défaut
        isActive: true,
        isDefault: planData.plan_type === 'free'
      };

    } catch (error) {
      logger.error('❌ Erreur service récupération plan:', { userId, error });
      return null;
    }
  }

  /**
   * Récupère tous les plans d'abonnement disponibles
   */
  static async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('storage_quota_bytes', { ascending: true });

      if (error) {
        logger.warn('⚠️ Erreur récupération plans disponibles:', { error });
        return [];
      }

      return (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type as SubscriptionPlanType,
        displayName: plan.display_name,
        description: plan.description,
        storageQuotaBytes: plan.storage_quota_bytes,
        maxFileSizeBytes: plan.max_file_size_bytes,
        maxFilesPerUpload: plan.max_files_per_upload,
        features: plan.features || {},
        priceMonthly: plan.price_monthly,
        priceYearly: plan.price_yearly,
        currency: plan.currency,
        isActive: plan.is_active,
        isDefault: plan.is_default
      }));

    } catch (error) {
      logger.error('❌ Erreur service récupération plans:', { error });
      return [];
    }
  }

  /**
   * Change le plan d'abonnement d'un utilisateur
   */
  static async changeUserPlan(
    userId: string, 
    newPlanId: string, 
    billingProvider?: string,
    externalSubscriptionId?: string
  ): Promise<PlanChangeResult> {
    let oldPlan: SubscriptionPlan | null = null;
    
    try {
      // Récupérer l'ancien plan
      oldPlan = await this.getUserActivePlan(userId);
      
      // Récupérer le nouveau plan
      const { data: newPlanData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', newPlanId)
        .eq('is_active', true)
        .single();

      if (planError || !newPlanData) {
        return {
          success: false,
          newPlan: oldPlan || {
            id: '',
            name: 'unknown',
            type: 'free',
            displayName: 'Unknown',
            storageQuotaBytes: 0,
            maxFileSizeBytes: 0,
            maxFilesPerUpload: 0,
            features: {},
            currency: 'EUR',
            isActive: false,
            isDefault: true
          },
          quotaUpdated: false,
          error: {
            code: 'PLAN_NOT_FOUND',
            message: 'Plan d\'abonnement non trouvé ou inactif',
            details: planError
          }
        };
      }

      const newPlan: SubscriptionPlan = {
        id: newPlanData.id,
        name: newPlanData.name,
        type: newPlanData.type as SubscriptionPlanType,
        displayName: newPlanData.display_name,
        description: newPlanData.description,
        storageQuotaBytes: newPlanData.storage_quota_bytes,
        maxFileSizeBytes: newPlanData.max_file_size_bytes,
        maxFilesPerUpload: newPlanData.max_files_per_upload,
        features: newPlanData.features || {},
        priceMonthly: newPlanData.price_monthly,
        priceYearly: newPlanData.price_yearly,
        currency: newPlanData.currency,
        isActive: newPlanData.is_active,
        isDefault: newPlanData.is_default
      };

      // Désactiver l'ancien abonnement s'il existe
      if (oldPlan) {
        await supabase
          .from('user_subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', 'active');
      }

      // Créer le nouvel abonnement
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: newPlanId,
          status: 'active',
          started_at: new Date().toISOString(),
          billing_provider: billingProvider,
          external_subscription_id: externalSubscriptionId
        });

      if (subscriptionError) {
        return {
          success: false,
          oldPlan: oldPlan || undefined,
          newPlan,
          quotaUpdated: false,
          error: {
            code: 'SUBSCRIPTION_CREATION_FAILED',
            message: 'Échec de création de l\'abonnement',
            details: subscriptionError
          }
        };
      }

      // Mettre à jour les quotas via la fonction SQL
      const { error: quotaError } = await supabase
        .rpc('update_user_quota_from_plan', { user_uuid: userId });

      if (quotaError) {
        logger.warn('⚠️ Erreur mise à jour quota après changement de plan:', { userId, error: quotaError });
        // Le changement de plan a réussi mais pas la mise à jour du quota
        return {
          success: true,
          oldPlan: oldPlan || undefined,
          newPlan,
          quotaUpdated: false,
          error: {
            code: 'QUOTA_UPDATE_FAILED',
            message: 'Plan changé mais quota non mis à jour',
            details: quotaError
          }
        };
      }

      logger.info('✅ Plan d\'abonnement changé avec succès:', { 
        userId, 
        oldPlan: oldPlan?.name, 
        newPlan: newPlan.name,
        newQuota: formatBytes(newPlan.storageQuotaBytes)
      });

      return {
        success: true,
        oldPlan: oldPlan || undefined,
        newPlan,
        quotaUpdated: true
      };

    } catch (error) {
      logger.error('❌ Erreur service changement de plan:', { userId, newPlanId, error });
      return {
        success: false,
        newPlan: oldPlan || {
          id: '',
          name: 'unknown',
          type: 'free',
          displayName: 'Unknown',
          storageQuotaBytes: 0,
          maxFileSizeBytes: 0,
          maxFilesPerUpload: 0,
          features: {},
          currency: 'EUR',
          isActive: false,
          isDefault: true
        },
        quotaUpdated: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du changement de plan',
          details: error
        }
      };
    }
  }

  /**
   * Récupère les informations de quota complètes d'un utilisateur
   */
  static async getUserStorageQuota(userId: string): Promise<StorageQuota | null> {
    try {
      // Récupérer le plan actif
      const currentPlan = await this.getUserActivePlan(userId);
      if (!currentPlan) {
        return null;
      }

      // Récupérer l'usage actuel
      const { data: usageData, error: usageError } = await supabase
        .from('storage_usage')
        .select('used_bytes, quota_bytes')
        .eq('user_id', userId)
        .single();

      if (usageError) {
        logger.warn('⚠️ Erreur récupération usage stockage:', { userId, error: usageError });
        return null;
      }

      const usedBytes = usageData.used_bytes || 0;
      const quotaBytes = usageData.quota_bytes || currentPlan.storageQuotaBytes;
      const remainingBytes = quotaBytes - usedBytes;
      const usagePercentage = calculateUsagePercentage(usedBytes, quotaBytes);
      const alertLevel = getUsageAlertLevel(usedBytes, quotaBytes);

      return {
        usedBytes,
        quotaBytes,
        remainingBytes,
        usagePercentage,
        alertLevel,
        currentPlan
      };

    } catch (error) {
      logger.error('❌ Erreur service récupération quota:', { userId, error });
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur peut uploader un fichier selon son plan
   */
  static async canUserUploadFile(
    userId: string, 
    fileSize: number, 
    fileCount: number = 1
  ): Promise<{ canUpload: boolean; reason?: string; plan?: SubscriptionPlan }> {
    try {
      const currentPlan = await this.getUserActivePlan(userId);
      if (!currentPlan) {
        return {
          canUpload: false,
          reason: 'Aucun plan d\'abonnement actif'
        };
      }

      // Vérifier la taille du fichier
      if (fileSize > currentPlan.maxFileSizeBytes) {
        return {
          canUpload: false,
          reason: `Fichier trop volumineux. Maximum autorisé: ${formatBytes(currentPlan.maxFileSizeBytes)}`,
          plan: currentPlan
        };
      }

      // Vérifier le nombre de fichiers
      if (fileCount > currentPlan.maxFilesPerUpload) {
        return {
          canUpload: false,
          reason: `Trop de fichiers. Maximum autorisé: ${currentPlan.maxFilesPerUpload} fichiers par upload`,
          plan: currentPlan
        };
      }

      // Vérifier le quota de stockage
      const quota = await this.getUserStorageQuota(userId);
      if (!quota) {
        return {
          canUpload: false,
          reason: 'Impossible de vérifier le quota de stockage',
          plan: currentPlan
        };
      }

      if (quota.usedBytes + fileSize > quota.quotaBytes) {
        return {
          canUpload: false,
          reason: `Quota de stockage dépassé. Espace disponible: ${formatBytes(quota.remainingBytes)}`,
          plan: currentPlan
        };
      }

      return {
        canUpload: true,
        plan: currentPlan
      };

    } catch (error) {
      logger.error('❌ Erreur service vérification upload:', { userId, fileSize, error });
      return {
        canUpload: false,
        reason: 'Erreur lors de la vérification des permissions d\'upload'
      };
    }
  }

  /**
   * Annule l'abonnement d'un utilisateur
   */
  static async cancelUserSubscription(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        logger.warn('⚠️ Erreur annulation abonnement:', { userId, error });
        return false;
      }

      // L'utilisateur repasse automatiquement au plan gratuit
      // grâce au trigger SQL qui appelle get_user_active_plan

      logger.info('✅ Abonnement annulé avec succès:', { userId });
      return true;

    } catch (error) {
      logger.error('❌ Erreur service annulation abonnement:', { userId, error });
      return false;
    }
  }

  /**
   * Récupère l'historique des abonnements d'un utilisateur
   */
  static async getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          started_at,
          expires_at,
          canceled_at,
          billing_provider,
          external_subscription_id,
          metadata,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        logger.warn('⚠️ Erreur récupération historique abonnements:', { userId, error });
        return [];
      }

      return (data || []).map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        planId: sub.plan_id,
        status: sub.status,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        canceledAt: sub.canceled_at,
        billingProvider: sub.billing_provider,
        externalSubscriptionId: sub.external_subscription_id,
        metadata: sub.metadata || {}
      }));

    } catch (error) {
      logger.error('❌ Erreur service historique abonnements:', { userId, error });
      return [];
    }
  }
}

// ==========================================================================
// EXPORTS
// ==========================================================================

export default SubscriptionService; 