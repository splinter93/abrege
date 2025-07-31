# 🔐 Système de Permissions et Visibilité - Scrivia

## 📋 Vue d'ensemble

Le système de permissions et visibilité de Scrivia assure la sécurité et le contrôle d'accès aux ressources (notes, dossiers, classeurs) avec un système hiérarchique d'héritage des permissions.

## 🏗️ Architecture

### **Tables de Permissions**

```sql
-- Permissions spécifiques aux articles
article_permissions (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES articles(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('viewer', 'editor', 'owner')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Permissions spécifiques aux dossiers
folder_permissions (
  id UUID PRIMARY KEY,
  folder_id UUID REFERENCES folders(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('viewer', 'editor', 'owner')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Permissions spécifiques aux classeurs
classeur_permissions (
  id UUID PRIMARY KEY,
  classeur_id UUID REFERENCES classeurs(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('viewer', 'editor', 'owner')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### **Colonne de Visibilité**

```sql
-- Ajoutée aux articles
visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'members', 'public'))
```

## 🔄 Système d'Héritage

### **Hiérarchie des Permissions**

```
Classeur (niveau 1)
├── Dossier (niveau 2)
│   └── Article (niveau 3)
└── Article direct (niveau 2)
```

### **Règles d'Héritage**

1. **Permissions spécifiques > Permissions héritées**
   - Une permission spécifique sur un article écrase les permissions héritées du dossier/classeur

2. **Héritage automatique lors du déplacement**
   - Quand une note est déplacée, elle hérite automatiquement des permissions du nouveau parent

3. **Propagation descendante**
   - Quand une permission est ajoutée à un classeur/dossier, elle se propage aux enfants

### **Fonctions SQL d'Héritage**

```sql
-- Récupère les permissions d'un dossier
get_folder_permissions(folder_uuid UUID)

-- Récupère les permissions d'un classeur
get_classeur_permissions(classeur_uuid UUID)

-- Gère l'héritage lors du déplacement
handle_permission_inheritance()

-- Propage les permissions vers les enfants
propagate_permissions_downward()
```

## 🛡️ Politiques RLS (Row Level Security)

### **Articles**

```sql
-- Lecture : Propriétaire OU Public OU Permissions spécifiques OU Héritées
CREATE POLICY "Users can view articles based on permissions"
ON articles FOR SELECT
USING (
  auth.uid() = user_id OR
  visibility = 'public' OR
  EXISTS (SELECT 1 FROM article_permissions WHERE article_id = id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM folder_permissions fp JOIN folders f ON f.id = folder_id WHERE f.id = folder_id AND fp.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM classeur_permissions cp WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid())
);

-- Modification : Propriétaire OU Editor/Owner permissions
CREATE POLICY "Users can update articles they own or have editor/owner permissions"
ON articles FOR UPDATE
USING (/* logique de permissions */);

-- Suppression : Propriétaire OU Owner permissions uniquement
CREATE POLICY "Users can delete articles they own or have owner permissions"
ON articles FOR DELETE
USING (/* logique de permissions */);
```

### **Dossiers et Classeurs**

Politiques similaires avec héritage des permissions parent.

## 🔐 Authentification et Vérification

### **Utilitaire d'Authentification**

```typescript
// src/utils/authUtils.ts
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult>
export async function checkUserPermission(
  resourceId: string,
  resourceType: ResourceType,
  requiredRole: PermissionRole,
  userId: string,
  context: { operation: string; component: string }
): Promise<PermissionResult>
```

### **Utilisation dans les Endpoints V2**

```typescript
// 1. Authentification
const authResult = await getAuthenticatedUser(request);
if (!authResult.success) {
  return NextResponse.json({ error: authResult.error }, { status: 401 });
}

