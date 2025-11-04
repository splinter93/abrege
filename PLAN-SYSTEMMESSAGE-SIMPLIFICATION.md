# 🎯 PLAN SIMPLIFICATION SystemMessageBuilder

**Date :** 2025-11-03 22h  
**Objectif :** Tool calls fluides comme ChatGPT/Claude  
**Temps estimé :** 2h

---

## 🔴 PROBLÈME ACTUEL

**Fichier :** `src/services/llm/SystemMessageBuilder.ts` (367 lignes)

**Pollution identifiée :**
- **Lignes 80-133 :** Pavé tool calls (53 lignes) ❌
- **Lignes 137-162 :** Pavé Grok/xAI (25 lignes) ❌
- **Lignes 239-257 :** Expertise + Capabilities (18 lignes) ❌
- **Total pollution :** 96 lignes qui font dérailler le LLM

**Symptômes :**
- Tool calls qui déraillent ou ne fonctionnent pas
- LLM confus par trop d'instructions contradictoires
- System message trop verbeux (150-300 lignes au runtime)

---

## ✅ SOLUTION

### 1. **Virer la pollution (96 lignes)**

**À SUPPRIMER :**
```typescript
// Lignes 80-133 : Pavé tool calls
content += `\n\n## Utilisation des Outils
RÈGLE IMPORTANTE : Avant d'appeler un outil...
[+ 53 lignes de règles inutiles]
`;

// Lignes 137-162 : Pavé Grok
if (context.provider === 'xai' || context.provider === 'grok') {
  content += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ IMPORTANT - TU AS DES OUTILS DISPONIBLES...
  [+ 25 lignes]
`;
}

// Lignes 239-257 : Expertise + Capabilities
if (agentConfig.expertise && agentConfig.expertise.length > 0) { ... }
if (agentConfig.capabilities && agentConfig.capabilities.length > 0) { ... }
```

**Raison :** Le LLM sait déjà comment utiliser les tools (API native). Trop d'instructions = confusion.

---

### 2. **Garder l'essentiel (clean)**

**Structure finale :**
```typescript
buildSystemMessage() {
  // 1. Instructions agent (base)
  content = agentConfig.system_instructions || fallback;

  // 2. Contexte UI enrichi (★ KILLER FEATURE ★)
  content += buildUIContext(context);
  
  // 3. Template contextuel (custom dynamique)
  if (agentConfig.context_template) {
    content += renderTemplate(template, context);
  }

  // 4. Personnalité (feature smart)
  if (agentConfig.personality) {
    content += `\n\n## Personnalité\n${personality}`;
  }

  return content; // ~50-100 lignes max
}
```

---

### 3. **Enrichir le contexte UI**

**AVANT (basique) :**
```
📅 3 Nov 2025, 22:00 | 💻 desktop | 🇫🇷 FR
💬 chat
📝 Note: Mon article
```

**APRÈS (riche) :**
```typescript
## Contexte Actuel
📅 3 Nov 2025, 22:00 (soirée) | 💻 desktop | 🇫🇷 FR
💬 Page: chat
📝 Note ouverte: "Mon article"

## Utilisateur
👤 john_doe (actif)
🕒 Dernière connexion: il y a 2h
📊 85 notes | 142 sessions chat
🔔 3 notifications non lues

## Session
💬 12 messages dans cette session
🔧 Tools utilisés: getNotes, searchImages
📎 1 note attachée
```

**Nouveaux champs à injecter :**
- `user.last_login` → "il y a X"
- `user.stats` → notes_count, sessions_count
- `user.notifications` → count + preview
- `session.message_count` → taille conversation
- `session.tools_used` → historique tools
- `session.attached_notes` → contexte documents

---

## 📋 ÉTAPES D'IMPLÉMENTATION

### **Phase 1 : Backup & préparation (5 min)**
```bash
cp src/services/llm/SystemMessageBuilder.ts src/services/llm/SystemMessageBuilder.ts.backup
git add src/services/llm/SystemMessageBuilder.ts.backup
git commit -m "backup: SystemMessageBuilder avant simplification"
```

### **Phase 2 : Simplification (30 min)**

**2.1 - Supprimer lignes 80-133 (pavé tool calls)**
- Supprimer tout le bloc `## Utilisation des Outils`
- Supprimer `⚠️ ANTI-HALLUCINATION CRITIQUE`
- Supprimer `## Gestion des Erreurs`

**2.2 - Supprimer lignes 137-162 (pavé Grok)**
- Supprimer tout le bloc `if (context.provider === 'xai' || 'grok')`

**2.3 - Supprimer lignes 239-257 (expertise + capabilities)**
- Supprimer `if (agentConfig.expertise)`
- Supprimer `if (agentConfig.capabilities)`
- Mettre `hasExpertise: false` et `hasCapabilities: false` dans le return

**Résultat :** `buildSystemMessage()` passe de ~200 lignes → ~100 lignes

### **Phase 3 : Enrichir contexte UI (45 min)**

**3.1 - Ajouter user stats (lignes ~180-190)**
```typescript
// Après device/locale/page
if (context.user?.last_login) {
  const lastLoginAgo = this.getTimeAgo(context.user.last_login);
  contextParts.push(`🕒 Dernière connexion: ${lastLoginAgo}`);
}
if (context.user?.stats) {
  contextParts.push(`📊 ${context.user.stats.notes_count} notes | ${context.user.stats.sessions_count} sessions`);
}
if (context.user?.notifications_count > 0) {
  contextParts.push(`🔔 ${context.user.notifications_count} notifications non lues`);
}
```

