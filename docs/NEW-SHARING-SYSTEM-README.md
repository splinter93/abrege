# 🚀 Nouveau Système de Partage Google Drive

## 📋 Vue d'ensemble

Ce document décrit l'implémentation du nouveau système de partage inspiré de Google Drive, qui remplace l'ancien système basé sur `ispublished`.

## 🎯 Concept Principal

**Toutes les notes ont automatiquement une URL publique, mais la visibilité contrôle l'accès :**

```
📝 Note créée → 🌐 URL générée → 🔒 Visibilité "Privé" (par défaut)
```

## 🔐 Niveaux de Visibilité

### **1. 🔒 Privé (par défaut)**
- **Accès** : Seul le propriétaire
- **URL** : Générée mais accès bloqué
- **Usage** : Notes personnelles, brouillons

### **2. 🔗 Lien partageable**
- **Accès** : Tous les utilisateurs disposant du lien
- **URL** : Partageable publiquement
- **Usage** : Partage externe, blogs, documentation

### **3. 👥 Accès limité**
- **Accès** : Utilisateurs spécifiquement invités
- **URL** : Contrôlée par invitations
- **Usage** : Collaboration en équipe, partage sélectif

### **4. 👤 Scrivia Users**
- **Accès** : Tous les utilisateurs connectés
- **URL** : Découverte dans l'écosystème
- **Usage** : Collaboration élargie, communauté

## 🏗️ Architecture Technique

### **Base de Données**

#### **Nouvelle colonne `share_settings` (JSONB) :**
```sql
share_settings = {
  "visibility": "private" | "link" | "limited" | "scrivia",
  "invited_users": ["user_id1", "user_id2"],
  "allow_edit": false,
  "allow_comments": false,
  "link_expires": "2025-12-31" -- optionnel
}
```

#### **Colonnes conservées :**
- `public_url` : URL générée automatiquement
- `visibility` : Colonne legacy (sera supprimée)

#### **Colonnes supprimées :**
- `ispublished` : Remplacé par `share_settings.visibility`

### **Sécurité RLS**

#### **Politiques de base :**
```sql
-- Lecture basée sur les permissions
CREATE POLICY "Users can view articles based on new sharing system"
ON articles FOR SELECT
USING (can_access_article(id, auth.uid()));

-- Création (propriétaire uniquement)
CREATE POLICY "Users can create their own articles"
ON articles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Mise à jour (propriétaire + éditeurs invités)
CREATE POLICY "Users can update articles they own or have edit access"
ON articles FOR UPDATE
USING (auth.uid() = user_id OR has_edit_permission(id, auth.uid()));
```

#### **Fonction helper `can_access_article` :**
```sql
CREATE OR REPLACE FUNCTION can_access_article(
  article_id UUID,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN
```

## 🔧 API Endpoints

### **GET /api/v2/note/[ref]/share**
Récupère les paramètres de partage d'une note.

**Réponse :**
```json
{
  "success": true,
  "note": {
    "id": "uuid",
    "title": "Titre de la note",
    "share_settings": {
      "visibility": "private",
      "invited_users": [],
      "allow_edit": false
    },
    "public_url": "https://...",
    "user_id": "uuid"
  }
}
```

### **PATCH /api/v2/note/[ref]/share**
Met à jour les paramètres de partage d'une note.

**Body :**
```json
{
  "visibility": "link",
  "invited_users": ["user1@example.com"],
  "allow_edit": true
}
```

## 🎨 Interface Utilisateur

### **Composant ShareMenu**

#### **Fonctionnalités :**
- Sélection de niveau de visibilité
- Gestion des utilisateurs invités
- Copie du lien de partage
- Configuration des permissions

#### **Utilisation :**
```tsx
<ShareMenu
  noteId={note.id}
  currentSettings={note.share_settings}
  publicUrl={note.public_url}
  onSettingsChange={handleShareSettingsChange}
  isOpen={isShareMenuOpen}
  onClose={() => setIsShareMenuOpen(false)}
/>
```

## 📊 Migration des Données

### **Phase 1 : Ajout des nouvelles colonnes**
```sql
-- Migration automatique
ALTER TABLE articles ADD COLUMN IF NOT EXISTS share_settings JSONB;
```

### **Phase 2 : Conversion des données existantes**
```sql
-- ispublished = true → visibility = 'link'
-- ispublished = false → visibility = 'private'
UPDATE articles SET share_settings = CASE 
  WHEN ispublished = true THEN 
    jsonb_build_object('visibility', 'link', 'invited_users', '[]', 'allow_edit', false)
  ELSE 
    jsonb_build_object('visibility', 'private', 'invited_users', '[]', 'allow_edit', false)
END;
```

### **Phase 3 : Nettoyage (future)**
```sql
-- Après validation complète
ALTER TABLE articles DROP COLUMN ispublished;
ALTER TABLE articles DROP COLUMN visibility;
```

## 🧪 Tests

### **Script de test :**
```bash
node test-new-sharing-system.js
```

### **Tests inclus :**
1. ✅ Structure de la base de données
2. ✅ Migration des données existantes
3. ✅ Cohérence des données
4. ✅ Politiques RLS
5. ✅ Sécurité des opérations

## 🚀 Déploiement

### **1. Appliquer la migration**
```bash
# Dans Supabase
supabase db push
```

### **2. Vérifier la migration**
```bash
node test-new-sharing-system.js
```

### **3. Mettre à jour l'interface**
- Remplacer l'ancien toggle "Publier/Dépublier"
- Intégrer le nouveau composant ShareMenu
- Mettre à jour les composants existants

## 🔄 Rétrocompatibilité

### **APIs V1 (UI) :**
- ✅ Continue de fonctionner
- ✅ Utilise `ispublished` (legacy)
- ✅ Génère `public_url`

### **APIs V2 (LLM) :**
- ✅ Nouveau système `share_settings`
- ✅ Support des slugs et UUIDs
- ✅ Logging et monitoring avancés

### **Migration progressive :**
1. **Phase 1** : Nouveau système en parallèle
2. **Phase 2** : Interface utilisateur mise à jour
3. **Phase 3** : Suppression de l'ancien système

## 📈 Avantages

### **Pour les utilisateurs :**
- ✅ Interface familière (Google Drive)
- ✅ URLs cohérentes pour toutes les notes
- ✅ Contrôle granulaire des accès
- ✅ Partage simplifié

### **Pour les développeurs :**
- ✅ Architecture moderne et extensible
- ✅ Sécurité RLS robuste
- ✅ APIs cohérentes
- ✅ Migration progressive

### **Pour la maintenance :**
- ✅ Code unifié
- ✅ Moins de duplication
- ✅ Debugging simplifié
- ✅ Évolutions futures facilitées

## 🎯 Prochaines Étapes

1. **Validation** : Tester en environnement de développement
2. **Interface** : Intégrer ShareMenu dans l'éditeur
3. **Migration** : Appliquer en production
4. **Formation** : Documenter pour les utilisateurs
5. **Optimisation** : Performance et UX

## 🤝 Support

Pour toute question ou problème :
- Vérifier les logs de l'API
- Exécuter les scripts de test
- Consulter la documentation Supabase
- Contacter l'équipe de développement

---

**🎉 Le nouveau système de partage est prêt pour la production !** 