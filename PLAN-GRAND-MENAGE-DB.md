# 🧱 PLAN GLOBAL DE STRUCTURATION DE LA BASE DE DONNÉES SCRIVIA

## ✅ 1. RENOMMAGES À FAIRE

| Table actuelle | Nouveau nom | Description |
|----------------|-------------|-------------|
| `classeurs`    | `notebooks` | Harmonisation de vocabulaire |
| `articles`     | `notes`     | Nom plus cohérent avec le produit |

---

## ➕ 2. COLONNES À AJOUTER

### 📝 Table `notes`

| Nom de colonne     | Type                 | Description |
|--------------------|----------------------|-------------|
| `visibility`       | ENUM('private', 'shared', 'registered', 'public') | Niveau de visibilité |
| `is_favorite`      | BOOLEAN DEFAULT false | Si la note est en favori |
| `is_shared_copy`   | BOOLEAN DEFAULT false | Si la note vient d'un partage |
| `insight`          | TEXT                  | Concaténation du titre + description + tags + TOC |
| `embedding_vector` | VECTOR                | Embedding PGVector basé sur `insight` |
| `workspace_id`     | UUID REFERENCES `workspaces(id)` | Appartenance à un workspace |

---

## 🆕 3. TABLES À CRÉER

### 📁 Table `files`

| Colonne       | Type      | Description |
|---------------|-----------|-------------|
| `id`          | UUID      | ID fichier |
| `user_id`     | UUID      | Propriétaire |
| `path`        | TEXT      | Clé S3 |
| `size`        | INTEGER   | Taille (en octets) |
| `is_public`   | BOOLEAN   | Visibilité |
| `created_at`  | TIMESTAMPTZ | Horodatage |

---

### 🔐 Table `note_shares`

| Colonne              | Type      | Description |
|----------------------|-----------|-------------|
| `id`                 | UUID      | Identifiant |
| `note_id`            | UUID REFERENCES `notes(id)` | Note concernée |
| `shared_by`          | UUID REFERENCES `auth.users(id)` | Qui partage |
| `shared_with_email`  | TEXT      | Adresse e-mail (optionnel) |
| `shared_with_user_id`| UUID REFERENCES `auth.users(id)` | Utilisateur (optionnel) |
| `permission_level`   | ENUM('viewer', 'editor') DEFAULT 'viewer' | Niveau d'accès |
| `created_at`         | TIMESTAMPTZ | Horodatage |

---

### 🧑‍💼 Table `workspaces`

| Colonne      | Type      | Description |
|--------------|-----------|-------------|
| `id`         | UUID      | Identifiant |
| `owner_id`   | UUID      | Utilisateur créateur |
| `title`      | TEXT      | Nom du workspace |
| `created_at` | TIMESTAMPTZ | Date de création |

---

### 📊 Table `user_stats`

| Colonne            | Type      | Description |
|--------------------|-----------|-------------|
| `user_id`          | UUID      | Référence utilisateur |
| `daily_active_at`  | DATE      | Dernière activité |
| `notes_created`    | INTEGER   | Total de notes |
| `files_uploaded`   | INTEGER   | Total de fichiers |
| `tokens_used`      | BIGINT    | Total de tokens IA consommés |

---

### 🗂️ Table `shared_notes`

> Table virtuelle qui reflète les notes publiques ou partagées avec l'utilisateur

| Colonne        | Type   | Description |
|----------------|--------|-------------|
| `note_id`      | UUID   | Lien vers `notes(id)` |
| `url`          | TEXT   | Lien public/partagé |
| `is_favorite`  | BOOLEAN | Favori ou pas |
| `insight`      | TEXT   | Pour prévisualisation rapide |
| `tags`         | TEXT[] | Métadonnées |
| `description`  | TEXT   | Résumé de la note |

---

## ✅ Logique de mise à jour (INSIGHT & Embedding)

- À chaque update de `title`, `description`, `tags`, `table_of_contents` → mise à jour de `insight`
- À chaque update de `insight` → mise à jour automatique de `embedding_vector`

---

## 🚨 Notes importantes

- Les **favoris** sont un simple champ `is_favorite` sur la table `notes` (ou `shared_notes`)
- Les **notes partagées** ou publiques qu'on ajoute à sa bibliothèque ne contiennent pas le markdown mais seulement un lien + preview
- Les utilisateurs **n'ont jamais le droit d'éditer une note partagée** (lecture seule), même en `editor`
- Si une note est supprimée par son créateur, elle disparaît aussi de la shared list (logique Notion-like)

---

## 📋 Plan d'exécution

1. **Renommages** : `classeurs` → `notebooks`, `articles` → `notes`
2. **Nouvelles colonnes** : Ajouter les colonnes sur `notes` (visibility, is_favorite, etc.)
3. **Nouvelles tables** : Créer `files`, `note_shares`, `workspaces`, `user_stats`, `shared_notes`
4. **Triggers** : Mettre en place les triggers pour insight/embedding
5. **RLS** : Configurer les politiques de sécurité
6. **Refacto front** : Adapter l'API et le frontend

**Statut** : Planification terminée, prêt pour l'implémentation. 