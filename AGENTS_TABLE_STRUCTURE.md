# Structure de la Table Agents - Documentation Complète

## Vue d'ensemble

La table `agents` a été optimisée pour supporter un système complet de templates d'agents avec personnalisation avancée et interface de configuration. Elle inclut toutes les colonnes nécessaires pour la gestion des agents LLM, leurs paramètres configurables, et leurs capacités.

## Structure des Colonnes

### Colonnes d'identification et de base
- **`id`** (UUID, PK) : Identifiant unique de l'agent
- **`name`** (VARCHAR(255), UNIQUE) : Nom unique de l'agent
- **`provider`** (VARCHAR(100)) : Fournisseur du modèle LLM (ex: groq, openai, anthropic)
- **`profile_picture`** (TEXT) : URL de l'image de profil de l'agent
- **`is_active`** (BOOLEAN, DEFAULT: true) : Indique si l'agent est actif
- **`created_at`** (TIMESTAMPTZ, DEFAULT: now()) : Date de création
- **`updated_at`** (TIMESTAMPTZ, DEFAULT: now()) : Date de dernière modification

### Paramètres LLM configurables
- **`model`** (TEXT, DEFAULT: 'deepseek-chat') : Modèle LLM spécifique
- **`model_variant`** (VARCHAR(50), DEFAULT: '120b') : Variante du modèle (120b, 20b)
- **`temperature`** (NUMERIC, DEFAULT: 0.7) : Contrôle la créativité (0.0-2.0)
- **`top_p`** (NUMERIC, DEFAULT: 0.9) : Contrôle la diversité (0.0-1.0)
- **`max_tokens`** (INTEGER, DEFAULT: 4000) : Tokens max pour la réponse complète
- **`max_completion_tokens`** (INTEGER, DEFAULT: 8192) : Tokens max pour la réponse
- **`stream`** (BOOLEAN, DEFAULT: false) : Activation du streaming
- **`reasoning_effort`** (VARCHAR(20), DEFAULT: 'low') : Niveau de raisonnement
- **`stop_sequences`** (TEXT[]) : Séquences d'arrêt pour la génération

### Configuration des templates
- **`system_instructions`** (TEXT) : Instructions système personnalisées
- **`context_template`** (TEXT) : Template contextuel avec variables {{variable}}
- **`personality`** (TEXT) : Description de la personnalité de l'agent
- **`expertise`** (TEXT[]) : Domaines d'expertise (tableau)
- **`capabilities`** (JSONB, DEFAULT: '[]') : Capacités spéciales détaillées
- **`api_v2_capabilities`** (TEXT[], DEFAULT: '{}') : Outils API v2 disponibles

### Métadonnées et gestion
- **`version`** (TEXT, DEFAULT: '1.0.0') : Version de la configuration (semver)
- **`is_default`** (BOOLEAN, DEFAULT: false) : Agent par défaut du système
- **`priority`** (INTEGER, DEFAULT: 0) : Priorité d'utilisation
- **`api_config`** (JSONB, DEFAULT: '{}') : Configuration API spécifique

### Colonnes de compatibilité (dépréciées)
- **`instructions`** (TEXT) : Anciennes instructions (utiliser system_instructions)

## Contraintes et Validation

### Contraintes de validation
- **`check_temperature_range`** : Temperature entre 0 et 2
- **`check_top_p_range`** : Top P entre 0 et 1
- **`check_max_tokens_positive`** : Max tokens > 0
- **`check_max_completion_tokens_positive`** : Max completion tokens > 0
- **`check_model_variant`** : Model variant dans ('120b', '20b')
- **`check_reasoning_effort`** : Reasoning effort dans ('low', 'medium', 'high')
- **`check_version_format`** : Version au format semver
- **`check_priority_positive`** : Priority >= 0

### Contraintes d'unicité
- **`agents_name_unique`** : Nom unique pour éviter les doublons

## Index et Performance

### Index principaux
- **`agents_pkey`** : Clé primaire sur id
- **`idx_agents_provider`** : Index sur provider
- **`idx_agents_active`** : Index sur is_active
- **`idx_agents_provider_model`** : Index composite (provider, model)
- **`idx_agents_is_default`** : Index sur is_default
- **`idx_agents_priority`** : Index sur priority
- **`idx_agents_expertise`** : Index GIN sur expertise (tableau)
- **`idx_agents_api_v2_capabilities`** : Index GIN sur api_v2_capabilities
- **`idx_agents_model_variant`** : Index sur model_variant
- **`idx_agents_reasoning_effort`** : Index sur reasoning_effort

