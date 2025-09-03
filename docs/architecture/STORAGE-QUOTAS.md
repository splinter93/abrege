# 📁 GESTION DES QUOTAS DE STOCKAGE

## 🎯 Vue d'ensemble

Le système de quotas de stockage d'Abrège permet de contrôler l'espace disque utilisé par chaque utilisateur. Il est **facilement configurable** et **centralisé** pour une maintenance simple.

## 🏗️ Architecture

### **Structure de la Base de Données**

```sql
-- Table principale des quotas
CREATE TABLE storage_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  used_bytes BIGINT DEFAULT 0,           -- Espace utilisé
  quota_bytes BIGINT DEFAULT 1073741824, -- Quota total (1GB par défaut)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Tables Associées**

- **`files`** : Stocke la taille de chaque fichier (`size` en octets)
- **`storage_usage`** : Quotas et usage par utilisateur
- **`file_events`** : Audit trail des opérations sur fichiers

## ⚙️ Configuration

### **1. Fichier de Configuration Centralisé**

```typescript
// src/config/storage.ts
export const STORAGE_CONFIG = {
  // Quota par défaut pour tous les utilisateurs
  DEFAULT_QUOTA_BYTES: 1073741824, // 1 GB
  
  // Quotas par type d'utilisateur
  USER_TIERS: {
    FREE: 1073741824,        // 1 GB
    BASIC: 5368709120,       // 5 GB  
    PREMIUM: 21474836480,    // 20 GB
    ENTERPRISE: 107374182400 // 100 GB
  },
  
  // Limites par fichier
  FILE_LIMITS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
    MAX_FILES_PER_UPLOAD: 10
  }
};
```

### **2. Variables d'Environnement**

```bash
# env.example
STORAGE_DEFAULT_QUOTA_BYTES=1073741824  # 1 GB
STORAGE_MAX_FILE_SIZE=104857600          # 100 MB
STORAGE_WARNING_THRESHOLD=80             # Avertissement à 80%
STORAGE_CRITICAL_THRESHOLD=95            # Critique à 95%
STORAGE_BLOCK_THRESHOLD=100              # Blocage à 100%
```

## 🚀 Modification des Quotas

### **Option 1 : Script Automatique (Recommandé)**

```bash
# Afficher les quotas actuels
npm run update-quotas -- --show

# Mettre à jour un utilisateur spécifique
npm run update-quotas -- --quota=5GB --user=user_id

# Mettre à jour tous les utilisateurs
npm run update-quotas -- --quota=10GB --all

# Aide
npm run update-quotas -- --help
```

### **Option 2 : Modification Directe en Base**

```sql
-- Mettre à jour un utilisateur spécifique
UPDATE storage_usage 
SET quota_bytes = 5368709120, -- 5 GB
    updated_at = NOW()
WHERE user_id = 'user-uuid-here';

-- Mettre à jour tous les utilisateurs
UPDATE storage_usage 
SET quota_bytes = 10737418240, -- 10 GB
    updated_at = NOW();
