# 🚀 SYSTÈME DE QUOTAS PAR ABONNEMENT

## 🎯 Vue d'ensemble

Le système de quotas par abonnement d'Abrège permet de **gérer dynamiquement** l'espace de stockage des utilisateurs selon leur plan d'abonnement. Plus besoin de modifier manuellement les quotas - tout se fait **automatiquement** !

### **✨ AVANTAGES MAJEURS**

✅ **Quotas dynamiques** : Changent automatiquement selon l'abonnement  
✅ **Gestion automatique** : Plus de modification manuelle des quotas  
✅ **Plans flexibles** : Gratuit, Basic, Premium, Enterprise  
✅ **Synchronisation temps réel** : Quotas mis à jour instantanément  
✅ **Historique complet** : Suivi de tous les changements d'abonnement  
✅ **Fallback robuste** : Système de secours en cas de problème  

## 🏗️ Architecture

### **Structure de la Base de Données**

```sql
-- Plans d'abonnement disponibles
subscription_plans
├── id (UUID)
├── name (free, basic, premium, enterprise)
├── storage_quota_bytes (quota en octets)
├── max_file_size_bytes (taille max par fichier)
├── max_files_per_upload (nombre max de fichiers)
├── features (JSONB avec fonctionnalités)
├── price_monthly, price_yearly (prix)
└── is_active, is_default

-- Abonnements actifs des utilisateurs
user_subscriptions
├── user_id (référence auth.users)
├── plan_id (référence subscription_plans)
├── status (active, trialing, past_due, canceled, expired)
├── started_at, expires_at, canceled_at
└── billing_provider, external_subscription_id

-- Quotas de stockage (mise à jour automatique)
storage_usage
├── user_id
├── used_bytes, quota_bytes
├── current_plan_id (référence subscription_plans)
└── plan_updated_at
```

### **Flux de Données**

```
1. Utilisateur change d'abonnement
   ↓
2. Trigger SQL met à jour storage_usage
   ↓
3. Quota automatiquement ajusté
   ↓
4. Interface utilisateur reflète le nouveau quota
```

## 📋 Plans d'Abonnement

### **Plan Gratuit (FREE)**
- **Quota** : 1 GB
- **Taille max fichier** : 25 MB
- **Fichiers max/upload** : 5
- **Fonctionnalités** : Base
- **Prix** : Gratuit

### **Plan Basique (BASIC)**
- **Quota** : 5 GB
- **Taille max fichier** : 50 MB
- **Fichiers max/upload** : 10
- **Fonctionnalités** : + Chat AI
- **Prix** : À définir

### **Plan Premium (PREMIUM)**
- **Quota** : 20 GB
- **Taille max fichier** : 100 MB
- **Fichiers max/upload** : 20
- **Fonctionnalités** : + Support prioritaire + Fonctionnalités avancées
- **Prix** : À définir

### **Plan Entreprise (ENTERPRISE)**
- **Quota** : 100 GB
- **Taille max fichier** : 500 MB
- **Fichiers max/upload** : 50
- **Fonctionnalités** : + Fonctionnalités équipe + API
- **Prix** : À définir

## 🔧 Utilisation

### **1. Récupération du Plan Actif**

```typescript
import SubscriptionService from '@/services/subscriptionService';

// Récupérer le plan actif d'un utilisateur
const plan = await SubscriptionService.getUserActivePlan(userId);

if (plan) {
  console.log(`Plan: ${plan.displayName}`);
  console.log(`Quota: ${formatBytes(plan.storageQuotaBytes)}`);
  console.log(`Taille max fichier: ${formatBytes(plan.maxFileSizeBytes)}`);
}
```

### **2. Changement de Plan**

```typescript
// Changer le plan d'un utilisateur
const result = await SubscriptionService.changeUserPlan(
  userId,
  newPlanId,
  'stripe', // fournisseur de facturation
  'sub_123456' // ID externe
);

if (result.success) {
  console.log(`Plan changé: ${result.oldPlan?.name} → ${result.newPlan.name}`);
  console.log(`Quota mis à jour: ${result.quotaUpdated}`);
}
```

### **3. Vérification des Permissions d'Upload**

```typescript
// Vérifier si un utilisateur peut uploader
const uploadCheck = await SubscriptionService.canUserUploadFile(
  userId,
  fileSize,
  fileCount
);

if (uploadCheck.canUpload) {
  console.log('✅ Upload autorisé');
} else {
  console.log(`❌ Upload refusé: ${uploadCheck.reason}`);
}
```

### **4. Récupération du Quota Complet**

```typescript
// Récupérer toutes les infos de quota
const quota = await SubscriptionService.getUserStorageQuota(userId);

if (quota) {
  console.log(`Utilisé: ${formatBytes(quota.usedBytes)}`);
  console.log(`Total: ${formatBytes(quota.quotaBytes)}`);
  console.log(`Restant: ${formatBytes(quota.remainingBytes)}`);
  console.log(`Pourcentage: ${quota.usagePercentage}%`);
  console.log(`Niveau d'alerte: ${quota.alertLevel}`);
  console.log(`Plan: ${quota.currentPlan?.displayName}`);
}
```

## 🚀 Scripts de Gestion

### **Test du Système**

```bash
# Tester toutes les fonctionnalités
npm run test-subscriptions

