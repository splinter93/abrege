# 🚫 RÈGLES STRICTES - DOCUMENTATION

**Créé :** 2025-11-03  
**Raison :** Inflation documentaire (112 audits = chaos)

---

## ❌ INTERDIT

### 1. **JAMAIS créer de nouveaux audits détaillés**
- Pas de `AUDIT-MODULE-X-COMPLET-FINAL-V2.md`
- Pas de `ANALYSE-DÉTAILLÉE-COMPOSANT-Y.md`
- Pas de `RAPPORT-SESSION-DATE.md`

### 2. **JAMAIS documenter chaque session**
- Les sessions doivent être éphémères
- Git commit messages = seul historique nécessaire

### 3. **JAMAIS créer de docs "FINAL" ou "COMPLET"**
- Si un doc est "final", il sera obsolète demain
- Source de vérité unique = `STATUS.md`

---

## ✅ AUTORISÉ (3 docs max)

### À la racine (3 fichiers SEULEMENT)

**1. `STATUS.md`** (ce fichier)
- Source de vérité unique
- État actuel + bloqueurs + prochaines étapes
- Mise à jour après chaque session importante

**2. `GUIDE-EXCELLENCE-CODE.md`**
- Standards techniques immuables
- Règles architecture/TypeScript/DB
- Modifié uniquement si nouvelle règle critique

**3. `TODO-BACKLOG-TECHNIQUE.md`**
- Roadmap issues prioritaires
- Mise à jour quand nouvelles issues identifiées

**Autres fichiers essentiels :**
- `AGENT-INSTRUCTIONS.md` (workflow agent)
- `README.md` (projet)
- `CHANGELOG.md` (releases)

---

## 📝 COMMENT DOCUMENTER

### Problème identifié ?
1. Ajouter dans `TODO-BACKLOG-TECHNIQUE.md`
2. Mettre à jour `STATUS.md`
3. **STOP. Pas de nouveau fichier.**

### Session terminée ?
1. Mettre à jour `STATUS.md` (3 lignes max)
2. Git commit avec message détaillé
3. **STOP. Pas de RESUME-SESSION.md**

### Audit nécessaire ?
1. Faire l'audit **en mémoire** (chat)
2. Extraire seulement les actions dans `TODO-BACKLOG-TECHNIQUE.md`
3. **STOP. Pas de fichier AUDIT.md**

---

## 🗑️ NETTOYAGE RÉGULIER

**Tous les 2 mois :**
- Archiver docs obsolètes dans `docs/archive-audits-YYYY-MM/`
- Supprimer archives > 6 mois
- Nettoyer `docs/` (max 10 .md utiles)

---

## 🎯 PHILOSOPHIE

> **"Less docs, more code."**

- Documentation = passif qui vieillit mal
- Code + tests = documentation qui ne ment pas
- Git history = meilleure source de vérité

**Si tu penses créer un doc, pose-toi 3 questions :**
1. Est-ce que `STATUS.md` suffit ? → OUI = pas de nouveau doc
2. Est-ce que ça sera utile dans 1 mois ? → NON = pas de nouveau doc
3. Est-ce que ça peut aller dans le code (JSDoc/README) ? → OUI = pas de nouveau doc

---

## ⚠️ EXCEPTION

**Seule exception = Documentation utilisateur/API**
- `docs/api/` - Documentation API publique
- `docs/guides/` - Guides utilisateurs
- `README.md` - Setup projet

**Tout le reste = source de dette documentaire.**

---

**Mantra : 3 docs à la racine. Pas plus. Jamais.**

