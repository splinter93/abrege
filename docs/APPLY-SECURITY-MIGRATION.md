# 🔒 Guide d'Application de la Migration de Sécurité - Phase 1

## 📋 Prérequis

Avant d'appliquer la migration, assurez-vous d'avoir :

1. **Accès au Supabase Dashboard** de votre projet
2. **Variables d'environnement configurées** :
   ```bash
   AWS_REGION=eu-west-3
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=your_bucket_name
   ```

## 🚀 Méthode 1 : Via Supabase Dashboard (Recommandée)

### **Étape 1 : Accéder au SQL Editor**
1. Ouvrez votre projet dans le [Supabase Dashboard](https://supabase.com/dashboard)
2. Allez dans la section **"SQL Editor"** dans le menu de gauche
3. Cliquez sur **"New query"**

### **Étape 2 : Copier la Migration**
1. Ouvrez le fichier `supabase/migrations/20250131_secure_files_phase1.sql`
2. Copiez tout le contenu du fichier
3. Collez-le dans l'éditeur SQL de Supabase

### **Étape 3 : Exécuter la Migration**
1. Cliquez sur le bouton **"Run"** (ou appuyez sur `Cmd/Ctrl + Enter`)
2. Attendez que toutes les commandes s'exécutent
3. Vérifiez qu'il n'y a pas d'erreurs dans la console

### **Étape 4 : Vérifier l'Application**
Exécutez ces requêtes pour vérifier que la migration s'est bien appliquée :

```sql
-- Vérifier les nouvelles tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('storage_usage', 'file_events');

-- Vérifier les nouvelles colonnes dans files
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'files' 
AND column_name IN ('status', 'sha256', 'request_id', 'deleted_at', 'etag');

-- Vérifier que RLS est actif
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('files', 'storage_usage', 'file_events');
```

## 🔧 Méthode 2 : Via Script (Si Service Role Disponible)

### **Étape 1 : Configurer les Variables**
Assurez-vous d'avoir la variable `SUPABASE_SERVICE_ROLE_KEY` dans votre `.env.local` :

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Étape 2 : Exécuter le Script**
```bash
node scripts/apply-security-migration.js
```

### **Étape 3 : Vérifier les Résultats**
Le script affichera un résumé de l'application de la migration.

## 🔍 Vérification Post-Migration

### **1. Test de l'Application**
1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Allez sur la page **"Mes Fichiers"** (`/private/files`)

3. Vérifiez que :
   - ✅ La page se charge sans erreur
   - ✅ Les fichiers existants s'affichent
   - ✅ Les quotas s'affichent (si des fichiers existent)

### **2. Test de l'API Upload**
```bash
curl -X POST http://localhost:3001/api/v2/files/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fileName": "test.txt",
    "fileType": "text/plain",
    "fileSize": 100
  }'
```

### **3. Vérification des Quotas**
```sql
-- Vérifier les quotas utilisateur
SELECT user_id, used_bytes, quota_bytes, 
       (quota_bytes - used_bytes) as remaining_bytes
FROM storage_usage 
WHERE user_id = 'your_user_id';
```

## ⚠️ Résolution des Problèmes

### **Erreur : "column does not exist"**
Si vous obtenez une erreur sur une colonne qui n'existe pas :

1. **Vérifiez que la migration a été appliquée** :
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'files';
   ```

2. **Si la colonne manque**, réexécutez la partie correspondante de la migration

### **Erreur : "table does not exist"**
Si les nouvelles tables n'existent pas :

1. **Vérifiez les permissions** dans Supabase Dashboard
2. **Réexécutez la création des tables** :
   ```sql
   -- Créer storage_usage
   CREATE TABLE IF NOT EXISTS storage_usage (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     used_bytes BIGINT DEFAULT 0 CHECK (used_bytes >= 0),
     quota_bytes BIGINT DEFAULT 1073741824 CHECK (quota_bytes > 0),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Créer file_events
   CREATE TABLE IF NOT EXISTS file_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     file_id UUID REFERENCES files(id) ON DELETE CASCADE,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     event_type TEXT NOT NULL,
     request_id TEXT,
     ip_address INET,
     user_agent TEXT,
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### **Erreur : "RLS not enabled"**
Si RLS n'est pas activé :

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_events ENABLE ROW LEVEL SECURITY;
```

## 🔄 Rollback (Si Nécessaire)

Si vous devez annuler la migration :

```sql
-- Supprimer les nouvelles colonnes de files
ALTER TABLE files 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS sha256,
DROP COLUMN IF EXISTS request_id,
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS etag;

-- Supprimer les nouvelles tables
DROP TABLE IF EXISTS file_events;
DROP TABLE IF EXISTS storage_usage;

-- Supprimer les index
DROP INDEX IF EXISTS idx_files_user_status_created;
DROP INDEX IF EXISTS idx_files_sha256;
DROP INDEX IF EXISTS idx_file_events_file_created;
```

## 📊 Monitoring Post-Migration

### **Logs à Surveiller**
- ✅ Uploads réussis
- ❌ Erreurs de quota
- ⚠️ Tentatives d'accès non autorisées
- 📊 Utilisation du stockage

### **Métriques Clés**
- **Taux de succès upload** : > 95%
- **Temps de réponse API** : < 2s
- **Erreurs de quota** : < 1%
- **Événements d'audit** : Tous les événements loggés

## 🎉 Validation Finale

Une fois la migration appliquée avec succès :

1. ✅ **Base de données** : Nouvelles tables et colonnes créées
2. ✅ **RLS** : Politiques de sécurité actives
3. ✅ **Application** : Page "Mes Fichiers" fonctionnelle
4. ✅ **API** : Upload sécurisé opérationnel
5. ✅ **Quotas** : Système de quotas fonctionnel

**La Phase 1 est maintenant complète et vous pouvez passer à la Phase 2 !** 🚀 