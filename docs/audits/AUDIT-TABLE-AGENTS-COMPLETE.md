# 🔍 AUDIT COMPLET - TABLE AGENTS

**Date:** 10 Octobre 2025  
**Objectif:** Identifier les colonnes utilisées, inutilisées, doublons et optimisations possibles

---

## 📊 STRUCTURE ACTUELLE DE LA TABLE

### **Colonnes de base** (migration 20250130)
| Colonne | Type | Défaut | Utilisation | Status |
|---------|------|--------|-------------|--------|
| `id` | UUID | gen_random_uuid() | ✅ UTILISÉ (clé primaire) | ✅ GARDER |
| `user_id` | UUID | - | ✅ UTILISÉ (RLS) | ✅ GARDER |
| `name` | VARCHAR(255) | - | ✅ UTILISÉ (nom agent) | ✅ GARDER |
| `provider` | VARCHAR(50) | 'groq' | ✅ UTILISÉ (groq/synesia) | ✅ GARDER |
| `temperature` | NUMERIC(3,2) | 0.7 | ✅ UTILISÉ (config LLM) | ✅ GARDER |
| `top_p` | NUMERIC(3,2) | 1.0 | ✅ UTILISÉ (config LLM) | ✅ GARDER |
| `is_active` | BOOLEAN | true | ✅ UTILISÉ (actif/inactif) | ✅ GARDER |
| `created_at` | TIMESTAMP | NOW() | ✅ UTILISÉ (tri) | ✅ GARDER |
| `updated_at` | TIMESTAMP | NOW() | ✅ UTILISÉ (tri) | ✅ GARDER |
| `metadata` | JSONB | '{}' | ⚠️ PEU UTILISÉ | ⚠️ À EXAMINER |
| `api_v2_capabilities` | TEXT[] | '{}' | ✅ UTILISÉ (permissions) | ✅ GARDER |

### **Colonnes enrichissement** (migration 20250131)
| Colonne | Type | Défaut | Utilisation | Status |
|---------|------|--------|-------------|--------|
| `model` | TEXT | 'deepseek-chat' | ✅ UTILISÉ (config LLM) | ✅ GARDER |
| `max_tokens` | INTEGER | 4000 | ✅ UTILISÉ (config LLM) | ✅ GARDER |
| `system_instructions` | TEXT | NULL | ✅ TRÈS UTILISÉ (26 occurrences) | ✅ GARDER |
| `context_template` | TEXT | NULL | ⚠️ PEU UTILISÉ (6 occurrences) | ⚠️ OPTIONNEL |
| `api_config` | JSONB | '{}' | ⚠️ MODÉRÉMENT UTILISÉ (13 occurrences) | ⚠️ OPTIONNEL |
| `personality` | TEXT | NULL | ✅ UTILISÉ (description agent) | ✅ GARDER |
| `expertise` | TEXT[] | NULL | ✅ UTILISÉ (domaines) | ✅ GARDER |
| `capabilities` | JSONB | '[]' | ✅ UTILISÉ (capacités agent) | ✅ GARDER |
| `version` | TEXT | '1.0.0' | ✅ UTILISÉ (versioning) | ✅ GARDER |
| `is_default` | BOOLEAN | false | ⚠️ PEU UTILISÉ | ⚠️ OPTIONNEL |
| `priority` | INTEGER | 0 | ✅ UTILISÉ (tri liste) | ✅ GARDER |

### **Colonnes agents spécialisés** (migration 20250201)
| Colonne | Type | Défaut | Utilisation | Status |
|---------|------|--------|-------------|--------|
| `slug` | VARCHAR | NULL | ✅ TRÈS UTILISÉ (identifiant unique) | ✅ GARDER |
| `display_name` | VARCHAR | NULL | ✅ TRÈS UTILISÉ (affichage UI) | ✅ GARDER |
| `description` | TEXT | NULL | ✅ TRÈS UTILISÉ (description UI) | ✅ GARDER |
| `is_chat_agent` | BOOLEAN | false | ✅ UTILISÉ (type agent) | ✅ GARDER |
| `is_endpoint_agent` | BOOLEAN | true | ✅ UTILISÉ (type agent) | ✅ GARDER |
| `input_schema` | JSONB | NULL | ✅ UTILISÉ (validation) | ✅ GARDER |
| `output_schema` | JSONB | NULL | ✅ UTILISÉ (validation) | ✅ GARDER |

