# 🖼️ Correction du problème des URLs avec signature dans TOUTES les images

## 🐛 Problème identifié

Lors de l'upload d'**images** (en-tête ET contenu), l'URL avec signature AWS était utilisée dans la base de données et l'éditeur au lieu de l'URL canonique propre. Cela causait des problèmes car :

1. **URLs temporaires** : Les URLs signées expirent (180 secondes par défaut)
2. **URLs sales** : Contiennent des paramètres de signature AWS complexes
3. **Incohérence** : L'URL propre était stockée dans `files.url` mais pas utilisée

## 🔧 Solution appliquée

### Modification de `src/utils/fileUpload.ts`

**Avant :**
```typescript
// Use AWS URL directly since the API route has auth issues
const publicUrl = signed_url || `/api/ui/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
```

**Après :**
```typescript
// Use the canonical AWS URL from the files table instead of signed_url
// The canonical URL is already stored in files.url and is the clean URL we want
const publicUrl = saved.url || `/api/ui/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
```

### Modification de `src/components/ImageMenu.tsx`

**Avant :**
```typescript
// Use AWS URL directly since the API route has auth issues
const renderUrl = signed_url || `/api/ui/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
```

**Après :**
```typescript
// Use the canonical AWS URL from the files table instead of signed_url
// The canonical URL is already stored in files.url and is the clean URL we want
const renderUrl = saved.url || `/api/ui/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
```

## 📋 Ordre des opérations corrigé

### ✅ Avant (incorrect)
1. Upload image sur S3
2. **❌ Retour immédiat de l'URL signée**
3. **❌ Mise à jour de la base avec URL signée**
4. Enregistrement dans table `files` avec URL canonique AWS

### ✅ Après (correct)
1. Upload image sur S3
2. Enregistrement dans table `files` avec URL canonique AWS (`files.url`)
3. **✅ Retour de l'URL canonique AWS (`saved.url`)**
4. **✅ Mise à jour de la base avec URL propre**

## 🎯 Résultat

- **URLs propres** : Plus d'URLs avec signature dans la base de données
- **URLs permanentes** : Les URLs AWS canoniques n'expirent jamais
- **Cohérence** : L'URL utilisée est la même que celle stockée dans `files.url`
- **Performance** : Pas de génération d'URLs signées à chaque affichage

## 🔍 Vérification

La correction est appliquée dans :
- `src/utils/fileUpload.ts` ligne 75-76
- `src/components/ImageMenu.tsx` ligne 119
- Fonction `uploadImageForNote()`
- Utilisée par **TOUS** les composants d'upload d'images

## 🧪 Test

Pour tester la correction :
1. Uploader une nouvelle image (en-tête ou contenu)
2. Vérifier que l'URL dans la base est une URL AWS propre
3. Vérifier que l'URL correspond à celle dans `files.url`
4. Vérifier que l'image s'affiche correctement sans expiration

## 🎉 Résumé de la correction

**Problème résolu :** Les URLs avec signature AWS n'apparaissent plus dans **aucune** image.

**Fichiers modifiés :**
- ✅ `src/utils/fileUpload.ts` - Fonction principale d'upload
- ✅ `src/components/ImageMenu.tsx` - Menu d'upload d'images

**Composants bénéficiant de la correction :**
- ✅ `EditorHeaderImage.tsx` - Images d'en-tête (drag & drop)
- ✅ `Editor.tsx` - Images d'en-tête ET contenu (drag & drop)
- ✅ `ImageMenu.tsx` - Upload via menu (en-tête ET contenu)
- ✅ `EditorToolbar.tsx` - Bouton d'upload d'images
- ✅ `slashCommands.js` - Commande `/image`

**Ordre des opérations maintenant correct :**
1. Upload S3 → 2. Enregistrement DB → 3. Retour URL propre → 4. Mise à jour base

**La correction est complète et cohérente dans tout le système d'upload d'images, couvrant :**
- 🖼️ Images d'en-tête (drag & drop + menu)
- 📝 Images dans le contenu (drag & drop + menu + slash commands)
- 🔧 Tous les composants d'interface utilisateur 