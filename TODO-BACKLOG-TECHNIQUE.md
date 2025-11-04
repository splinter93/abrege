# 📋 BACKLOG TECHNIQUE - Issues à régler

**Date création :** 2025-11-03  
**Priorité :** Classé par impact utilisateur

---

## 🔴 PRIORITÉ HAUTE (UX impactée)

### 1. **Paste Markdown cassé dans l'éditeur**
**Problème :**
- Coller du markdown ouvre un bloc de code OU ne formate pas
- Ne fonctionne qu'en mode lecture, pas en mode édition
- Comportement incohérent et frustrant

**Attendu :**
- Coller `# Titre\n**gras**` → Doit créer un H1 + texte en gras
- Détection intelligente markdown vs code

**Fichiers concernés :**
- `src/extensions/MarkdownPasteHandler.ts`
- `src/config/editor-extensions.ts`

**Impact :** ⭐⭐⭐⭐⭐ (feature essentielle pour productivité)

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
| ~~SystemMessageBuilder~~ | ⭐⭐⭐⭐⭐ | 2h | ~~🔴~~ | ✅ **RÉSOLU** |
| Paste Markdown | ⭐⭐⭐⭐⭐ | 2-3j | 🔴 HAUTE | ⏳ À faire |
| URLs publiques | ⭐⭐⭐⭐ | 1-2j | 🔴 HAUTE | ⏳ À faire |
| Bullet lists preview | ⭐⭐⭐ | 0.5j | 🔴 HAUTE | ⏳ À faire |
| Toolbar code blocks chat | ⭐⭐ | 0.5j | 🟡 MOYENNE | ⏳ À faire |
| Logique chargement chat | ⭐⭐ | 1j | 🟡 MOYENNE | ⏳ À faire |
| Refacto composants gros | ⭐ | 2-3j | 🟢 BASSE | ⏳ À faire |

**Total effort restant (1-2 semaines) :** 5-7 jours

---

## 🎯 ORDRE D'ATTAQUE RECOMMANDÉ

**Sprint 1 (1 semaine) :**
1. ~~**SystemMessageBuilder (2h)**~~ → ✅ **FAIT (2025-11-04)**
2. Paste Markdown (2-3j) → BLOQUEUR #1
3. Bullet lists preview (0.5j) → Quick win

**Sprint 2 (1 semaine) :**
4. URLs publiques (1-2j) → SEO important
5. Toolbar code blocks chat (0.5j) → Polish
6. Logique chargement chat (1j) → UX
7. Refacto composants (si temps) → Dette

---

## 📝 NOTES

- ~~**SystemMessageBuilder**~~ = ✅ **RÉSOLU (2025-11-04)** - tool calls fluides maintenant
- **Paste markdown** = **BLOQUEUR #1** pour adoption utilisateurs power
- **URLs publiques** = **BLOQUEUR #2** pour SEO et partage social
- Reste = Polish/dette technique (pas bloquant)

**Focus immédiat recommandé :** Paste Markdown EN PRIORITÉ

