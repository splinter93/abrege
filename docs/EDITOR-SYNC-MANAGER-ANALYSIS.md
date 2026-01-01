# Analyse : EditorSyncManager - Impact et Solutions

## 🔍 Rôle d'EditorSyncManager

### Fonctionnalités actuelles

1. **Chargement initial** (lignes 82-187)
   - Charge le contenu depuis le store dans l'éditeur au montage
   - ✅ **REMPLACÉ** : On charge maintenant manuellement dans `Editor.tsx`

2. **Mises à jour LLM** (lignes 110-132)
   - Recharge le contenu depuis le store quand il change
   - **Condition** : Seulement si l'utilisateur n'est **PAS** en train de taper
   - **But** : Afficher les mises à jour LLM (`applyContentOperations`) sans perturber la frappe

3. **Realtime** (lignes 189-216)
   - ⚠️ **DÉJÀ DÉSACTIVÉ** : Code commenté car causait des bugs
   - Le realtime fonctionne uniquement en mode readonly

## 📊 Impact de la désactivation

### ✅ **Pas d'impact**

1. **Chargement initial** : Remplacé manuellement ✅
2. **Slash commands** : Plus de bug ✅
3. **Realtime** : Déjà désactivé dans EditorSyncManager ✅

### ⚠️ **Impact potentiel**

1. **Mises à jour LLM** (`editNoteContent`)
   - Le LLM met à jour le store via `store.updateNote()`
   - **Sans EditorSyncManager** : Les mises à jour ne se reflètent **PAS** dans l'éditeur si l'utilisateur n'est pas en train de taper
   - **Avec EditorSyncManager** : Les mises à jour apparaissent automatiquement (ligne 128)

2. **Streaming LLM** (`ContentStreamer`)
   - Le streaming broadcast des chunks via `streamBroadcastService`
   - **Question** : Comment ces chunks sont-ils appliqués dans l'éditeur ?
   - **Hypothèse** : Via un listener séparé (à vérifier)

## 🎯 Solutions possibles

### Option 1 : **Laisser désactivé** (Recommandé pour l'instant)

**Avantages :**
- ✅ Plus de bug avec les slash commands
- ✅ Code plus simple
- ✅ Le chargement initial fonctionne

**Inconvénients :**
- ⚠️ Les mises à jour LLM ne s'affichent pas automatiquement dans l'éditeur
- ⚠️ L'utilisateur doit recharger la page pour voir les changements LLM

**Quand utiliser :**
- Si les mises à jour LLM sont appliquées directement dans l'éditeur (via streaming)
- Si l'utilisateur accepte de recharger pour voir les changements

### Option 2 : **Réparer EditorSyncManager**

**Changements nécessaires :**
1. Améliorer la détection "utilisateur en train de taper"
2. Éviter les conflits avec les slash commands
3. Ajouter un flag pour désactiver la sync pendant les slash commands

**Code à modifier :**
```typescript
// Dans EditorSyncManager.tsx ligne 118
if (editor.isFocused) {
  // ✅ AMÉLIORATION : Vérifier aussi si un slash menu est ouvert
  const slashMenuOpen = /* vérifier si slash menu est ouvert */;
  if (slashMenuOpen) {
    return; // Skip si slash menu ouvert
  }
  // ... reste du code
}
```

### Option 3 : **Solution hybride** (Recommandé long terme)

**Créer un hook dédié** : `useLLMContentSync`

**Responsabilités :**
- Écouter les mises à jour du store (via `useFileSystemStore`)
- Appliquer les changements LLM uniquement si :
  - L'utilisateur n'est pas en train de taper
  - Aucun menu n'est ouvert (slash, context, etc.)
  - Le contenu a vraiment changé

**Avantages :**
- Séparation des responsabilités
- Plus facile à tester
- Plus facile à désactiver si besoin

## 🔬 Tests à faire

1. **Tester les mises à jour LLM** :
   - Lancer une opération LLM (`editNoteContent`)
   - Vérifier si le contenu apparaît dans l'éditeur
   - Vérifier si le curseur saute

2. **Tester le streaming** :
   - Lancer un prompt avec streaming
   - Vérifier si les chunks apparaissent en temps réel
   - Vérifier si EditorSyncManager interfère

3. **Tester les slash commands** :
   - Ouvrir un slash menu
   - Vérifier qu'aucune sync ne se déclenche
   - Vérifier que les commandes fonctionnent

## 💡 Recommandation

**Court terme** : Laisser désactivé et tester
- Vérifier si les mises à jour LLM fonctionnent via le streaming
- Si oui → Garder désactivé
- Si non → Implémenter Option 3 (hook dédié)

**Long terme** : Implémenter Option 3
- Créer `useLLMContentSync` pour gérer uniquement les mises à jour LLM
- Garder le chargement initial simple dans `Editor.tsx`
- Éviter la complexité d'EditorSyncManager

## 📝 Notes

- Le realtime est déjà désactivé dans EditorSyncManager (lignes 189-216)
- Le streaming LLM utilise `ContentStreamer` qui broadcast des chunks
- Il faut vérifier comment ces chunks sont appliqués dans l'éditeur (probablement via un listener séparé)