```

### **Option 3 : Modification du Code**

```typescript
// src/config/storage.ts
export const STORAGE_CONFIG = {
  DEFAULT_QUOTA_BYTES: 5368709120, // 5 GB au lieu de 1 GB
  // ... autres configurations
};
```

## 📊 Calcul des Quotas

### **Logique de Calcul**

1. **Priorité 1** : Table `storage_usage` (si elle existe)
2. **Priorité 2** : Calcul depuis la table `files` (fallback)
3. **Priorité 3** : Valeur par défaut du code

```typescript
// Dans useFilesPage.ts
const refreshQuota = async () => {
  // 1. Essayer storage_usage
  const { data: storageData } = await supabase
    .from('storage_usage')
    .select('used_bytes, quota_bytes')
    .eq('user_id', user.id)
    .single();

  if (storageData) {
    // Utiliser les données de storage_usage
    return {
      usedBytes: storageData.used_bytes,
      quotaBytes: storageData.quota_bytes,
      remainingBytes: storageData.quota_bytes - storageData.used_bytes
    };
  }

  // 2. Fallback : calculer depuis files
  const { data: filesData } = await supabase
    .from('files')
    .select('size')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const usedBytes = filesData.reduce((sum, file) => sum + file.size, 0);
  const quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA_BYTES;

  return { usedBytes, quotaBytes, remainingBytes: quotaBytes - usedBytes };
};
```

## 🔄 Mise à Jour Automatique

### **Triggers de Mise à Jour**

- **Upload de fichier** : Via API v2 `/api/v2/files/upload`
- **Suppression de fichier** : Via `deleteFile()` + `refreshQuota()`
- **Création d'utilisateur** : Trigger automatique avec quota par défaut

### **Fonctions de Mise à Jour**

```sql
-- Fonction de mise à jour automatique
CREATE OR REPLACE FUNCTION update_user_storage_usage(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE storage_usage 
  SET used_bytes = (
    SELECT COALESCE(SUM(size), 0) 
    FROM files 
    WHERE user_id = user_uuid AND deleted_at IS NULL
  ),
  updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📈 Seuils d'Alerte

### **Niveaux d'Alerte**

```typescript
export const ALERT_THRESHOLDS = {
  WARNING: 80,    // Avertissement à 80%
  CRITICAL: 95,   // Critique à 95%
  BLOCK: 100      // Blocage à 100%
};

// Détermination du niveau
function getUsageAlertLevel(usedBytes: number, quotaBytes: number) {
  const percentage = (usedBytes / quotaBytes) * 100;
  
  if (percentage >= 100) return 'blocked';
  if (percentage >= 95) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'safe';
}
```

### **Affichage dans l'Interface**

```typescript
// Dans FilesPage.tsx
{quotaInfo && (
  <span className={`quota-info ${getUsageAlertLevel(quotaInfo.usedBytes, quotaInfo.quotaBytes)}`}>
    {Math.round((quotaInfo.usedBytes / quotaInfo.quotaBytes) * 100)}% utilisé
  </span>
)}
```

## 🛠️ Maintenance

### **Vérification des Quotas**

```bash
# Afficher tous les quotas
npm run update-quotas -- --show

# Vérifier l'usage d'un utilisateur spécifique
SELECT 
  user_id,
  used_bytes,
  quota_bytes,
  (quota_bytes - used_bytes) as remaining_bytes,
  ROUND((used_bytes::float / quota_bytes::float) * 100, 2) as usage_percentage
FROM storage_usage
WHERE user_id = 'user-uuid-here';
```

### **Nettoyage des Données**

```sql
-- Supprimer les entrées orphelines
DELETE FROM storage_usage 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Réinitialiser l'usage d'un utilisateur
UPDATE storage_usage 
SET used_bytes = 0, updated_at = NOW()
WHERE user_id = 'user-uuid-here';
```

## 🚨 Dépannage

### **Problèmes Courants**

1. **Quota non mis à jour** : Vérifier les triggers et fonctions
2. **Calcul incorrect** : Vérifier la table `files` et `deleted_at`
3. **Permissions** : Vérifier les politiques RLS sur `storage_usage`

### **Logs de Débogage**

```typescript
// Activer les logs détaillés
logger.info('📊 Mise à jour quota', {
  userId: user.id,
  oldQuota: currentQuota,
  newQuota: newQuota,
  usedBytes: currentUsage
});
```

## 📚 Références

- **Migration SQL** : `supabase/migrations/20250131_secure_files_phase1.sql`
- **Configuration** : `src/config/storage.ts`
- **Hook** : `src/hooks/useFilesPage.ts`
- **Script** : `scripts/update-storage-quotas.ts`
- **Types** : `src/types/files.ts`

---

**💡 Conseil** : Utilisez toujours le script `npm run update-quotas` pour modifier les quotas en production. C'est plus sûr et plus facile que les modifications manuelles en base ! 