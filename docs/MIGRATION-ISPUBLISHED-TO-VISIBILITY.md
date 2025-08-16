# Migration : ispublished → Système de Visibilité

## 🎯 Objectif

Remplacer complètement le système `ispublished` (legacy) par le système de visibilité moderne qui gère :
- `visibility: 'private'` → Note privée
- `visibility: 'public'` → Note publique
- `visibility: 'link-private'` → Note accessible via lien privé
- `visibility: 'link-public'` → Note accessible via lien public et indexée
- `visibility: 'limited'` → Note accessible aux utilisateurs invités

## 🔍 État Actuel

### Problèmes Identifiés

1. **Conflit de logique** : `ispublished` et `visibility` peuvent être en contradiction
2. **Code legacy** : Plusieurs composants utilisent encore `ispublished`
3. **Confusion** : Les développeurs ne savent plus quel système utiliser
4. **Maintenance** : Double logique à maintenir

### Usage Actuel d'ispublished

- **Base de données** : Colonne `ispublished` dans la table `articles`
- **API v1** : Endpoint `/publish` avec paramètre `ispublished`
- **API v2** : Endpoint `/publish` avec paramètre `ispublished`
- **UI** : Bouton "œil" vérifie `ispublished`
- **Types** : Interface `Note` avec propriété `ispublished`

## 🚀 Plan de Migration

### Phase 1 : Analyse et Préparation

- [x] Script d'analyse de l'usage d'ispublished
- [x] Script de migration des données
- [ ] Audit complet du code pour identifier tous les usages

### Phase 2 : Migration des Données

```sql
-- Migration des notes publiées
UPDATE articles 
SET visibility = 'public', updated_at = NOW()
WHERE ispublished = true;

-- Migration des notes privées
UPDATE articles 
SET visibility = 'private', updated_at = NOW()
WHERE ispublished = false;

-- Migration des notes sans ispublished
UPDATE articles 
SET visibility = 'private', updated_at = NOW()
WHERE ispublished IS NULL;
```

### Phase 3 : Mise à Jour du Code

#### 3.1 Remplacer les vérifications ispublished

**Avant :**
```typescript
if (note.ispublished) {
  // Note publique
}
```

**Après :**
```typescript
if (note.visibility !== 'private') {
  // Note accessible (publique, link, limited, etc.)
}
```

#### 3.2 Mettre à jour les API

**API v1 `/publish` :**
```typescript
// Avant
const { ispublished } = body;
// Après
const { visibility } = body;
```

**API v2 `/publish` :**
```typescript
// Avant
const newVisibility = validatedData.ispublished ? 'public' : 'private';
// Après
const newVisibility = validatedData.visibility;
```

#### 3.3 Mettre à jour les composants UI

**Editor.tsx :**
```typescript
// Avant
if (!n?.ispublished) {
  toast.error('Cette note n\'est pas encore publiée');
}
// Après
if (n?.visibility === 'private') {
  toast.error('Cette note est privée');
}
```

**RecentActivityCard.tsx :**
```typescript
// Avant
isPublished: boolean;
// Après
visibility: VisibilityLevel;
```

### Phase 4 : Tests et Validation

- [ ] Tester la migration des données
- [ ] Valider que les notes "publiques" sont accessibles
- [ ] Valider que les notes "privées" sont protégées
- [ ] Tester le bouton "œil" dans l'éditeur
- [ ] Valider les pages publiques
- [ ] Tester les API v1 et v2

### Phase 5 : Nettoyage Final

- [ ] Supprimer la colonne `ispublished` de la base
- [ ] Supprimer les propriétés `ispublished` des types
- [ ] Nettoyer les composants legacy
- [ ] Mettre à jour la documentation

## 📋 Checklist de Migration

### Base de Données
- [ ] Exécuter le script de migration
- [ ] Vérifier que toutes les notes ont une valeur `visibility`
- [ ] Valider qu'aucun conflit n'existe

### Code
- [ ] Remplacer `ispublished` par `visibility !== 'private'`
- [ ] Mettre à jour les types TypeScript
- [ ] Mettre à jour les API endpoints
- [ ] Mettre à jour les composants UI
- [ ] Mettre à jour les tests

### Tests
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests manuels des fonctionnalités clés

### Documentation
- [ ] Mettre à jour la documentation API
- [ ] Mettre à jour les guides de développement
- [ ] Documenter les changements de comportement

## ⚠️ Risques et Mitigation

### Risques Identifiés

1. **Perte de données** : Migration incorrecte
2. **Régression** : Fonctionnalités qui ne marchent plus
3. **Performance** : Requêtes plus complexes avec `visibility`

### Mitigation

1. **Backup complet** avant migration
2. **Tests exhaustifs** sur environnement de staging
3. **Rollback plan** en cas de problème
4. **Migration progressive** par phases

## 🎯 Bénéfices Attendus

### Immédiats
- ✅ Code plus clair et cohérent
- ✅ Plus de conflit entre systèmes
- ✅ Maintenance simplifiée

### Long terme
- 🚀 Système de partage unifié
- 🔒 Gestion fine des permissions
- 📱 Interface utilisateur cohérente

## 📅 Planning

- **Semaine 1** : Analyse et préparation
- **Semaine 2** : Migration des données
- **Semaine 3** : Mise à jour du code
- **Semaine 4** : Tests et validation
- **Semaine 5** : Nettoyage et déploiement

## 🔗 Ressources

- [Script d'analyse](./scripts/analyze-ispublished-usage.ts)
- [Script de migration](./scripts/migrate-ispublished-to-visibility.ts)
- [Types de visibilité](../src/types/sharing.ts)
- [Documentation du système de partage](./SHARING-SYSTEM.md) 