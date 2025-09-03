# 🚀 Architecture Unifiée des Fichiers - Documentation Complète

## 📋 **Vue d'ensemble**

L'architecture unifiée des fichiers simplifie grandement la gestion des uploads en consolidant toutes les opérations dans un seul endpoint `/api/ui/files/upload`. Cette approche élimine la complexité des endpoints séparés et offre une expérience cohérente pour tous les types de fichiers.

## 🎯 **Endpoints Unifiés**

### **`/api/ui/files/upload` - Endpoint Principal Unifié**
- **URL :** `POST /api/ui/files/upload`
- **Fonctionnalités :** Upload de fichiers locaux + Enregistrement d'URLs externes
- **Authentification :** JWT Bearer Token requis
- **Validation :** Zod schema avec validation stricte

## 🔄 **Types d'Opérations Supportées**

### **1. 📁 Upload de Fichiers Locaux**
```typescript
POST /api/ui/files/upload
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 2048000,
  "folderId": "uuid-optionnel",
  "notebookId": "uuid-optionnel"
}
```

**Processus :**
1. ✅ Validation du type et de la taille
2. 🌐 Upload sécurisé vers S3
3. 💾 Enregistrement en base de données
4. 📊 Mise à jour des quotas de stockage
5. 📝 Audit trail complet

### **2. 🔗 URLs Externes (Stockage Simple)**
```typescript
POST /api/ui/files/upload
{
  "externalUrl": "https://example.com/image.jpg",
  "fileName": "image_externe",
  "fileType": "image/jpeg",
  "fileSize": 0,
  "folderId": "uuid-optionnel",
  "notebookId": "uuid-optionnel"
}
```

**Processus :**
1. ✅ Validation de l'URL externe
2. 💾 Enregistrement direct en base
3. 📝 Audit trail (pas de quota)
4. 🚫 Pas d'upload S3

## 🏗️ **Structure de la Base de Données**

### **Table `files` - Schéma Unifié**

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  s3_key TEXT,                    -- NULL pour URLs externes
  url TEXT NOT NULL,              -- URL S3 ou URL externe
  owner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  folder_id UUID,
  status VARCHAR(50) DEFAULT 'ready',
  request_id VARCHAR(255),
  sha256 VARCHAR(64),             -- NULL pour URLs externes
  visibility_mode VARCHAR(50) DEFAULT 'inherit_note',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Différences selon le Type**

| Champ | Fichier Local | URL Externe |
|-------|---------------|-------------|
| `s3_key` | ✅ Clé S3 | ❌ NULL |
| `url` | ✅ URL S3 | ✅ URL externe |
| `size` | ✅ Taille réelle | ❌ 0 |
| `sha256` | ✅ Hash du fichier | ❌ NULL |
| `status` | ✅ 'uploading' → 'ready' | ✅ 'ready' |

## 🔐 **Sécurité et Validation**

### **Types de Fichiers Autorisés**
```typescript
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  
  // Documents
  'application/pdf', 'application/msword', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // Google Apps
  'application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet',
  
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/gzip',
  
  // Autres
  'application/json', 'application/xml', 'application/octet-stream'
];
```

### **Limites de Sécurité**
- **Taille maximale :** 100MB par fichier
- **Authentification :** JWT Bearer Token obligatoire
- **RLS :** Politiques Supabase strictes
- **Validation :** Schema Zod strict côté serveur

## 📊 **Audit Trail et Monitoring**

### **Table `file_events`**
```sql
CREATE TABLE file_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id),
  user_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  request_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Types d'Événements**
- `upload_initiated` : Début d'upload de fichier
- `external_url_added` : Ajout d'URL externe
- `upload_completed` : Upload terminé avec succès
- `upload_failed` : Échec d'upload

## 🚀 **Utilisation dans le Code**

### **Frontend - ImageMenu.tsx**
```typescript
// Upload de fichier local
const handleUpload = async () => {
  const uploadPayload = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    folderId: undefined,
    notebookId: undefined
  };
  
  const response = await fetch('/api/ui/files/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(uploadPayload)
  });
  
  const { file: savedFile } = await response.json();
  onInsertImage(savedFile.url);
};

