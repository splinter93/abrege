# 🔍 AUDIT ESLINT COMPLET - PROJET ABRÈGE

## 📊 **RÉSUMÉ EXÉCUTIF**

**417 problèmes détectés** : 145 erreurs + 272 warnings
- **🔴 CRITIQUE** : 145 erreurs (bloquent le build ou provoquent des bugs)
- **🟠 MOYEN** : 272 warnings (convention/structure, gênent la lecture)
- **🟡 MINEUR** : Formatage, noms de variables

---

## 🔴 **ERREURS CRITIQUES (145)**

### **1. Variables non utilisées** - `@typescript-eslint/no-unused-vars`

#### **📁 Pages & Composants**
- `src/app/(private)/dossiers/page.tsx` : `DynamicIcon`, `getArticles`, `useRealtime`, `mergeClasseursState`
- `src/app/(private)/note/[id]/page.tsx` : `FiMoreVertical`, `FiSave`, `SLASH_COMMANDS`, `err`, `payload`, `savingToastId`
- `src/app/(private)/summary/[id]/page.tsx` : `id`
- `src/app/[username]/[slug]/page.tsx` : `dynamic`, `useEffect`, `useState`, `Heading`, `FiFeather`
- `src/app/layout.tsx` : `Header`, `AuthProvider`, `AppMainContent`

#### **📁 API Routes**
- `src/app/api/v1/dossier/[ref]/meta/route.ts` : `Folder`
- `src/app/api/v1/dossier/[ref]/move/route.ts` : `Folder`, `err`
- `src/app/api/v1/note/[ref]/content/delete/route.ts` : `supabase`
- `src/app/api/v1/note/[ref]/content/route.ts` : `params`
- `src/app/api/v1/note/merge/route.ts` : `Article`

#### **📁 Composants**
- `src/components/ClasseurTabs.tsx` : `motion`, `DynamicIcon`, `EMOJI_CHOICES`, `e`, `activeId`
- `src/components/EditorDiffOverlay.tsx` : `highlights`
- `src/components/EditorHeaderImage.tsx` : `onImageMenuOpen`, `setImageSettingsOpen`
- `src/components/EditorKebabMenu.tsx` : `slashLang`, `setSlashLang`
- `src/components/EditorSlashMenu.tsx` : `e`
- `src/components/editor/Editor.tsx` : `readonly`, `isRendering`
- `src/components/editor/EditorHeader.tsx` : `onHeaderChange`
- `src/components/FileItem.tsx` : `info`
- `src/components/FileList.tsx` : `sensors`, `handleDragEnd`
- `src/components/FileSystemLiveView.tsx` : `useEffect`
- `src/components/FolderContent.tsx` : `classeurName`, `toolbar`
- `src/components/FolderItem.tsx` : `e`
- `src/components/FolderList.tsx` : `sensors`, `handleDragEnd`
- `src/components/FolderManager.tsx` : `renamingType`, `handleItemClick`, `handleItemDoubleClick`, `isRootDropActive`
- `src/components/Header.tsx` : `t`
- `src/components/ImageMenu.tsx` : `UploadError`
- `src/components/SortableList.tsx` : `onStartRename`, `handleItemDoubleClick`
- `src/components/TableOfContents.tsx` : `FiMenu`, `pinned`, `onPin`, `onClose`

#### **📁 Hooks & Services**
- `src/components/useDragAndDrop.ts` : `useState`, `DndContext`, `closestCenter`
- `src/components/useFolderManagerState.ts` : `getFolders`, `getArticles`, `apiCreateFolder`, `apiCreateFile`, `apiDeleteFolder`, `apiDeleteFile`, `apiRenameItem`, `moveItemUniversal`, `supabase`
- `src/hooks/editor/useMarkdownRender.ts` : `useCallback`
- `src/hooks/useFolderDragAndDrop.ts` : `Folder`, `FileArticle`, `err`, `target`
- `src/hooks/useFolderSelection.ts` : `setActiveId`
- `src/hooks/useRealtime.ts` : `realtimeService`, `callback`, `handleRawEvent`
- `src/services/diffService.ts` : `lines`
- `src/services/realtimeService.ts` : `table`

#### **📁 Scripts & Utils**
- `src/extensions/MarkdownPasteHandler.js` : `slice`
- `src/scripts/addSlugColumns.ts` : `articlesError`, `testData`
- `src/scripts/setupComplete.ts` : `error`
- `src/scripts/verifyDatabase.ts` : `testData`, `sampleData`
- `src/utils/resourceResolver.test.ts` : `mockSupabase`
- `src/utils/slugGenerator.test.ts` : `mockSupabase`

### **2. Hooks React mal utilisés** - `react-hooks/rules-of-hooks`