// 2. Vérification des permissions
const permissionResult = await checkUserPermission(
  noteId, 'article', 'editor', userId, context
);
if (!permissionResult.hasPermission) {
  return NextResponse.json(
    { error: 'Permissions insuffisantes' }, 
    { status: 403 }
  );
}
```

## 📊 Niveaux de Visibilité

### **Types de Visibilité**

- **`private`** : Visible uniquement par le propriétaire
- **`shared`** : Visible par les utilisateurs avec permissions spécifiques
- **`members`** : Visible par les membres de l'organisation
- **`public`** : Visible par tous les utilisateurs authentifiés

### **Filtrage par Visibilité**

```sql
-- Articles publics
SELECT * FROM articles WHERE visibility = 'public';

-- Articles privés de l'utilisateur
SELECT * FROM articles WHERE visibility = 'private' AND user_id = auth.uid();

-- Articles partagés avec l'utilisateur
SELECT * FROM articles WHERE visibility = 'shared' 
  AND EXISTS (SELECT 1 FROM article_permissions WHERE article_id = id AND user_id = auth.uid());
```

## 🔧 Fonctions Utilitaires

### **Vérification des Permissions**

```typescript
// Hiérarchie des rôles
const roleHierarchy = {
  'viewer': 1,   // Lecture uniquement
  'editor': 2,   // Lecture + Modification
  'owner': 3     // Tous les droits
};

function checkRolePermission(userRole: PermissionRole, requiredRole: PermissionRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

### **Résolution des Permissions Héritées**

```typescript
async function checkInheritedPermission(
  parentId: string,
  parentType: ResourceType,
  userId: string,
  requiredRole: PermissionRole
): Promise<PermissionResult>
```

## 🚀 Migration et Déploiement

### **Migrations SQL**

1. **Ajout de la colonne visibility**
   ```sql
   ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'private' 
   CHECK (visibility IN ('private', 'shared', 'members', 'public'));
   ```

2. **Correction des politiques RLS**
   ```sql
   -- Supprime les anciennes politiques ouvertes
   DROP POLICY IF EXISTS "Allow all users to select articles" ON articles;
   
   -- Crée les nouvelles politiques sécurisées
   CREATE POLICY "Users can view articles based on permissions" ON articles FOR SELECT...
   ```

### **Test du Système**

```bash
# Tester le système de permissions
node scripts/test-permissions-system.js
```

## 📈 Monitoring et Logs

### **Logs d'Authentification**

```typescript
logApi('auth_utils', `❌ Erreur authentification: ${error}`, { component: 'AuthUtils' });
```

### **Logs de Permissions**

```typescript
logApi('permission_check', `❌ Permissions insuffisantes pour note ${noteId}`, context);
```

## 🔒 Sécurité

### **Points de Sécurité**

1. **Authentification obligatoire** sur tous les endpoints V2
2. **Vérification des permissions** avant toute opération
3. **RLS activé** sur toutes les tables sensibles
4. **Héritage sécurisé** des permissions
5. **Validation des rôles** avec hiérarchie stricte

### **Bonnes Pratiques**

- ✅ Toujours vérifier l'authentification avant les permissions
- ✅ Utiliser les rôles minimums nécessaires
- ✅ Logger les tentatives d'accès non autorisées
- ✅ Tester régulièrement le système de permissions
- ✅ Maintenir la cohérence des permissions héritées

## 🎯 Utilisation

### **Pour les Développeurs**

1. **Ajouter l'authentification** dans les nouveaux endpoints
2. **Vérifier les permissions** avant les opérations sensibles
3. **Utiliser les utilitaires** `authUtils.ts` pour la cohérence
4. **Tester les permissions** avec le script de test

### **Pour les LLMs**

Les LLMs peuvent utiliser les endpoints V2 avec :
- **Header d'authentification** : `Authorization: Bearer <token>`
- **Header client** : `X-Client-Type: llm`
- **Gestion automatique** des permissions par l'API

---

**Le système de permissions et visibilité est maintenant fonctionnel et sécurisé !** 🎉 