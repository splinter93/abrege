# 📋 Migration: Ajout de history_limit à chat_sessions

## 🚀 Application de la Migration

### Méthode 1: Dashboard Supabase (Recommandée)

1. **Allez sur votre dashboard Supabase**
2. **Ouvrez le SQL Editor**
3. **Copiez-collez le code SQL suivant :**

```sql
-- Migration: Ajout de la colonne history_limit à chat_sessions
-- Date: 2025-01-01
-- Description: Contrôle du nombre de messages dans l'historique

-- Ajouter la colonne history_limit avec une valeur par défaut de 10
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS history_limit INTEGER NOT NULL DEFAULT 10;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN chat_sessions.history_limit IS 'Nombre maximum de messages à inclure dans l''historique pour l''API Synesia';

-- Index pour optimiser les requêtes avec history_limit
CREATE INDEX IF NOT EXISTS idx_chat_sessions_history_limit ON chat_sessions(user_id, history_limit);

-- Fonction pour nettoyer automatiquement l'historique selon la limite
CREATE OR REPLACE FUNCTION trim_chat_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le thread dépasse la limite, garder seulement les derniers messages
  IF jsonb_array_length(NEW.thread) > NEW.history_limit THEN
    NEW.thread := (
      SELECT jsonb_agg(message)
      FROM (
        SELECT message
        FROM jsonb_array_elements(NEW.thread) AS message
        ORDER BY (message->>'timestamp')::timestamp DESC
        LIMIT NEW.history_limit
      ) AS recent_messages
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour automatiquement tronquer l'historique
CREATE TRIGGER trim_chat_history_trigger
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trim_chat_history();
```

4. **Exécutez la requête**

### Méthode 2: CLI Supabase

```bash
# Si vous avez la CLI configurée
npx supabase db push
```

## ✅ Vérification

Après l'application, vérifiez que la colonne a été ajoutée :

```sql
-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chat_sessions' 
AND column_name = 'history_limit';
```

## 🎯 Fonctionnalités Ajoutées

### 📊 Contrôle de l'Historique
- **Colonne `history_limit`** : Nombre maximum de messages (défaut: 10)
- **Trigger automatique** : Tronque l'historique selon la limite
- **Index optimisé** : Performance pour les requêtes avec history_limit

### 🔧 Services Créés
- **`ChatHistoryService`** : Gestion intelligente de l'historique
- **`useChatSessions`** : Hook React pour les sessions
- **Analyse de complexité** : Détermine la limite optimale

### 🎨 Interface Utilisateur
- **Sélecteur de sessions** : Navigation entre conversations
- **Informations d'historique** : Résumé et complexité
- **Gestion d'erreurs** : Messages d'erreur élégants

## 🚀 Utilisation

### Dans le Code
```typescript
// Créer une session avec limite personnalisée
const session = await createSession({
  name: "Conversation technique",
  history_limit: 20  // Plus de contexte pour les sujets complexes
});

// L'historique sera automatiquement tronqué selon la limite
```

### Interface Utilisateur
- **Sélecteur** : Changer de session
- **Bouton +** : Créer une nouvelle session
- **Résumé** : Voir l'état de l'historique
- **Complexité** : Indicateur de complexité du contexte 