# Système de Prompts IA Personnalisables pour l'Éditeur

## 📋 Vue d'ensemble

Système complet permettant aux utilisateurs de créer et gérer des prompts personnalisés pour les actions IA dans l'éditeur de texte. Les prompts sont stockés en base de données, liés à des agents spécialisés, et offrent une expérience utilisateur fluide et professionnelle.

## ✨ Fonctionnalités

### Pour l'Utilisateur Final

1. **8 Prompts par Défaut** : Chaque nouvel utilisateur reçoit automatiquement 8 prompts système :
   - Améliorer l'écriture
   - Corriger l'orthographe
   - Simplifier
   - Développer
   - Résumer
   - Traduire en anglais
   - Expliquer
   - Générer du code

2. **Menu Ask AI Dynamique** :
   - Affichage des 8 premiers prompts
   - Bouton "Show more" pour voir tous les prompts
   - Icônes colorées et personnalisables
   - États visuels (actif, inactif, agent manquant)

3. **Gestion Complète** :
   - Création de prompts personnalisés
   - Édition des prompts existants
   - Activation/Désactivation sans suppression
   - Suppression définitive
   - Sélection d'icônes via picker visuel
   - Assignment d'agents spécialisés

4. **Exécution Intelligente** :
   - Remplacement automatique de `{selection}` par le texte sélectionné
   - Appel à l'agent spécialisé configuré
   - Remplacement du texte par la réponse de l'IA
   - Gestion d'erreurs gracieuse

### Pour les Développeurs

1. **Architecture Propre** :
   - Types TypeScript stricts
   - Validation Zod côté API
   - Hooks React réutilisables
   - Services découplés

2. **Sécurité** :
   - RLS policies Supabase
   - Validation des données côté serveur
   - Protection contre les agents manquants/inactifs

3. **Performance** :
   - Chargement optimisé des prompts
   - Cache local via hooks
   - Updates optimistes

## 🗂️ Structure du Projet

```
src/
├── app/
│   ├── ai/
│   │   ├── layout.tsx                 # Layout avec tabs Agents/Prompts
│   │   ├── ai-layout.css
│   │   ├── page.tsx                   # Redirect vers /ai/agents
│   │   ├── agents/                    # Page agents (déplacée)
│   │   └── prompts/
│   │       ├── page.tsx               # Page de gestion des prompts
│   │       └── prompts.css
│   └── api/
│       └── editor-prompts/
│           ├── route.ts               # GET, POST /api/editor-prompts
│           └── [id]/
│               └── route.ts           # PATCH, DELETE /api/editor-prompts/[id]
├── components/
│   ├── editor/
│   │   ├── AskAIMenu.tsx             # Menu dynamique avec prompts DB
│   │   ├── ask-ai-menu.css           # Styles mis à jour
│   │   └── FloatingMenuNotion.tsx    # Intégration EditorPromptExecutor
│   ├── prompts/
│   │   ├── PromptCard.tsx            # Carte d'affichage d'un prompt
│   │   ├── PromptCard.css
│   │   ├── PromptFormModal.tsx       # Modal création/édition
│   │   ├── PromptFormModal.css
│   │   ├── IconPicker.tsx            # Sélecteur d'icônes
│   │   └── IconPicker.css
│   └── UnifiedSidebar.tsx            # Mise à jour : Agents → AI
├── hooks/
│   └── useEditorPrompts.ts           # Hook CRUD pour prompts
├── services/
│   └── editorPromptExecutor.ts       # Service d'exécution des prompts
├── types/
│   └── editorPrompts.ts              # Types TypeScript
└── utils/
    └── iconMapper.ts                 # Mapping nom → composant icône

supabase/migrations/
└── 20251019_create_editor_prompts.sql # Migration complète
```

## 🗄️ Base de Données

### Table `editor_prompts`

