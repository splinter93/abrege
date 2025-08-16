# Plan d'Action : Nettoyage d'ispublished

## 🎯 Stratégie Pragmatique

Au lieu de forcer la migration de la base de données (bloquée par RLS), nous allons :

1. **Nettoyer le code** pour utiliser `visibility` au lieu d'`ispublished`
2. **Laisser la base de données** avec ses valeurs actuelles
3. **Supprimer progressivement** les références à `ispublished`
4. **Nettoyer la base** une fois que le code est propre

## 🚨 État Actuel Critique

- **6 notes** avec `ispublished = true` mais `visibility = 'private'`
- **Conflit total** entre les deux systèmes
- **RLS bloque** les corrections directes
- **Code legacy** utilise encore `ispublished`

## 📋 Plan d'Action Immédiat

### Phase 1 : Nettoyage du Code (Cette semaine)

#### 1.1 Composants UI Critiques
- [ ] **Editor.tsx** : Remplacer `n?.ispublished` par `n?.visibility !== 'private'`
- [ ] **RecentActivityCard.tsx** : Remplacer `isPublished` par `visibility`
- [ ] **EditorKebabMenu.tsx** : Utiliser `visibility` pour la logique de partage

#### 1.2 API Endpoints
- [ ] **API v1 `/publish`** : Remplacer `ispublished` par `visibility`
- [ ] **API v2 `/publish`** : Remplacer `ispublished` par `visibility`
- [ ] **Types API** : Mettre à jour les interfaces

#### 1.3 Types et Interfaces
- [ ] **Note interface** : Supprimer `ispublished`, garder `visibility`
- [ ] **ShareSettings** : S'assurer que `visibility` est bien défini
- [ ] **Validation schemas** : Mettre à jour Zod schemas

### Phase 2 : Tests et Validation (Semaine prochaine)

- [ ] Tester que les notes "publiques" sont accessibles
- [ ] Tester que les notes "privées" sont protégées
- [ ] Valider le bouton "œil" dans l'éditeur
- [ ] Tester les pages publiques
- [ ] Valider les API v1 et v2

### Phase 3 : Nettoyage Final (Dans 2 semaines)

- [ ] Supprimer la colonne `ispublished` de la base
- [ ] Nettoyer les scripts de migration
- [ ] Mettre à jour la documentation
- [ ] Audit final du code

## 🔧 Corrections Immédiates

### 1. Editor.tsx - Bouton "œil"

**Avant :**
```typescript
if (!n?.ispublished) {
  toast.error('Cette note n\'est pas encore publiée. Publiez-la d\'abord pour la prévisualiser.');
  return;
}
```

**Après :**
```typescript
if (n?.visibility === 'private') {
  toast.error('Cette note est privée. Changez sa visibilité pour la prévisualiser.');
  return;
}
```

### 2. RecentActivityCard.tsx

**Avant :**
```typescript
interface RecentActivityCardProps {
  isPublished: boolean;
  // ...
}
```

**Après :**
```typescript
interface RecentActivityCardProps {
  visibility: VisibilityLevel;
  // ...
}
```

### 3. API v1 `/publish`

**Avant :**
```typescript
const { ispublished } = parseResult.data;
// ...
ispublished: ispublished,
public_url: ispublished ? url : null
```

**Après :**
```typescript
const { visibility } = parseResult.data;
// ...
visibility: visibility,
public_url: visibility !== 'private' ? url : null
```

## ⚠️ Risques et Mitigation

### Risques Identifiés
1. **Régression** : Fonctionnalités qui ne marchent plus
2. **Incohérence** : Base de données vs code
3. **Confusion** : Développeurs qui ne savent pas quel système utiliser

### Mitigation
1. **Tests exhaustifs** avant chaque changement
2. **Migration progressive** composant par composant
3. **Documentation claire** des changements
4. **Rollback plan** pour chaque composant

## 🎯 Bénéfices Immédiats

### Code
- ✅ Plus de conflit entre systèmes
- ✅ Logique unifiée et claire
- ✅ Maintenance simplifiée

### Base de Données
- ⚠️ Conflit temporaire (à résoudre plus tard)
- 🔄 Valeurs `visibility` correctes pour les nouvelles notes
- 📈 Cohérence progressive

## 📅 Planning Détaillé

### Cette Semaine (Phase 1)
- **Lundi** : Nettoyer Editor.tsx et EditorKebabMenu
- **Mardi** : Nettoyer RecentActivityCard et composants UI
- **Mercredi** : Nettoyer API v1 `/publish`
- **Jeudi** : Nettoyer API v2 `/publish`
- **Vendredi** : Tests et validation

### Semaine Prochaine (Phase 2)
- **Lundi-Mardi** : Tests complets
- **Mercredi-Jeudi** : Corrections des bugs
- **Vendredi** : Validation finale

### Dans 2 Semaines (Phase 3)
- **Lundi** : Suppression de la colonne `ispublished`
- **Mardi** : Nettoyage des scripts
- **Mercredi** : Mise à jour documentation
- **Jeudi-Vendredi** : Audit final

## 🔗 Ressources

- [Script d'analyse](./scripts/analyze-ispublished-usage.ts)
- [Script de migration](./scripts/migrate-ispublished-to-visibility.ts)
- [Documentation de migration](./MIGRATION-ISPUBLISHED-TO-VISIBILITY.md)
- [Types de visibilité](../src/types/sharing.ts)

## 🎉 Objectif Final

**Un système unifié et cohérent** où :
- ✅ Toutes les vérifications utilisent `visibility`
- ✅ Plus de conflit entre systèmes
- ✅ Code maintenable et clair
- ✅ Base de données cohérente
- ✅ Interface utilisateur unifiée 