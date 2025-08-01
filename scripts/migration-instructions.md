# 📋 Instructions pour appliquer la migration chat_sessions

## 🚀 Méthode 1: Dashboard Supabase (Recommandée)

1. **Allez sur votre dashboard Supabase**
   - Connectez-vous à [supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur "SQL Editor"
   - Cliquez sur "New query"

3. **Copiez-collez le code SQL suivant :**

```sql
-- Migration: Création de la table chat_sessions
-- Date: 2025-01-01
-- Description: Système de sessions de chat persistantes

-- Création de la table chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Nouvelle conversation',
  thread JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateurs peuvent voir leurs propres sessions
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent créer leurs propres sessions
CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent modifier leurs propres sessions
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent supprimer leurs propres sessions
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour nettoyer les sessions inactives (optionnel)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_sessions 
  WHERE is_active = false 
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

4. **Exécutez la requête**
   - Cliquez sur "Run" ou appuyez sur Ctrl+Enter

5. **Vérifiez que la table a été créée**
   - Dans le menu de gauche, allez dans "Table Editor"
   - Vous devriez voir la table `chat_sessions`

## 🔧 Méthode 2: CLI Supabase

Si vous avez la CLI Supabase configurée :

```bash
# Lier le projet (si pas déjà fait)
npx supabase link --project-ref YOUR_PROJECT_REF

# Appliquer les migrations
npx supabase db push
```

## ✅ Vérification

Après avoir appliqué la migration, vous pouvez vérifier que tout fonctionne :

```bash
# Tester les endpoints (sans authentification)
node scripts/test-endpoints-structure.js

# Résultat attendu : tous les endpoints retournent 401 (non authentifié)
# C'est normal car l'authentification est requise
```

## 🎯 Prochaines étapes

1. ✅ Appliquer la migration
2. 🔄 Tester avec un utilisateur authentifié
3. 🔗 Intégrer dans le ChatComponent
4. 🎨 Créer l'interface de gestion des sessions 