### **Colonnes TypeScript uniquement** (PAS dans la DB)
| Colonne | Type | Utilisation | Status |
|---------|------|-------------|--------|
| `profile_picture` | STRING | ❌ NON EN DB (28 occurrences dans le code) | 🆘 **À AJOUTER** |
| `instructions` | STRING | ❌ NON EN DB (15 occurrences) | ⚠️ **DOUBLON** de `system_instructions` |
| `model_variant` | STRING | ❌ NON EN DB (27 occurrences) | ❌ **PAS NÉCESSAIRE** |
| `max_completion_tokens` | INTEGER | ❌ NON EN DB (21 occurrences) | ❌ **DOUBLON** de `max_tokens` |
| `stream` | BOOLEAN | ❌ NON EN DB | ❌ **PAS NÉCESSAIRE** (géré côté API) |
| `reasoning_effort` | STRING | ❌ NON EN DB (9 occurrences) | ❌ **PAS NÉCESSAIRE** |
| `stop_sequences` | STRING[] | ❌ NON EN DB | ❌ **PAS NÉCESSAIRE** |

---

## 🚨 PROBLÈMES IDENTIFIÉS

### **1. DOUBLON CRITIQUE : `instructions` vs `system_instructions`**

**Problème:**
- ❌ `instructions` (ancien champ) : 15 utilisations
- ✅ `system_instructions` (nouveau champ) : 26 utilisations
- **Les deux coexistent dans le code mais seul `system_instructions` existe en DB**

**Impact:**
- Confusion dans le code
- Bugs potentiels si on utilise `instructions` au lieu de `system_instructions`

**Solution:**
```typescript
// À SUPPRIMER de src/types/chat.ts:
instructions?: string; // ❌ DOUBLON

// À GARDER:
system_instructions?: string; // ✅ OFFICIEL
```

**Action:** Nettoyer toutes les références à `instructions` et utiliser uniquement `system_instructions`

---

### **2. COLONNE MANQUANTE : `profile_picture`**

**Problème:**
- ✅ Utilisé 28 fois dans le code (affichage UI, API)
- ❌ N'existe PAS dans la table agents
- **Les avatars ne sont jamais sauvegardés !**

**Solution:**
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;
COMMENT ON COLUMN agents.profile_picture IS 'URL de l''image de profil de l''agent';
```

**Action:** Créer une migration pour ajouter cette colonne

---

### **3. DOUBLONS DE CONFIGURATION LLM**

**Problème:**
- `max_tokens` (DB) vs `max_completion_tokens` (TypeScript uniquement)
- Ces deux champs font la même chose

**Solution:**
```typescript
// À SUPPRIMER de src/types/chat.ts:
max_completion_tokens?: number; // ❌ DOUBLON

// À GARDER:
max_tokens: number; // ✅ OFFICIEL (en DB)
```

---

### **4. COLONNES TYPESCRIPT INUTILES**

Ces colonnes sont dans TypeScript mais **PAS en base de données** et **PAS nécessaires** :

| Colonne | Occurrences | Raison |
|---------|-------------|--------|
| `model_variant` | 27 | ❌ Redondant avec `model` |
| `stream` | 0 | ❌ Géré côté API, pas une propriété d'agent |
| `reasoning_effort` | 9 | ❌ Paramètre de requête, pas une propriété d'agent |
| `stop_sequences` | 0 | ❌ Paramètre de requête, pas une propriété d'agent |

**Action:** Supprimer ces champs de `src/types/chat.ts`

---

### **5. COLONNES OPTIONNELLES (PEU UTILISÉES)**

| Colonne | Utilisation | Recommandation |
|---------|-------------|----------------|
| `metadata` | JSONB générique | ⚠️ Vérifier si vraiment utile ou remplacer par colonnes spécifiques |
| `context_template` | 6 occurrences | ⚠️ Peut rester, utilisé pour les templates Handlebars |
| `api_config` | 13 occurrences | ⚠️ Peut rester, configuration spécifique par provider |
| `is_default` | Peu utilisé | ⚠️ Peut rester, utile pour sélectionner l'agent par défaut |

---

## ✅ STRUCTURE OPTIMALE RECOMMANDÉE

### **Colonnes ESSENTIELLES (à garder)**
```sql
-- Identification
id UUID PRIMARY KEY
user_id UUID
name VARCHAR(255)
slug VARCHAR UNIQUE
display_name VARCHAR

