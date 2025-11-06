# 📋 BACKLOG TECHNIQUE - Issues à régler

**Date création :** 2025-11-03  
**Priorité :** Classé par impact utilisateur

---

## 🔴 PRIORITÉ HAUTE (UX impactée)

### ~~1. **Paste Markdown cassé dans l'éditeur**~~ ✅ **RÉSOLU (2025-11-06)**
**Problème :**
- ~~Coller du markdown ouvre un bloc de code OU ne formate pas~~
- ~~Ne fonctionne qu'en mode lecture, pas en mode édition~~
- ~~Comportement incohérent et frustrant~~

**Solution appliquée :**
- ✅ Extension `MarkdownPasteHandler` activée dans config production
- ✅ Détection intelligente de patterns markdown (titres, listes, liens, code, etc.)
- ✅ Conversion automatique markdown → HTML → ProseMirror
- ✅ Logs ajoutés pour debug
- ✅ Tous les formats testés et fonctionnels (gras, italique, barré, listes, tableaux, code, liens, etc.)

**Fichiers modifiés :**
- `src/extensions/MarkdownPasteHandler.ts` (logs ajoutés)
- `src/config/editor-extensions.ts` (extension activée en prod)

**Impact :** ⭐⭐⭐⭐⭐ → **RÉSOLU**

---

### 2. **URLs pages publiques - Structure non SEO-friendly**
**Problème :**
- Actuellement : `/id/[uuid]` ou similaire
- Pas user-friendly, pas SEO-optimisé

**Attendu :**
- `base_url/username/ref` (ex: `scrivia.app/john/mon-article`)
- Résolution par username + slug (pas UUID)

**Fichiers concernés :**
- `src/app/[username]/[slug]/page.tsx` (existe déjà ?)
- Routes API résolution (`src/middleware-utils/resourceResolver.ts`)
- Migrations DB (slugs uniques par user)

**Impact :** ⭐⭐⭐⭐ (SEO + UX partage)

---

### 3. **Bullet lists cassées en mode preview**
**Problème :**
- Listes à puces mal affichées en mode preview de l'éditeur
- Espacement/indentation incorrects

**Attendu :**
- Rendu identique entre mode édition et preview
- Listes propres et lisibles

**Fichiers concernés :**
- `src/styles/markdown.css` (mode preview)
- `src/styles/editor.css` (mode édition)
- `src/components/editor/Editor.tsx` (logique preview)

**Impact :** ⭐⭐⭐ (lisibilité)

---

## 🟡 PRIORITÉ MOYENNE (Polish)

### 4. **Toolbar code blocks pas propre dans le chat**
**Problème :**
- Toolbar des blocs de code s'affiche mal dans le chat
- Position/style incohérent avec l'UI du chat

**Attendu :**
- Toolbar discrète et bien positionnée
- Cohérence visuelle avec design chat

**Fichiers concernés :**
- `src/extensions/UnifiedCodeBlockExtension.ts`
- `src/styles/chat-clean.css`
- `src/components/chat/EnhancedMarkdownMessage.tsx`

**Impact :** ⭐⭐ (visuel)

---

### 5. **Logique de chargement dans le chat à revoir**
**Problème :**
- Certains éléments chargent de manière sous-optimale
- UX de chargement pas fluide

**Attendu :**
- Loading states clairs
- Chargement progressif optimisé
- Skeleton screens si nécessaire

**Fichiers concernés :**
- `src/components/chat/ChatFullscreenV2.tsx`
- `src/hooks/chat/useStreamingState.ts`
- `src/services/chat/ChatSessionService.ts`

**Impact :** ⭐⭐ (polish UX)

---

## 🟢 PRIORITÉ BASSE (Dette technique)

### 6. **Composants trop gros à refactoriser**
**Problème :**
- Certains composants > 500 lignes
- Maintenabilité réduite

**Composants identifiés :**
- `FloatingMenuNotion.tsx` (529 lignes) → Extraire handlers en hook
- `NotionDragHandleExtension.ts` (500 lignes) → Modulariser si bugs récurrents

**Recommandation :**
- Priorité BASSE (fonctionnent en prod, dette acceptable)
- Refactoriser uniquement si bugs ou nouvelles features

**Fichiers concernés :**
- Voir `ANALYSE-MAINTENABILITE-EDITEUR.md`

**Impact :** ⭐ (maintenabilité long terme)

---

## 📊 RÉSUMÉ PRIORITÉS

| Issue | Impact UX | Effort | Priorité | Statut |
|-------|-----------|--------|----------|--------|
| ~~SystemMessageBuilder~~ | ⭐⭐⭐⭐⭐ | 2h | ~~🔴~~ | ✅ **RÉSOLU (2025-11-04)** |
| ~~Paste Markdown~~ | ⭐⭐⭐⭐⭐ | 2h | ~~🔴~~ | ✅ **RÉSOLU (2025-11-06)** |
| URLs publiques | ⭐⭐⭐⭐ | 1-2j | 🔴 HAUTE | ⏳ À faire |
| Bullet lists preview | ⭐⭐⭐ | 0.5j | 🔴 HAUTE | ⏳ À faire |
| Toolbar code blocks chat | ⭐⭐ | 0.5j | 🟡 MOYENNE | ⏳ À faire |
| ~~Logique chargement chat~~ | ⭐⭐ | 1j | ~~🟡~~ | ✅ **RÉSOLU (2025-11-06)** |
| ~~Refacto composants gros~~ | ⭐ | 2-3j | ~~🟢~~ | ✅ **RÉSOLU (2025-11-06)** |

**Total effort restant :** ~2-3 jours (3 issues restantes)

---

## 🎯 ORDRE D'ATTAQUE RECOMMANDÉ

**~~Sprint 1~~ ✅ COMPLÉTÉ (2025-11-06) :**
1. ~~**SystemMessageBuilder (2h)**~~ → ✅ **FAIT (2025-11-04)**
2. ~~**Paste Markdown (2h)**~~ → ✅ **FAIT (2025-11-06)**
3. ~~**Logique chargement chat (1j)**~~ → ✅ **FAIT (2025-11-06)**
4. ~~**Refacto composants (2-3j)**~~ → ✅ **FAIT (2025-11-06)**

**Sprint 2 (Reste à faire - ~2-3 jours) :**
1. Bullet lists preview (0.5j) → Quick win
2. URLs publiques (1-2j) → SEO important
3. Toolbar code blocks chat (0.5j) → Polish

---

## 📝 NOTES

- ~~**SystemMessageBuilder**~~ = ✅ **RÉSOLU (2025-11-04)** - tool calls fluides maintenant
- ~~**Paste markdown**~~ = ✅ **RÉSOLU (2025-11-06)** - formate automatiquement tous les patterns markdown
- ~~**Logique chargement chat**~~ = ✅ **RÉSOLU (2025-11-06)** - chargement instantané dernière conversation
- ~~**Refacto composants gros**~~ = ✅ **RÉSOLU (2025-11-06)** - NotionDragHandle & FloatingMenu modularisés
- **URLs publiques** = **BLOQUEUR #1** pour SEO et partage social
- **Bullet lists preview** = Quick win 0.5j
- Reste = Polish/dette technique (pas bloquant)

**Focus immédiat recommandé :** Bullet lists preview (quick win) puis URLs publiques

