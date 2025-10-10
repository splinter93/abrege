# 🧹 PLAN DE NETTOYAGE - TABLE AGENTS

**Date:** 10 Octobre 2025  
**Objectif:** Nettoyer les doublons et incohérences dans la table agents

---

## 🎯 ACTIONS À EFFECTUER

### **✅ ACTION 1: Créer migration profile_picture**

**Fichier:** `supabase/migrations/20251010_add_profile_picture_to_agents.sql`

**Status:** ✅ CRÉÉ

**Contenu:**
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;
COMMENT ON COLUMN agents.profile_picture IS 'URL de l''image de profil de l''agent';
UPDATE agents SET profile_picture = '🤖' WHERE profile_picture IS NULL;
```

---

### **✅ ACTION 2: Nettoyer l'interface Agent**

**Fichier:** `src/types/chat.ts`

**Status:** ✅ FAIT

**Changements:**
- ✅ Supprimé `instructions` (doublon)
- ✅ Supprimé `model_variant` (inutile)
- ✅ Supprimé `max_completion_tokens` (doublon de max_tokens)
- ✅ Supprimé `stream` (pas une propriété d'agent)
- ✅ Supprimé `reasoning_effort` (pas une propriété d'agent)
- ✅ Supprimé `stop_sequences` (pas une propriété d'agent)
- ✅ Ajouté `user_id`, `slug`, `display_name`, `description` (manquants)
- ✅ Réorganisé par catégories logiques avec commentaires

---

### **⏳ ACTION 3: Rechercher et remplacer les références obsolètes**

#### **3.1. Remplacer `instructions` par `system_instructions`**

**Fichiers concernés (12 fichiers):**
- src/app/api/v2/agents/[agentId]/route.ts
- src/services/specializedAgents/SpecializedAgentManager.ts
- src/app/api/chat/llm/route.ts
- src/services/openApiToolsGenerator.ts
- src/services/specializedAgents/SpecializedAgentManagerV2.ts
- src/services/specializedAgents/types/AgentTypes.ts
- src/components/agents/ContextInjectionDemo.tsx
- src/services/llm/types/apiV2Types.ts
- src/components/chat/validators.ts
- src/types/specializedAgents.ts
- src/components/agents/AgentTemplateDemo.tsx
- src/app/agents/page.tsx

**Commande à exécuter:**
```bash
# Chercher toutes les occurrences
grep -r "instructions:" src/ --include="*.ts" --include="*.tsx" | grep -v "system_instructions"

# Remplacer manuellement dans chaque fichier
```

#### **3.2. Vérifier les utilisations de `model_variant`**

**Fichiers à vérifier:** 27 occurrences trouvées

**Action:** Remplacer par l'utilisation directe de `model`

#### **3.3. Vérifier les utilisations de `max_completion_tokens`**

**Fichiers à vérifier:** 21 occurrences trouvées

**Action:** Remplacer par `max_tokens`

---

### **🔧 ACTION 4: Mettre à jour les services**

#### **4.1. AgentTemplateService**

**Fichier:** `src/services/llm/agentTemplateService.ts`

Supprimer les champs obsolètes de `AgentTemplateConfig`:
- ❌ `model_variant`
- ❌ `max_completion_tokens`
- ❌ `stream`
- ❌ `reasoning_effort`
- ❌ `stop_sequences`

#### **4.2. SpecializedAgentManager**

**Fichier:** `src/services/specializedAgents/SpecializedAgentManager.ts`

Vérifier que seuls les champs DB sont utilisés

---

## 📋 COLONNES FINALES (27 colonnes)

### **Essentielles (20 colonnes)**
```
✅ id, user_id, name, slug, display_name
✅ provider, model, temperature, top_p, max_tokens
✅ system_instructions, personality, expertise
✅ is_active, is_chat_agent, is_endpoint_agent, priority
✅ input_schema, output_schema
✅ capabilities, api_v2_capabilities
✅ profile_picture, description
✅ version, created_at, updated_at
```

### **Optionnelles (4 colonnes)**
```
⚠️ context_template (templates Handlebars)
⚠️ api_config (config spécifique provider)
⚠️ is_default (agent par défaut)
⚠️ metadata (métadonnées génériques)
```

### **À supprimer du TypeScript uniquement**
```
❌ instructions (doublon de system_instructions)
❌ model_variant (redondant avec model)
❌ max_completion_tokens (doublon de max_tokens)
❌ stream (paramètre de requête, pas propriété)
❌ reasoning_effort (paramètre de requête, pas propriété)
❌ stop_sequences (paramètre de requête, pas propriété)
```

---

## 🎯 RÉSULTAT ATTENDU

**Avant:**
- 27 colonnes en DB
- 33 champs dans TypeScript (dont 6 inexistants en DB)
- Confusion entre `instructions` et `system_instructions`

**Après:**
- 28 colonnes en DB (+ profile_picture)
- 27 champs dans TypeScript (alignés avec DB)
- Cohérence totale entre DB et code

---

## ✅ CHECKLIST

- [x] Audit complet effectué
- [x] Migration profile_picture créée
- [x] Interface Agent nettoyée
- [ ] Appliquer migration en base
- [ ] Nettoyer les références à `instructions` dans le code
- [ ] Nettoyer les références aux champs obsolètes
- [ ] Tests de régression

---

**🎯 Prochaine étape:** Appliquer la migration et vérifier que tout fonctionne

