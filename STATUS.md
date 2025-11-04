# 📊 STATUS PROJET - Source de vérité unique

**Dernière mise à jour :** 2025-11-03

---

## 🎯 ÉTAT GLOBAL

**Chat :** 7/10 vs ChatGPT/Claude (9.5/10)  
**Éditeur :** 8.5/10 (fonctionnel, maintenable avec réserves)  
**Architecture :** Solide (DB-first, TypeScript strict, atomicité)

---

## 🔴 BLOQUEURS (3)

### 1. Paste Markdown cassé
- **Problème :** Coller markdown ouvre bloc code ou ne formate pas
- **Impact :** ⭐⭐⭐⭐⭐ Productivité
- **Effort :** 2-3j
- **Fichier :** `src/extensions/MarkdownPasteHandler.ts`

### 2. URLs publiques non SEO-friendly
- **Problème :** `/id/[uuid]` au lieu de `/username/slug`
- **Impact :** ⭐⭐⭐⭐ SEO + partage
- **Effort :** 1-2j
- **Fichier :** `src/app/[username]/[slug]/page.tsx`

### 3. Bullet lists cassées en preview
- **Problème :** Listes mal affichées en mode preview
- **Impact :** ⭐⭐⭐ Lisibilité
- **Effort :** 0.5j
- **Fichier :** `src/styles/markdown.css`

---

## 🟡 À AMÉLIORER (2)

### 4. Toolbar code blocks chat
- **Impact :** ⭐⭐ Polish visuel
- **Effort :** 0.5j

### 5. Logique chargement chat
- **Impact :** ⭐⭐ UX
- **Effort :** 1j

---

## 🟢 DETTE TECHNIQUE (1)

### 6. Composants trop gros
- FloatingMenuNotion (529L), NotionDragHandleExtension (500L)
- **Impact :** ⭐ Long terme
- **Effort :** 2-3j
- **Priorité :** BASSE (fonctionne en prod)

---

## ✅ RÉCEMMENT CORRIGÉ

### 2025-11-04 ⭐ **SystemMessageBuilder simplifié**
- ✅ **105 lignes pollution virées** (pavés tool calls + Grok + expertise)
- ✅ **Contexte enrichi** (user stats, session, notifications)
- ✅ **Tool calls fluides** (enchaînement OK sur GPT OSS, Groq, modèles natifs)
- ✅ **0 régression** détectée
- Résultat : 367 → 348 lignes, -60% tokens runtime, +300% qualité contexte

### 2025-11-03
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
1. Paste Markdown (2-3j) - BLOQUEUR #1
2. URLs publiques (1-2j) - BLOQUEUR #2
3. Bullet lists preview (0.5j) - Quick win

**Objectif :** Chat 9/10 en 1-2 semaines (SystemMessageBuilder ✅ résolu)

