# Architecture d'Upload d'Images - Éditeur

## 🎯 **Vue d'ensemble**

Ce document décrit l'architecture unifiée pour l'upload d'images dans l'éditeur, garantissant la cohérence avec la page fichiers et la maintenabilité du code.

## 🏗️ **Architecture générale**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Composants    │    │  uploadImageFor  │    │   Endpoints     │
│    d'éditeur    │───▶│     Note()       │───▶│      API       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ImageMenu     │    │   Utilitaires    │    │  /api/ui/files  │
│   Drag & Drop   │    │   S3 & Upload    │    │   /upload       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 **Composants principaux**

### 1. **`uploadImageForNote()` - Fonction centrale**
- **Fichier** : `src/utils/fileUpload.ts`
- **Responsabilité** : Orchestration de l'upload (fichiers + URLs externes)
- **Avantages** : 
  - Logique unifiée pour tous les composants
  - Gestion des erreurs centralisée
  - Fallback robuste

### 2. **Composants d'éditeur**
- **`EditorHeaderImage`** : Drag & drop dans l'en-tête
- **`Editor` (body)** : Drag & drop dans le contenu
- **`ImageMenu`** : Menu d'insertion d'images

### 3. **Endpoints API**
- **`/api/ui/files/upload`** : Initiation de l'upload
- **`/api/ui/files/get-url`** : Récupération d'URL S3 correcte

## 📁 **Structure des fichiers**

```
src/
├── utils/
│   ├── fileUpload.ts          # Fonction principale d'upload
│   └── s3Utils.ts             # Utilitaires S3 centralisés
├── constants/
│   └── fileUpload.ts          # Constantes partagées
├── components/
│   ├── ImageMenu.tsx          # Menu d'insertion d'images
│   └── editor/
│       └── Editor.tsx         # Gestion drag & drop body
└── app/api/ui/files/
    ├── upload/route.ts        # Endpoint d'upload
    └── get-url/route.ts       # Endpoint de récupération d'URL
```

## 🔄 **Flux d'upload**

### **Étape 1 : Préparation**
```typescript
const uploadPayload = buildUploadPayload(file);
const uploadResponse = await fetch('/api/ui/files/upload', {
  method: 'POST',
  body: JSON.stringify(uploadPayload)
});
```

### **Étape 2 : Upload S3 (si fichier)**
```typescript
if (isFile && uploadUrl) {
  await uploadToS3(uploadUrl, file as File);
}
```

### **Étape 3 : Récupération URL finale**
```typescript
// Essayer l'endpoint dédié d'abord
const finalUrl = await getFinalUrl(savedFile.id, authHeader);

if (finalUrl && validateUrl(finalUrl)) {
  return { publicUrl: finalUrl, saved: savedFile };
}

// Fallback vers l'URL de la base
return { publicUrl: savedFile.url, saved: savedFile };
```

## 🎨 **Principes de design**

### **1. Cohérence**
- Tous les composants utilisent `uploadImageForNote()`
- Même logique de construction d'URL que `FileUploaderLocal`

### **2. Maintenabilité**
- Constantes centralisées dans `src/constants/fileUpload.ts`
- Utilitaires S3 dans `src/utils/s3Utils.ts`
- Types TypeScript stricts

### **3. Robustesse**
- Fallback en cas d'échec de l'endpoint dédié
- Validation des URLs générées
- Gestion d'erreurs centralisée

### **4. Performance**
- Pas de duplication de code
- Fonctions utilitaires réutilisables
- Logs de débogage configurables

## 🚀 **Utilisation**

### **Upload de fichier**
```typescript
const { publicUrl } = await uploadImageForNote(file, noteId);
```

### **URL externe**
```typescript
const { publicUrl } = await uploadImageForNote('https://...', noteId);
```

## 🔍 **Débogage**

### **Logs disponibles**
- Upload S3 : `console.warn` en cas d'échec endpoint dédié
- Validation URL : Vérification automatique de la validité

### **Points de contrôle**
1. Authentification réussie
2. Endpoint d'upload fonctionne
3. Upload S3 réussi (si fichier)
4. Endpoint get-url fonctionne
5. URL finale valide

## 🛠️ **Maintenance**

### **Ajout de nouveaux types de fichiers**
1. Modifier `ALLOWED_IMAGE_TYPES` dans `constants/fileUpload.ts`
2. Mettre à jour la validation dans `ImageMenu.tsx`

### **Modification des limites**
1. Ajuster `FILE_SIZE_LIMITS` dans `constants/fileUpload.ts`
2. Les composants se mettent à jour automatiquement

### **Nouveaux composants d'upload**
1. Importer `uploadImageForNote` depuis `utils/fileUpload.ts`
2. Utiliser la même interface que les composants existants

## ✅ **Avantages de cette architecture**

1. **Cohérence** : Même comportement partout
2. **Maintenabilité** : Code centralisé et DRY
3. **Robustesse** : Fallbacks et gestion d'erreurs
4. **Performance** : Pas de duplication
5. **Évolutivité** : Facile d'ajouter de nouveaux composants