-- Configuration LLM
provider VARCHAR(50)
model TEXT
temperature NUMERIC(3,2)
top_p NUMERIC(3,2)
max_tokens INTEGER

-- Instructions et comportement
system_instructions TEXT
personality TEXT
expertise TEXT[]

-- Type et état
is_active BOOLEAN
is_chat_agent BOOLEAN
is_endpoint_agent BOOLEAN
priority INTEGER

-- Schémas
input_schema JSONB
output_schema JSONB

-- Capacités
capabilities JSONB
api_v2_capabilities TEXT[]

-- Apparence
profile_picture TEXT -- ⚠️ À AJOUTER

-- Métadonnées
description TEXT
version TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### **Colonnes OPTIONNELLES (garder pour flexibilité)**
```sql
context_template TEXT -- Templates Handlebars personnalisés
api_config JSONB -- Configuration spécifique par provider
is_default BOOLEAN -- Agent par défaut
metadata JSONB -- Métadonnées génériques
```

### **Colonnes à SUPPRIMER du TypeScript**
```typescript
// src/types/chat.ts - À SUPPRIMER:
instructions?: string; // ❌ Doublon de system_instructions
model_variant?: '120b' | '20b'; // ❌ Redondant avec model
max_completion_tokens?: number; // ❌ Doublon de max_tokens
stream?: boolean; // ❌ Pas une propriété d'agent
reasoning_effort?: 'low' | 'medium' | 'high'; // ❌ Pas une propriété d'agent
stop_sequences?: string[]; // ❌ Pas une propriété d'agent
```

---

## 🎯 PLAN D'ACTION

### **1. MIGRATION URGENTE**
```sql
-- Ajouter profile_picture (manquant)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;
COMMENT ON COLUMN agents.profile_picture IS 'URL de l''image de profil de l''agent';
```

### **2. NETTOYAGE TypeScript**
- ❌ Supprimer `instructions` partout
- ❌ Supprimer `model_variant`, `max_completion_tokens`, `stream`, `reasoning_effort`, `stop_sequences`
- ✅ Utiliser uniquement `system_instructions` et `max_tokens`

### **3. VÉRIFICATION CODE**
- Chercher toutes les utilisations de `agent.instructions` et remplacer par `agent.system_instructions`
- Chercher toutes les utilisations de `max_completion_tokens` et remplacer par `max_tokens`

---

## 📊 RÉSUMÉ

### **Colonnes en base de données: 27**
- ✅ **Essentielles:** 20 colonnes
- ⚠️ **Optionnelles:** 4 colonnes (context_template, api_config, is_default, metadata)
- 🆘 **Manquantes:** 1 colonne (profile_picture)

### **Colonnes TypeScript uniquement: 6**
- ❌ **Doublons:** 2 (instructions, max_completion_tokens)
- ❌ **Inutiles:** 4 (model_variant, stream, reasoning_effort, stop_sequences)

### **Actions requises:**
1. ✅ **Ajouter** `profile_picture` en DB
2. ❌ **Supprimer** 6 champs du TypeScript
3. 🔧 **Nettoyer** les références dans le code

---

## 🚀 BÉNÉFICES ATTENDUS

- ✅ **Cohérence** : DB et TypeScript alignés
- ✅ **Simplicité** : Pas de doublons ni champs inutiles
- ✅ **Maintenabilité** : Structure claire et documentée
- ✅ **Performance** : Moins de colonnes = requêtes plus rapides

---

## 📝 MIGRATION À CRÉER

```sql
-- Migration: Ajout de profile_picture
-- Date: 2025-10-10
-- Description: Ajout de la colonne manquante pour les avatars d'agents

ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Index pour les performances (optionnel)
CREATE INDEX IF NOT EXISTS idx_agents_profile_picture ON agents(profile_picture) 
  WHERE profile_picture IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN agents.profile_picture IS 'URL de l''image de profil de l''agent (emoji ou image)';
```

---

**🎯 Conclusion:** La table agents a besoin d'un nettoyage TypeScript et d'une migration pour `profile_picture`.