#### **📁 Composants**
- `src/components/EditorToolbar.tsx:49` : Hook appelé conditionnellement

### **3. Entités non échappées** - `react/no-unescaped-entities`

#### **📁 Pages**
- `src/app/(private)/summary/[id]/page.tsx:202,216` : Apostrophes non échappées
- `src/app/[username]/[slug]/page.tsx:58,80` : Apostrophes non échappées
- `src/app/[username]/id/[noteId]/page.tsx:25,43` : Apostrophes non échappées
- `src/app/preview/[id]/page.tsx:32` : Apostrophes non échappées
- `src/components/FolderContent.tsx:74` : Apostrophe non échappée

### **4. Liens HTML au lieu de Link** - `@next/next/no-html-link-for-pages`

#### **📁 Pages**
- `src/app/(private)/page.tsx:50` : `<a>` au lieu de `<Link>`

### **5. Variables non réassignées** - `prefer-const`

#### **📁 API Routes**
- `src/app/api/v1/dossier/[ref]/meta/route.ts:66` : `updates`
- `src/app/api/v1/folder/[ref]/route.ts:93` : `updates`
- `src/app/api/v1/note/[ref]/section/route.ts:21` : `sectionStart`
- `src/app/api/v1/note/merge/route.ts:48` : `finalClasseurId`
- `src/app/api/v1/notebook/[ref]/route.ts:87` : `updates`

#### **📁 Pages & Composants**
- `src/app/(private)/note/[id]/page.tsx:215` : `baseSlug`
- `src/components/useFolderManagerState.ts:325` : Dépendance inutile

#### **📁 Scripts & Utils**
- `src/scripts/migrateSlugs.ts:48` : `baseSlug`
- `src/scripts/testSlugMigration.ts:48` : `baseSlug`
- `src/utils/markdownTOC.ts:59,98,138` : `baseSlug`, `sectionStart`
- `src/utils/slugGenerator.ts:45` : `baseSlug`

---

## 🟠 **WARNINGS MOYENS (272)**

### **1. Types `any` explicites** - `@typescript-eslint/no-explicit-any`

#### **📁 API Routes (Majorité)**
- Toutes les routes API utilisent `any` pour les paramètres et réponses
- **Fichiers concernés** : Toutes les routes dans `src/app/api/v1/`

#### **📁 Services**
- `src/services/api.ts` : 30+ occurrences
- `src/services/supabase.ts` : 20+ occurrences
- `src/services/realtimeService.ts` : 3 occurrences
- `src/services/s3Service.ts` : 2 occurrences
- `src/services/websocketService.ts` : 10+ occurrences

#### **📁 Composants**
- `src/components/ClasseurTabs.tsx` : 4 occurrences
- `src/components/ColorPalette.tsx` : 1 occurrence
- `src/components/ContentCard.tsx` : 2 occurrences
- `src/components/CreateSummaryForm.tsx` : 1 occurrence
- `src/components/DynamicIcon.tsx` : 2 occurrences
- `src/components/FolderContent.tsx` : 8 occurrences
- `src/components/ImageMenu.tsx` : 1 occurrence
- `src/components/PublicTOCClient.tsx` : 1 occurrence
- `src/components/SlashMenu.tsx` : 1 occurrence
- `src/components/SortableList.tsx` : 1 occurrence
- `src/components/TableOfContents.tsx` : 1 occurrence
- `src/components/Tooltip.tsx` : 1 occurrence

#### **📁 Hooks**
- `src/hooks/editor/useMarkdownRender.ts` : 1 occurrence
- `src/hooks/useDiffRealtime.ts` : 1 occurrence
- `src/hooks/useRealtime.ts` : 5 occurrences

#### **📁 Middleware & Utils**
- `src/middleware/auth.ts` : 3 occurrences
- `src/middleware/rateLimit.ts` : 2 occurrences
- `src/utils/pagination.ts` : 3 occurrences

### **2. Images non optimisées** - `@next/next/no-img-element`

#### **📁 Pages & Composants**
- `src/app/(private)/page.tsx:44`
- `src/app/[username]/[slug]/page.tsx:93`
- `src/app/preview/[id]/page.tsx:53`
- `src/components/CollaborativeDiffIndicator.tsx:167`
- `src/components/ContentCard.tsx:19`
- `src/components/EditorHeaderImage.tsx:99`
- `src/components/EditorPreview.tsx:31`
- `src/components/LogoScrivia.tsx:6`

### **3. Dépendances manquantes** - `react-hooks/exhaustive-deps`

#### **📁 Pages**
- `src/app/(private)/dossiers/page.tsx:147,212,292`
- `src/app/(private)/note/[id]/page.tsx:259,265,314,441,456,496,513`