// URL externe
const handleInsertUrl = async () => {
  const uploadPayload = {
    externalUrl: url.trim(),
    fileName: 'image_externe',
    fileType: 'image/jpeg',
    fileSize: 0
  };
  
  const response = await fetch('/api/ui/files/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(uploadPayload)
  });
  
  const { file: savedFile } = await response.json();
  onInsertImage(savedFile.url);
};
```

### **Backend - Route Handler**
```typescript
export async function POST(request: NextRequest) {
  // 1. Authentification
  const authResult = await getAuthenticatedUser(request);
  
  // 2. Validation des données
  const uploadData = uploadSchema.parse(await request.json());
  
  // 3. Détermination du type d'opération
  const isFileUpload = uploadData.fileName && uploadData.fileType && uploadData.fileSize;
  const isExternalUrl = uploadData.externalUrl;
  
  // 4. Traitement selon le type
  if (isFileUpload) {
    // Upload S3 + DB
  } else if (isExternalUrl) {
    // DB seulement
  }
  
  // 5. Audit trail + réponse
}
```

## 🔧 **Configuration et Variables d'Environnement**

### **Variables Requises**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket_name
```

## 📈 **Avantages de l'Architecture Unifiée**

### **✅ Simplification**
- **Un seul endpoint** pour tous les types de fichiers
- **Code DRY** sans duplication de logique
- **Maintenance simplifiée** et centralisée

### **🔒 Sécurité Renforcée**
- **Validation uniforme** pour tous les types
- **Audit trail cohérent** et complet
- **RLS policies** appliquées uniformément

### **📊 Monitoring Unifié**
- **Logs centralisés** avec request_id
- **Métriques cohérentes** pour tous les types
- **Debugging simplifié** avec un seul point d'entrée

### **🚀 Performance**
- **Moins de round-trips** pour les URLs externes
- **Cache partagé** et optimisations communes
- **Gestion d'erreurs** uniformisée

## 🧪 **Tests et Validation**

### **Tests d'Intégration**
```typescript
describe('File Upload API', () => {
  test('should upload local file successfully', async () => {
    // Test upload fichier local
  });
  
  test('should register external URL successfully', async () => {
    // Test URL externe
  });
  
  test('should reject invalid file types', async () => {
    // Test validation
  });
});
```

### **Tests de Sécurité**
- Authentification requise
- Validation des types de fichiers
- Limites de taille respectées
- RLS policies appliquées

## 🔄 **Migration depuis l'Ancienne Architecture**

### **Endpoints Supprimés**
- ❌ `/api/ui/files/register` (remplacé par `/upload`)
- ❌ `/api/ui/files/presign-upload` (intégré dans `/upload`)

### **Code Frontend à Mettre à Jour**
- `ImageMenu.tsx` : Utiliser l'endpoint unifié
- `FileUploaderLocal.tsx` : Déjà compatible
- Autres composants : Adapter selon les besoins

## 📚 **Références et Ressources**

### **Fichiers Clés**
- `src/app/api/ui/files/upload/route.ts` - Endpoint principal
- `src/services/secureS3Service.ts` - Service S3 sécurisé
- `src/components/ImageMenu.tsx` - Composant d'insertion d'images
- `src/utils/authUtils.ts` - Utilitaires d'authentification

### **Documentation Associée**
- [API V2 Documentation](./API-V2-COMPLETE-DOCUMENTATION.md)
- [Sécurité et RLS](./AUDIT-SECURITE-API-FINAL.md)
- [Architecture des Fichiers](./ARCHITECTURE-DB-FIRST.md)

---

## 🎉 **Conclusion**

L'architecture unifiée des fichiers représente une amélioration significative de la maintenabilité, de la sécurité et de la cohérence du système. En consolidant toutes les opérations dans un seul endpoint, nous avons créé une solution plus robuste, plus facile à déboguer et à maintenir.

**Prochaine étape :** Tester l'endpoint unifié avec différents types de fichiers et valider que tous les cas d'usage fonctionnent correctement.