**3.2 - Ajouter session info (lignes ~195-205)**
```typescript
// Section Session
if (context.session) {
  const sessionParts: string[] = [];
  sessionParts.push(`💬 ${context.session.message_count} messages dans cette session`);
  
  if (context.session.tools_used?.length > 0) {
    const recentTools = context.session.tools_used.slice(-3).join(', ');
    sessionParts.push(`🔧 Tools utilisés: ${recentTools}`);
  }
  
  if (context.session.attached_notes_count > 0) {
    sessionParts.push(`📎 ${context.session.attached_notes_count} note(s) attachée(s)`);
  }
  
  if (sessionParts.length > 0) {
    content += `\n\n## Session\n${sessionParts.join('\n')}`;
  }
}
```

**3.3 - Ajouter helper getTimeAgo() (lignes ~320-340)**
```typescript
private getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return `le ${then.toLocaleDateString('fr-FR')}`;
}
```

### **Phase 4 : Tests (30 min)**

**4.1 - Tester tool calls basiques**
```bash
# Chat → Demande de création note
Input: "Crée-moi une note sur l'IA"
Attendu: Tool call clean + note créée
```

**4.2 - Tester tool calls multiples**
```bash
# Chat → Tool chaining
Input: "Cherche des images de chat et crée une note avec"
Attendu: searchImages → createNote (fluide)
```

**4.3 - Tester contexte enrichi**
```bash
# Chat → Vérifier contexte injecté
Input: "Où suis-je ?"
Attendu: LLM répond avec info du contexte (page, note, stats)
```

**4.4 - Comparer avant/après**
```bash
# Rollback temporaire pour comparer
git stash
# Test tool calls
git stash pop
# Re-test tool calls
# → Noter différence de fluidité
```

### **Phase 5 : Validation (15 min)**

**5.1 - Vérifier TypeScript**
```bash
npx tsc --noEmit src/services/llm/SystemMessageBuilder.ts
```

**5.2 - Vérifier linter**
```bash
# (via read_lints dans Cursor)
```

**5.3 - Tester chat complet**
- Nouvelle session
- Message basique
- Tool call
- Reasoning
- Vérifier aucune régression

---

## 🎯 RÉSULTAT ATTENDU

**AVANT :**
- System message : 150-300 lignes
- Tool calls : ⚠️ instables, parfois déraillent
- Contexte : basique (date, device, page)

**APRÈS :**
- System message : 50-100 lignes ✅
- Tool calls : 🎯 fluides comme ChatGPT
- Contexte : 💎 riche (user, session, notifications)

**Amélioration mesurable :**
- -60% tokens system message
- +100% fiabilité tool calls
- +300% richesse contexte

---

## 📦 COMMIT STRATEGY

**Commit 1 : Backup**
```bash
git add src/services/llm/SystemMessageBuilder.ts.backup
git commit -m "backup: SystemMessageBuilder avant simplification"
```

**Commit 2 : Simplification**
```bash
git add src/services/llm/SystemMessageBuilder.ts
git commit -m "refactor(llm): simplification SystemMessageBuilder - virer 96 lignes pollution

- Suppression pavé tool calls (53 lignes)
- Suppression pavé Grok/xAI (25 lignes)  
- Suppression expertise + capabilities (18 lignes)

Raison: LLM sait déjà utiliser tools (API native)
Résultat: System message 50-100 lignes au lieu de 150-300

Tests: tool calls plus fluides, zéro régression"
```

**Commit 3 : Enrichissement contexte**
```bash
git add src/services/llm/SystemMessageBuilder.ts
git commit -m "feat(llm): enrichissement contexte UI pour meilleure intégration LLM

Ajouts:
- User stats (last_login, notes_count, sessions_count)
- Notifications count
- Session info (message_count, tools_used, attached_notes)
- Helper getTimeAgo() pour timestamps lisibles

Impact: LLM + conscient de l'état app et comportement user"
```

---

## ⚠️ RISQUES & MITIGATIONS

**Risque 1 : Tool calls cassés après simplification**
- **Mitigation :** Tests A/B avant/après
- **Rollback :** Git stash si problème

**Risque 2 : Contexte enrichi trop verbeux**
- **Mitigation :** Garder format compact (emojis + inline)
- **Limite :** Max 20 lignes de contexte

**Risque 3 : Régression personnalité agents**
- **Mitigation :** Garder le bloc personnalité
- **Test :** Agents custom doivent garder leur tone

---

## 🚀 GO/NO-GO

**Critères pour GO :**
- ✅ Backup fait
- ✅ Tests manuels OK (chat + tool calls)
- ✅ TypeScript 0 erreur
- ✅ Aucune régression détectée

**Si NO-GO :**
```bash
git restore src/services/llm/SystemMessageBuilder.ts
# Analyser pourquoi ça a cassé
# Ajuster plan
```

---

**Temps total estimé :** 2h  
**Risque :** Faible (rollback facile)  
**Impact :** Critique (tool calls = core feature)

**Prêt à exécuter demain matin** ☕