#### **📁 Hooks**
- `src/hooks/editor/useEditorSave.ts:63`
- `src/hooks/useContextMenuManager.ts:55,67,85`
- `src/hooks/useFolderManagerState.ts:325`
- `src/hooks/useRealtime.ts:113,167`

### **4. Variables non réassignées** - `prefer-const`

#### **📁 API Routes**
- `src/app/api/v1/dossier/[ref]/meta/route.ts:66`
- `src/app/api/v1/folder/[ref]/route.ts:93`
- `src/app/api/v1/note/[ref]/section/route.ts:21`
- `src/app/api/v1/note/merge/route.ts:48`
- `src/app/api/v1/notebook/[ref]/route.ts:87`

---

## 📁 **GROUPEMENT PAR MODULE**

### **🎯 FOLDER MANAGER**
- **Erreurs** : 15 variables non utilisées, 2 types `any`
- **Warnings** : 8 types `any`, 3 dépendances manquantes
- **Fichiers** : `FolderManager.tsx`, `FolderContent.tsx`, `FolderItem.tsx`, `FolderList.tsx`, `useFolderManagerState.ts`

### **🎯 EDITOR**
- **Erreurs** : 8 variables non utilisées, 1 hook mal utilisé
- **Warnings** : 5 types `any`, 2 dépendances manquantes, 3 images non optimisées
- **Fichiers** : `Editor.tsx`, `EditorHeader.tsx`, `EditorToolbar.tsx`, `EditorSlashMenu.tsx`, `EditorHeaderImage.tsx`

### **🎯 API ROUTES**
- **Erreurs** : 12 variables non utilisées, 5 variables non réassignées
- **Warnings** : 50+ types `any`
- **Fichiers** : Toutes les routes dans `src/app/api/v1/`

### **🎯 SERVICES**
- **Erreurs** : 3 variables non utilisées
- **Warnings** : 60+ types `any`
- **Fichiers** : `api.ts`, `supabase.ts`, `realtimeService.ts`, `s3Service.ts`, `websocketService.ts`

### **🎯 PAGES**
- **Erreurs** : 20 variables non utilisées, 8 entités non échappées, 1 lien HTML
- **Warnings** : 3 images non optimisées, 10+ dépendances manquantes
- **Fichiers** : Toutes les pages dans `src/app/`

---

## 🎯 **RECOMMANDATIONS PRIORITAIRES**

### **🔴 CORRECTIONS IMMÉDIATES**

1. **Supprimer les variables non utilisées**
   - Supprimer les imports inutilisés
   - Supprimer les variables déclarées mais non utilisées
   - Utiliser le préfixe `_` pour les paramètres inutilisés

2. **Corriger les hooks React**
   - Déplacer le hook conditionnel dans `EditorToolbar.tsx`
   - Ajouter les dépendances manquantes dans les `useEffect`

3. **Échapper les entités**
   - Remplacer `'` par `&apos;` dans les textes JSX

4. **Remplacer les liens HTML**
   - Utiliser `<Link>` de Next.js au lieu de `<a>`

### **🟠 CORRECTIONS MOYENNES**

1. **Remplacer les types `any`**
   - Définir des interfaces pour les paramètres API
   - Typer les réponses des services
   - Utiliser des types génériques pour les composants

2. **Optimiser les images**
   - Remplacer `<img>` par `<Image>` de Next.js
   - Ajouter les attributs `width` et `height`

3. **Corriger les dépendances**
   - Ajouter les dépendances manquantes dans les `useEffect`
   - Utiliser `useCallback` pour les fonctions

### **🟡 CORRECTIONS MINEURES**

1. **Utiliser `const`**
   - Remplacer `let` par `const` pour les variables non réassignées

2. **Nettoyer les imports**
   - Supprimer les imports inutilisés
   - Organiser les imports par type

---

## 📊 **PLAN D'ACTION**

### **Phase 1 : Corrections critiques (1-2 jours)**
1. Supprimer toutes les variables non utilisées
2. Corriger les hooks React mal utilisés
3. Échapper les entités
4. Remplacer les liens HTML

### **Phase 2 : Corrections moyennes (3-5 jours)**
1. Remplacer les types `any` par des interfaces
2. Optimiser les images
3. Corriger les dépendances manquantes

### **Phase 3 : Corrections mineures (1 jour)**
1. Utiliser `const` au lieu de `let`
2. Nettoyer les imports
3. Finaliser le formatage

---

## 🎯 **OBJECTIF FINAL**

**Rendre le projet lint-clean** pour pouvoir activer `eslint --max-warnings=0` en CI/CD comme barrière de qualité.

**Estimation** : 5-8 jours de travail pour corriger tous les problèmes identifiés. 