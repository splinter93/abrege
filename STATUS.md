# 📊 STATUS PROJET - Source de vérité unique

**Dernière mise à jour :** 2025-11-03

---

## 🎯 ÉTAT GLOBAL

**Chat :** 7/10 vs ChatGPT/Claude (9.5/10)  
**Éditeur :** 8.5/10 (fonctionnel, maintenable avec réserves)  
**Architecture :** Solide (DB-first, TypeScript strict, atomicité)

---

## 🔴 BLOQUEURS (4)

### 1. SystemMessageBuilder fait dérailler tool calls ⚠️ **CRITIQUE**
- **Problème :** System message trop verbeux (268 lignes), règles qui confusent le LLM
- **Impact :** ⭐⭐⭐⭐⭐ Tool calls = core feature
- **Effort :** 1-2j
- **Fichier :** `src/services/llm/SystemMessageBuilder.ts`
- **Solution :** Simplifier à < 50 lignes, supprimer les pavés de règles

### 2. Paste Markdown cassé
- **Problème :** Coller markdown ouvre bloc code ou ne formate pas
- **Impact :** ⭐⭐⭐⭐⭐ Productivité
- **Effort :** 2-3j
- **Fichier :** `src/extensions/MarkdownPasteHandler.ts`

### 3. URLs publiques non SEO-friendly
- **Problème :** `/id/[uuid]` au lieu de `/username/slug`
- **Impact :** ⭐⭐⭐⭐ SEO + partage
- **Effort :** 1-2j
- **Fichier :** `src/app/[username]/[slug]/page.tsx`

### 4. Bullet lists cassées en preview
- **Problème :** Listes mal affichées en mode preview
- **Impact :** ⭐⭐⭐ Lisibilité
- **Effort :** 0.5j
- **Fichier :** `src/styles/markdown.css`

---

## 🟡 À AMÉLIORER (2)

### 5. Toolbar code blocks chat
- **Impact :** ⭐⭐ Polish visuel
- **Effort :** 0.5j

### 6. Logique chargement chat
- **Impact :** ⭐⭐ UX
- **Effort :** 1j

---

## 🟢 DETTE TECHNIQUE (1)

### 7. Composants trop gros
- FloatingMenuNotion (529L), NotionDragHandleExtension (500L)
- **Impact :** ⭐ Long terme
- **Effort :** 2-3j
- **Priorité :** BASSE (fonctionne en prod)

---

## ✅ RÉCEMMENT CORRIGÉ (2025-11-03)

- ✅ Type safety chat (any → type guards)
- ✅ Suppression 3005 lignes code mort
- ✅ Extensions drag handle nettoyées
- ✅ Backups supprimés

---

## 📚 DOCS ESSENTIELS

**Ne lire QUE ces 3 docs :**
1. `GUIDE-EXCELLENCE-CODE.md` - Standard technique
2. `AGENT-INSTRUCTIONS.md` - Workflow agent
3. `TODO-BACKLOG-TECHNIQUE.md` - Roadmap détaillée

**Reste = archivé dans `docs/archive-audits/`**

---

## 🎯 PROCHAINE SESSION

**Focus immédiat :**
1. **SystemMessageBuilder (1-2j)** - CRITIQUE : tool calls cassés
2. Paste Markdown (2-3j)
3. URLs publiques (1-2j)

**Objectif :** Chat 9/10 en 2 semaines (commence par fixer tool calls)