# Ce script teste :
# - Récupération des plans
# - Création d'utilisateur de test
# - Changement de plan
# - Vérification des quotas
# - Permissions d'upload
# - Historique des abonnements
# - Retour au plan gratuit
```

### **Mise à Jour des Quotas (Legacy)**

```bash
# Pour les utilisateurs sans abonnement (fallback)
npm run update-quotas -- --quota=5GB --user=user_id
npm run update-quotas -- --quota=10GB --all
```

## 🔄 Migration et Installation

### **1. Appliquer la Migration**

```bash
# La migration crée automatiquement :
# - Tables subscription_plans et user_subscriptions
# - Plans par défaut (FREE, BASIC, PREMIUM, ENTERPRISE)
# - Abonnements gratuits pour tous les utilisateurs existants
# - Triggers de synchronisation automatique
```

### **2. Vérification**

```sql
-- Vérifier que les plans sont créés
SELECT * FROM subscription_plans WHERE is_active = true;

-- Vérifier que les utilisateurs ont des abonnements
SELECT 
  u.email,
  sp.display_name as plan,
  sp.storage_quota_bytes,
  su.quota_bytes as current_quota
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN storage_usage su ON u.id = su.user_id
WHERE us.status = 'active';
```

## 🎨 Interface Utilisateur

### **Affichage du Plan Actuel**

```typescript
// Dans un composant React
const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

useEffect(() => {
  const loadPlan = async () => {
    const plan = await SubscriptionService.getUserActivePlan(userId);
    setCurrentPlan(plan);
  };
  loadPlan();
}, [userId]);

return (
  <div className="subscription-info">
    <h3>Plan actuel: {currentPlan?.displayName}</h3>
    <p>Quota: {formatBytes(currentPlan?.storageQuotaBytes || 0)}</p>
    <p>Taille max fichier: {formatBytes(currentPlan?.maxFileSizeBytes || 0)}</p>
  </div>
);
```

### **Gestion des Abonnements**

```typescript
// Composant de changement de plan
const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

useEffect(() => {
  const loadPlans = async () => {
    const plans = await SubscriptionService.getAvailablePlans();
    setAvailablePlans(plans);
  };
  loadPlans();
}, []);

const handlePlanChange = async (planId: string) => {
  const result = await SubscriptionService.changeUserPlan(userId, planId);
  
  if (result.success) {
    toast.success(`Plan changé vers ${result.newPlan.displayName}`);
    // Recharger les données utilisateur
  } else {
    toast.error(`Erreur: ${result.error?.message}`);
  }
};
```

## 🛠️ Maintenance

### **Ajout d'un Nouveau Plan**

```sql
-- Insérer un nouveau plan
INSERT INTO subscription_plans (
  name, type, display_name, description,
  storage_quota_bytes, max_file_size_bytes, max_files_per_upload,
  features, price_monthly, price_yearly, currency
) VALUES (
  'pro',
  'custom',
  'Pro',
  'Plan professionnel avancé',
  53687091200, -- 50 GB
  209715200,   -- 200 MB
  30,          -- 30 fichiers
  '{"ai_chat": true, "priority_support": true, "advanced_features": true, "api_access": true}'::jsonb,
  29.99,
  299.99,
  'EUR'
);
```

### **Modification d'un Plan Existant**

```sql
-- Modifier un plan existant
UPDATE subscription_plans 
SET 
  storage_quota_bytes = 10737418240, -- 10 GB
  max_file_size_bytes = 104857600,   -- 100 MB
  updated_at = NOW()
WHERE name = 'basic';
```

### **Migration des Utilisateurs**

```sql
-- Migrer tous les utilisateurs vers un nouveau plan
UPDATE user_subscriptions 
SET 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'premium'),
  started_at = NOW(),
  status = 'active'
WHERE user_id IN (
  SELECT user_id FROM user_subscriptions 
  WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'basic')
);
```

## 🚨 Dépannage

### **Problèmes Courants**

1. **Quota non mis à jour** : Vérifier les triggers SQL
2. **Plan non trouvé** : Vérifier que le plan est actif
3. **Synchronisation échouée** : Vérifier les permissions RLS

### **Logs de Débogage**

```typescript
// Activer les logs détaillés
logger.info('📊 Changement de plan', {
  userId,
  oldPlan: result.oldPlan?.name,
  newPlan: result.newPlan.name,
  quotaUpdated: result.quotaUpdated
});
```

### **Vérification de l'État**

```sql
-- Vérifier l'état des abonnements
SELECT 
  u.email,
  sp.name as plan_name,
  us.status,
  us.started_at,
  su.quota_bytes,
  su.current_plan_id
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN storage_usage su ON u.id = su.user_id;
```

## 📚 Références

- **Migration SQL** : `supabase/migrations/20250131_create_subscription_plans.sql`
- **Service** : `src/services/subscriptionService.ts`
- **Configuration** : `src/config/storage.ts`
- **Types** : `src/types/files.ts`
- **Script de test** : `scripts/test-subscription-system.ts`
- **Documentation quotas** : `docs/STORAGE-QUOTAS.md`

---

**🎯 RÉSULTAT FINAL** : Maintenant, quand un utilisateur change d'abonnement, son quota de stockage se met à jour **automatiquement** ! Plus besoin de scripts manuels ou de modifications en base. Le système est **100% dynamique** et **professionnel** ! 🚀✨ 