### Index composites
- **`idx_agents_name_provider`** : (name, provider)
- **`idx_agents_created_at`** : created_at DESC
- **`idx_agents_updated_at`** : updated_at DESC
- **`idx_agents_active_priority_created`** : (is_active, priority DESC, created_at DESC)

## Vues Utilitaires

### `agents_active_summary`
Vue des agents actifs avec résumé de leurs capacités et personnalisation.

### `agents_by_provider`
Vue des agents groupés par fournisseur avec statistiques.

### `agents_llm_config`
Vue des agents avec configuration LLM et score de personnalisation.

### `agents_api_v2_capabilities`
Vue des agents avec leurs capacités API v2 détaillées.

## Fonctions Utilitaires

### `create_agent()`
Fonction pour créer un nouvel agent avec validation des paramètres.

### `update_agent()`
Fonction pour mettre à jour un agent existant avec validation.

### `search_agents()`
Fonction pour rechercher des agents selon différents critères.

## Triggers et Automatisation

### `trigger_update_agents_updated_at`
Met à jour automatiquement `updated_at` lors des modifications.

### `trigger_validate_agent_config`
Valide la configuration avant insertion/mise à jour.

### `trigger_manage_default_agent`
Gère automatiquement l'agent par défaut (un seul à la fois).

### `trigger_cleanup_agent_data`
Nettoie automatiquement les données invalides.

## Utilisation avec l'Interface

### Composant AgentTemplateManager
Le composant `AgentTemplateManager.tsx` utilise cette structure pour :
- Configurer les paramètres LLM (temperature, top_p, model_variant, etc.)
- Définir la personnalité et l'expertise de l'agent
- Configurer les capacités API v2
- Prévisualiser le template final
- Générer des résumés de configuration

### Service AgentTemplateService
Le service `agentTemplateService.ts` gère :
- Le rendu des templates d'agents
- La validation des configurations
- La génération de résumés
- La gestion des variables contextuelles

## Migration et Maintenance

### Migrations appliquées
1. **`20250131_enrich_agents_table.sql`** : Colonnes de base pour le système template
2. **`20250131_add_api_v2_capabilities.sql`** : Capacités API v2
3. **`20250131_sync_agents_table_structure.sql`** : Synchronisation des colonnes manquantes
4. **`20250131_improve_agents_table_constraints.sql`** : Amélioration des contraintes
5. **`20250131_add_agents_table_triggers.sql`** : Triggers et automatisation
6. **`20250131_add_agents_views.sql`** : Vues utilitaires
7. **`20250131_add_agents_utility_functions.sql`** : Fonctions utilitaires

### Maintenance recommandée
- Vérifier régulièrement les contraintes de validation
- Surveiller les performances des index GIN sur les tableaux
- Maintenir la cohérence des agents par défaut
- Valider les formats des capacités API v2

## Exemples d'utilisation

### Création d'un agent personnalisé
```sql
SELECT create_agent(
  'Assistant IA Expert',
  'groq',
  'deepseek-chat',
  '120b',
  0.8,
  0.9,
  6000,
  16384,
  'Tu es un assistant IA expert en développement web et IA.',
  'Contexte: {{type}} - {{name}} (ID: {{id}})',
  'Personnalité amicale et professionnelle, toujours prêt à aider.',
  ARRAY['Développement Web', 'Intelligence Artificielle', 'Machine Learning'],
  '[]'::jsonb,
  ARRAY['create_note', 'update_note', 'search_notes'],
  true,
  'medium',
  ARRAY['END', 'STOP'],
  false,
  10
);
```

### Recherche d'agents par critères
```sql
SELECT * FROM search_agents(
  'expert',           -- terme de recherche
  'groq',            -- fournisseur
  '120b',            -- variante de modèle
  true,              -- avec capacités API v2
  3,                 -- score de personnalisation minimum
  20,                -- limite
  0                  -- offset
);
```

## Conclusion

La table `agents` est maintenant parfaitement adaptée pour :
- ✅ Gérer les templates d'agents avec personnalisation complète
- ✅ Configurer tous les paramètres LLM de manière flexible
- ✅ Supporter les capacités API v2 avec validation
- ✅ Offrir une interface de configuration intuitive
- ✅ Assurer la cohérence et la validation des données
- ✅ Optimiser les performances avec des index appropriés
- ✅ Faciliter la maintenance et l'évolution du système 