```sql
CREATE TABLE editor_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT,
  prompt_template TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FiZap',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Agent Système

Un agent "Editor Assistant" est créé automatiquement :
- `name`: "Editor Assistant"
- `provider`: "groq"
- `model`: "openai/gpt-oss-120b"
- `temperature`: 0.7
- `is_default`: true

### Trigger Auto-Seed

Chaque nouvel utilisateur reçoit automatiquement les 8 prompts par défaut via un trigger PostgreSQL.

## 🔌 API Endpoints

### GET /api/editor-prompts?user_id={userId}

Récupère tous les prompts actifs d'un utilisateur, triés par position.

**Réponse** :
```json
{
  "success": true,
  "prompts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "agent_id": "uuid",
      "name": "Améliorer l'écriture",
      "description": "Rend le texte plus clair...",
      "prompt_template": "Améliore ce texte : {selection}",
      "icon": "FiTrendingUp",
      "position": 1,
      "is_active": true,
      "is_default": true,
      "category": "writing",
      "created_at": "2025-10-19T...",
      "updated_at": "2025-10-19T..."
    }
  ]
}
```

### POST /api/editor-prompts

Crée un nouveau prompt.

**Body** :
```json
{
  "user_id": "uuid",
  "name": "Mon prompt custom",
  "prompt_template": "Fais ceci avec : {selection}",
  "icon": "FiStar",
  "agent_id": "uuid",
  "description": "Description optionnelle",
  "category": "custom"
}
```

### PATCH /api/editor-prompts/[id]

Met à jour un prompt existant (mise à jour partielle).

### DELETE /api/editor-prompts/[id]?hard=false

Supprime un prompt (soft delete par défaut).

## 🎨 Composants Principaux

### `AskAIMenu`

Menu déroulant avec les prompts disponibles. Gère :
- Affichage des 8 premiers prompts
- "Show more" pour voir tous
- États visuels (actif, agent manquant, etc.)
- Exécution des prompts via callback

### `PromptCard`

Carte d'affichage d'un prompt avec :
- Icône personnalisable
- Nom et description
- Template du prompt (code)
- Badge "Système" pour prompts par défaut
- Status de l'agent (actif, supprimé, inactif)
- Actions : Toggle, Éditer, Supprimer

### `PromptFormModal`

Modal de création/édition avec :
- Champs validés (nom, template, description)
- Sélecteur d'icônes visuel
- Dropdown agents actifs
- Dropdown catégories
- Validation stricte

### `IconPicker`

Sélecteur d'icônes avec :
- Recherche en temps réel
- Grid responsive
- 20+ icônes recommandées
- Sélection visuelle

## 🔧 Utilisation

### Dans l'Éditeur

1. Sélectionnez du texte
2. Le menu flottant apparaît
3. Cliquez sur "Ask AI"
4. Choisissez un prompt
5. L'IA exécute le prompt et remplace le texte

### Dans la Page de Gestion

1. Allez dans **AI → Prompts** dans la sidebar
2. Cliquez sur **+ Nouveau prompt**
3. Remplissez le formulaire :
   - Nom du prompt
   - Description (optionnelle)
   - Template avec `{selection}`
   - Choisissez une icône
   - Assignez un agent
   - Sélectionnez une catégorie
4. Cliquez sur **Créer**

## 📝 Template Syntax

Les templates utilisent le placeholder `{selection}` qui sera remplacé par le texte sélectionné.

**Exemples** :

```
Améliore ce texte : {selection}
→ "Améliore ce texte : Bonjour le monde"

Tu es un expert. Analyse : {selection}. Propose 3 améliorations.
→ "Tu es un expert. Analyse : Mon code Python. Propose 3 améliorations."
```

## 🔒 Sécurité

### RLS Policies

- Utilisateurs voient **uniquement leurs propres prompts**
- Service role a accès complet (pour seed et triggers)

### Validation

- Validation Zod côté API (name max 100 chars, template requis)
- Vérification icônes valides via `iconMapper`
- Protection agents supprimés (fallback gracieux)

### Token Authentication

- Token JWT requis pour exécution des prompts
- Validation du token à chaque appel API

## 🚀 Déploiement

### 1. Migration Base de Données

```bash
# Appliquer la migration
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20251019_create_editor_prompts.sql
```

### 2. Vérification

```sql
-- Vérifier que la table existe
SELECT * FROM editor_prompts LIMIT 1;

-- Vérifier que l'agent système existe
SELECT * FROM agents WHERE name = 'Editor Assistant';

-- Vérifier les prompts par défaut
SELECT COUNT(*) FROM editor_prompts WHERE is_default = true;
```

### 3. Test

1. Créez un nouvel utilisateur
2. Vérifiez qu'il a 8 prompts par défaut
3. Testez la création d'un prompt custom
4. Testez l'exécution dans l'éditeur

## 🐛 Troubleshooting

### Prompts ne s'affichent pas

1. Vérifier que `user_id` est correct
2. Vérifier les RLS policies
3. Vérifier la console navigateur pour erreurs API

### Agent manquant/inactif

1. Vérifier que l'agent existe dans la table `agents`
2. Vérifier que `is_active = true`
3. Réassigner un agent actif au prompt

### Icône ne s'affiche pas

1. Vérifier que le nom de l'icône est dans `iconMapper`
2. Utiliser le fallback `FiZap` par défaut

## 📈 Améliorations Futures

- [ ] Drag & drop pour réordonner les prompts
- [ ] Import/Export de prompts
- [ ] Templates partagés entre utilisateurs
- [ ] Variables personnalisées (`{cursor}`, `{date}`, etc.)
- [ ] Historique d'exécution des prompts
- [ ] Analytics (prompts les plus utilisés)
- [ ] Streaming en temps réel pour les réponses
- [ ] Support multilingue des prompts par défaut

## 📚 Références

- [Tiptap Editor](https://tiptap.dev/)
- [React Icons](https://react-icons.github.io/react-icons/)
- [Zod Validation](https://zod.dev/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

**Implémenté par** : AI Assistant  
**Date** : 19 Octobre 2025  
**Version** : 1.0.0  
**Status** : ✅ Production Ready


